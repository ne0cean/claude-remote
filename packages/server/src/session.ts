import * as pty from 'node-pty'
import { type ProviderName, providers } from './providers/index.js'

export interface Session {
  id: string
  provider: ProviderName
  cwd: string
  pty: pty.IPty
  createdAt: Date
}

const sessions = new Map<string, Session>()

export function createSession(provider: ProviderName, cwd: string): Session {
  const { command, args } = providers[provider]
  const id = crypto.randomUUID()

  const ptyProcess = pty.spawn(command, args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd,
    env: process.env as Record<string, string>,
  })

  const session: Session = { id, provider, cwd, pty: ptyProcess, createdAt: new Date() }
  sessions.set(id, session)
  return session
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id)
}

export function switchProvider(sessionId: string, newProvider: ProviderName): Session {
  const existing = sessions.get(sessionId)
  if (!existing) throw new Error(`Session ${sessionId} not found`)

  existing.pty.kill()
  sessions.delete(sessionId)

  return createSession(newProvider, existing.cwd)
}

export function destroySession(id: string): void {
  const session = sessions.get(id)
  if (session) {
    session.pty.kill()
    sessions.delete(id)
  }
}
