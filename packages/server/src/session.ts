import * as pty from 'node-pty'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { type ProviderName, providers } from './providers/index.js'

export interface Session {
  id: string
  provider: ProviderName
  cwd: string
  pty: pty.IPty
  createdAt: Date
}

export interface SessionMeta {
  id: string
  provider: ProviderName
  cwd: string
  createdAt: string
}

const sessions = new Map<string, Session>()
const STATE_FILE = join(process.cwd(), '.session-state.json')

// 세션 메타 파일 저장 (PTY 프로세스 제외)
function persistState() {
  const meta: SessionMeta[] = [...sessions.values()].map((s) => ({
    id: s.id,
    provider: s.provider,
    cwd: s.cwd,
    createdAt: s.createdAt.toISOString(),
  }))
  writeFileSync(STATE_FILE, JSON.stringify(meta, null, 2))
}

// 서버 시작 시 이전 상태 로드 (표시용 — PTY는 재생성 불가)
export function loadLastState(): SessionMeta[] {
  if (!existsSync(STATE_FILE)) return []
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as SessionMeta[]
  } catch {
    return []
  }
}

export function listSessions(): SessionMeta[] {
  return [...sessions.values()].map((s) => ({
    id: s.id,
    provider: s.provider,
    cwd: s.cwd,
    createdAt: s.createdAt.toISOString(),
  }))
}

export function createSession(provider: ProviderName, cwd: string): Session {
  const { command, args } = providers[provider]
  const id = crypto.randomUUID()

  // Ensure a robust PATH for the child process
  const binPath = join(process.cwd(), 'bin')
  const userPath = [
    binPath, // Ensure 'rc' command is available
    '/Users/noir/.bun/bin',
    '/Users/noir/.nvm/versions/node/v24.13.0/bin',
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ].join(':')

  const env = { 
    ...process.env, 
    PATH: userPath + (process.env.PATH ? `:${process.env.PATH}` : ''),
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    SESSION_ID: id, // For handover tracking
  }

  const ptyProcess = pty.spawn(command, args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd,
    env,
  })

  const session: Session = { id, provider, cwd, pty: ptyProcess, createdAt: new Date() }
  sessions.set(id, session)
  persistState()
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
    persistState()
  }
}
