import { Hono } from 'hono'
import { createSession, getSession, switchProvider, destroySession } from './session.js'
import type { ProviderName } from './providers/index.js'

const app = new Hono()
const PORT = Number(process.env.PORT ?? 3001)

// Health check
app.get('/health', (c) => c.json({ ok: true }))

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
        ws.send(JSON.stringify({ type: 'session_created', sessionId: session.id, provider: msg.provider }))
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

console.log(`claude-remote server running on http://localhost:${PORT}`)
