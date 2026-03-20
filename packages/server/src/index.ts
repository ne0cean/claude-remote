import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createSession, getSession, switchProvider, destroySession, listSessions } from './session.js'
import type { ProviderName } from './providers/index.js'
import qrcode from 'qrcode-terminal'
import { networkInterfaces, hostname, platform, loadavg, totalmem, freemem, cpus } from 'os'

const app = new Hono()
const PORT = Number(process.env.PORT ?? 3001)
const WEB_PORT = Number(process.env.WEB_PORT ?? 5188)
const MACHINE_LABEL = process.env.MACHINE_LABEL ?? hostname()

app.use('*', cors())

let lastHandover: { path: string; label: string; timestamp: number; sessionId?: string } | null = null
const clients = new Set<any>()

// Health + info
app.get('/health', (c) => c.json({ ok: true }))
app.get('/api/metrics', (c) => {
  const [loadAvg1, loadAvg5, loadAvg15] = loadavg()
  const total = totalmem()
  const free = freemem()
  const used = total - free
  return c.json({
    cpu: { loadAvg1, loadAvg5, loadAvg15, cores: cpus().length },
    memory: { total, free, used, usedPercent: Math.round((used / total) * 100) },
    uptime: process.uptime(),
    sessions: listSessions().length,
  })
})
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

// Project Handover (Triggered by 'rc' command on Mac)
app.post('/api/handover', async (c) => {
  const { path, label, sessionId } = await c.req.json()
  lastHandover = { 
    path, 
    label: label || path.split('/').pop() || 'Untitled', 
    timestamp: Date.now(),
    sessionId // ID of the session to attach to
  }
  
  console.log(`[handover] new project target: ${path} (Session: ${sessionId || 'New'})`)
  
  // Broadcast to all connected web clients
  const msg = JSON.stringify({ type: 'handover_detected', handover: lastHandover })
  clients.forEach(ws => ws.send(msg))
  
  return c.json({ ok: true, handover: lastHandover })
})

app.get('/api/handover', (c) => c.json(lastHandover))

// Handover Back (Signal from Mobile to Mac)
app.post('/api/handover-back', async (c) => {
  const { path, sessionId } = await c.req.json()
  console.log(`\n🔔 [RETURNED] Project ${path} context has been returned from Mobile. (Session: ${sessionId})`)
  // Clear mobile toast
  lastHandover = null
  const msg = JSON.stringify({ type: 'handover_cleared' })
  clients.forEach(ws => ws.send(msg))
  return c.json({ ok: true })
})

// GitHub Repos (Mocked/Proxy)
app.get('/api/github/repos', async (c) => {
  // In a real app, this would use an OAuth token. 
  // For now, returning a sample list to demonstrate the UI.
  return c.json([
    { name: 'claude-remote', description: 'This project', stars: 12 },
    { name: 'vibing-app', description: 'Next.js masterpiece', stars: 45 },
    { name: 'connectome', description: 'Neural graph engine', stars: 89 },
  ])
})

// IP 감지: Tailscale 혹은 로컬 IP를 찾습니다.
function getAccessIP() {
  const nets = networkInterfaces()
  const all = Object.values(nets).flat().filter(Boolean) as any[]
  const IPs = all.filter(n => n.family === 'IPv4' && !n.internal).map(n => n.address)
  const tailscale = IPs.find(addr => addr.startsWith('100.'))
  return { 
    ip: tailscale ?? IPs.find(addr => !addr.startsWith('127.')) ?? 'localhost',
    isTailscale: !!tailscale,
    all: IPs
  }
}

function printStatus() {
  const { ip, isTailscale, all } = getAccessIP()
  const webURL = `http://${ip}:${WEB_PORT}`
  const wsURL = `ws://${ip}:${PORT}`

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  claude-remote — ${MACHINE_LABEL}`)
  console.log(`  IPs: ${all.join(', ')}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  서버:  ws://localhost:${PORT}`)
  console.log(`  웹:    http://localhost:${WEB_PORT}`)
  console.log(`  원격:  ${wsURL}  ${isTailscale ? '(Tailscale ✓)' : '(로컬 IP)'}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
  qrcode.generate(webURL, { small: true })
}

printStatus()

// WebSocket upgrade — Bun native
const server = Bun.serve({
  hostname: '0.0.0.0',
  port: PORT,
  fetch(req, server) {
    if (server.upgrade(req)) return
    return app.fetch(req)
  },
  websocket: {
    open(ws) {
      const info = getAccessIP()
      console.log(`[ws] client connected (Remote IP: ${info.ip})`)
      clients.add(ws)
      
      // If there's a recent handover, notify the new client
      if (lastHandover && Date.now() - lastHandover.timestamp < 1000 * 60 * 5) {
        ws.send(JSON.stringify({ type: 'handover_detected', handover: lastHandover }))
      }
    },
    message(ws, raw) {
      const msg = JSON.parse(raw as string)

      if (msg.type === 'new_session') {
        const session = createSession(msg.provider as ProviderName, msg.cwd ?? process.cwd())
        session.pty.onData((data) => ws.send(JSON.stringify({ type: 'output', data })))
        ;(ws as any).data = { sessionId: session.id }
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
        ;(ws as any).data = { sessionId: session.id }
        ws.send(JSON.stringify({ type: 'session_attached', sessionId: session.id, provider: session.provider, cwd: session.cwd }))
        return
      }

      const sessionId = (ws as any).data?.sessionId
      if (!sessionId) return

      if (msg.type === 'input') {
        getSession(sessionId)?.pty.write(msg.data)
      } else if (msg.type === 'resize') {
        getSession(sessionId)?.pty.resize(msg.cols, msg.rows)
      } else if (msg.type === 'switch_provider') {
        const newSession = switchProvider(sessionId, msg.provider as ProviderName)
        newSession.pty.onData((data) => ws.send(JSON.stringify({ type: 'output', data })));
        ;(ws as any).data.sessionId = newSession.id
        ws.send(JSON.stringify({ type: 'provider_switched', provider: msg.provider, sessionId: newSession.id }))
      }
    },
    close(ws) {
      clients.delete(ws)
      console.log('[ws] client disconnected')
    },
  },
})
