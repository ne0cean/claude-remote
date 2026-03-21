import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { type ProviderName, providers } from './providers/index.js'

// --- PTY Worker (Node subprocess) ---
// Bun's event loop doesn't support node-pty onData events,
// so we delegate PTY to a Node child process.

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKER_PATH = join(__dirname, 'pty-worker.mjs')

interface PtyWorkerProxy {
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  onData(cb: (data: string) => void): void
  onExit(cb: (e: { exitCode: number; signal: number }) => void): void
  pid: number
}

let workerProcess: ReturnType<typeof import('child_process').spawn> | null = null
const dataCallbacks = new Map<string, (data: string) => void>()
const exitCallbacks = new Map<string, (e: { exitCode: number; signal: number }) => void>()
const spawnResolvers = new Map<string, (pid: number) => void>()

function getWorker() {
  if (workerProcess && !workerProcess.killed) return workerProcess

  const { spawn } = require('child_process') as typeof import('child_process')
  const nodePath = process.env.NODE_PATH_FOR_PTY || 'node'

  workerProcess = spawn(nodePath, [WORKER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env,
  })

  const { createInterface } = require('readline') as typeof import('readline')
  const rl = createInterface({ input: workerProcess!.stdout! })

  rl.on('line', (line: string) => {
    try {
      const msg = JSON.parse(line)
      if (msg.type === 'data') {
        dataCallbacks.get(msg.id)?.(msg.data)
      } else if (msg.type === 'exit') {
        exitCallbacks.get(msg.id)?.({ exitCode: msg.exitCode, signal: msg.signal })
        dataCallbacks.delete(msg.id)
        exitCallbacks.delete(msg.id)
      } else if (msg.type === 'spawned') {
        spawnResolvers.get(msg.id)?.(msg.pid)
        spawnResolvers.delete(msg.id)
      } else if (msg.type === 'error') {
        console.error(`[pty-worker] error for ${msg.id}:`, msg.message)
      }
    } catch { /* ignore parse errors */ }
  })

  workerProcess!.stderr!.on('data', (d: Buffer) => {
    console.error('[pty-worker stderr]', d.toString().trim())
  })

  workerProcess!.on('exit', (code: number | null) => {
    console.warn(`[pty-worker] exited with code ${code}, will restart on next spawn`)
    workerProcess = null
  })

  return workerProcess!
}

function sendToWorker(msg: object) {
  const w = getWorker()
  w.stdin!.write(JSON.stringify(msg) + '\n')
}

function spawnViaWorker(
  id: string,
  command: string,
  args: string[],
  cols: number,
  rows: number,
  cwd: string,
  env: Record<string, string>
): Promise<PtyWorkerProxy> {
  return new Promise((resolve) => {
    const proxy: PtyWorkerProxy = {
      pid: 0,
      write(data: string) { sendToWorker({ type: 'write', id, data }) },
      resize(cols: number, rows: number) { sendToWorker({ type: 'resize', id, cols, rows }) },
      kill() { sendToWorker({ type: 'kill', id }) },
      onData(cb: (data: string) => void) { dataCallbacks.set(id, cb) },
      onExit(cb: (e: { exitCode: number; signal: number }) => void) { exitCallbacks.set(id, cb) },
    }

    spawnResolvers.set(id, (pid) => {
      proxy.pid = pid
      resolve(proxy)
    })

    sendToWorker({ type: 'spawn', id, command, args, cols, rows, cwd, env })
  })
}

// --- Session management ---

export interface Session {
  id: string
  provider: ProviderName
  cwd: string
  pty: PtyWorkerProxy
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

function persistState() {
  const meta: SessionMeta[] = [...sessions.values()].map((s) => ({
    id: s.id,
    provider: s.provider,
    cwd: s.cwd,
    createdAt: s.createdAt.toISOString(),
  }))
  writeFileSync(STATE_FILE, JSON.stringify(meta, null, 2))
}

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

export async function createSession(provider: ProviderName, cwd: string): Promise<Session> {
  const { command, args } = providers[provider]
  const id = crypto.randomUUID()

  const binPath = join(process.cwd(), 'bin')
  const userPath = [
    binPath,
    '/Users/noir/.bun/bin',
    '/Users/noir/.nvm/versions/node/v24.13.0/bin',
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ].join(':')

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    PATH: userPath + (process.env.PATH ? `:${process.env.PATH}` : ''),
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    SESSION_ID: id,
  }

  const ptyProxy = await spawnViaWorker(id, command, args, 80, 24, cwd, env)

  const session: Session = { id, provider, cwd, pty: ptyProxy, createdAt: new Date() }
  sessions.set(id, session)
  persistState()
  return session
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id)
}

export async function switchProvider(sessionId: string, newProvider: ProviderName): Promise<Session> {
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
