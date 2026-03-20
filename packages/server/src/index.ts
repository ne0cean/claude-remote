import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createSession, getSession, switchProvider, destroySession, listSessions } from './session.js'
import type { ProviderName } from './providers/index.js'
import qrcode from 'qrcode-terminal'
import { networkInterfaces, hostname, platform } from 'os'

const app = new Hono()
const PORT = Number(process.env.PORT ?? 3001)
const WEB_PORT = Number(process.env.WEB_PORT ?? 5173)
const MACHINE_LABEL = process.env.MACHINE_LABEL ?? hostname()

app.use('*', cors())

// Health + info
app.get('/health', (c) => c.json({ ok: true }))
app.get('/api/info', (c) =>
  c.json({
    label: MACHINE_LABEL,
    platform: platform(),
    cwd: process.cwd(),
    sessions: listSessions(),
  })
)

// Active sessions list (for reconnect)
app.get('/api/sessions', (c) => c.json(listSessions()))

// WebSocket upgrade — Bun native
const server = Bun.serve({
  port: PORT,
  fetch: app.fetch,
  websocket: {
    open(ws) {
      console.log('[ws] client connected')
    },
    message(ws, raw) {
      const msg = JSON.parse(raw as string)

      if (msg.type === 'new_session') {
        const session = createSession(msg.provider as ProviderName, msg.cwd ?? process.cwd())
        session.pty.onData((data) => ws.send(JSON.stringify({ type: 'output', data })))
        ws.data = { sessionId: session.id }
        ws.send(JSON.stringify({ type: 'session_created', sessionId: session.id, provider: msg.provider, cwd: session.cwd }))
        return
      }

      // Reconnect to existing session
      if (msg.type === 'attach_session') {
        const session = getSession(msg.sessionId)
        if (!session) {
          ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }))
          return
        }
        session.pty.onData((data) => ws.send(JSON.stringify({ type: 'output', data })))
        ws.data = { sessionId: session.id }
        ws.send(JSON.stringify({ type: 'session_attached', sessionId: session.id, provider: session.provider, cwd: session.cwd }))
        return
      }

      const sessionId = (ws.data as { sessionId?: string })?.sessionId
      if (!sessionId) return

      if (msg.type === 'input') {
        getSession(sessionId)?.pty.write(msg.data)
      } else if (msg.type === 'resize') {
        getSession(sessionId)?.pty.resize(msg.cols, msg.rows)
      } else if (msg.type === 'switch_provider') {
        const newSession = switchProvider(sessionId, msg.provider as ProviderName)
        newSession.pty.onData((data) => ws.send(JSON.stringify({ type: 'output', data })));
        (ws.data as { sessionId: string }).sessionId = newSession.id
        ws.send(JSON.stringify({ type: 'provider_switched', provider: msg.provider, sessionId: newSession.id }))
      }
    },
    close(ws) {
      const sessionId = (ws.data as { sessionId?: string })?.sessionId
      if (sessionId) destroySession(sessionId)
      console.log('[ws] client disconnected')
    },
  },
})

// IP 감지: Tailscale(100.x.x.x) 우선, 없으면 로컬 IP
function getAccessIP(): string {
  const nets = networkInterfaces()
  const all = Object.values(nets).flat().filter(Boolean) as NonNullable<ReturnType<typeof networkInterfaces>[string]>[number][]

  const tailscale = all.find((n) => n.family === 'IPv4' && n.address.startsWith('100.'))
  if (tailscale) return tailscale.address

  const local = all.find((n) => n.family === 'IPv4' && !n.internal)
  return local?.address ?? 'localhost'
}

const ip = getAccessIP()
const isTailscale = ip.startsWith('100.')
const webURL = `http://${ip}:${WEB_PORT}`
const wsURL = `ws://${ip}:${PORT}`

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  claude-remote — ${MACHINE_LABEL}`)
console.log(`  플랫폼: ${platform()}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`  서버:  ws://localhost:${PORT}`)
console.log(`  웹:    http://localhost:${WEB_PORT}`)
console.log(`  원격:  ${wsURL}  ${isTailscale ? '(Tailscale ✓)' : '(로컬 IP — 같은 Wi-Fi만 가능)'}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
console.log(`iPhone에서 QR 스캔:`)
qrcode.generate(webURL, { small: true })
if (!isTailscale) {
  console.log(`\n⚠️  Tailscale 미감지. 외출 중 접속은 Tailscale 설치 후 재시작하세요.`)
  console.log(`   https://tailscale.com/download`)
}
