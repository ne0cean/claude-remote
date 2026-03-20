import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createSession, getSession, switchProvider, destroySession, listSessions } from './session.js'
import type { ProviderName } from './providers/index.js'
import qrcode from 'qrcode-terminal'
import { networkInterfaces, hostname, platform, loadavg, totalmem, freemem, cpus } from 'os'
import { existsSync, mkdirSync } from 'fs'

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
    sessionId
  }
  console.log(`[handover] new project target: ${path} (Session: ${sessionId || 'New'})`)
  const msg = JSON.stringify({ type: 'handover_detected', handover: lastHandover })
  clients.forEach(ws => ws.send(msg))
  return c.json({ ok: true, handover: lastHandover })
})

app.get('/api/handover', (c) => c.json(lastHandover))

// Handover Back (Signal from Mobile to Mac)
app.post('/api/handover-back', async (c) => {
  const { path, sessionId } = await c.req.json()
  const label = path?.split('/').pop() || 'project'
  console.log(`\n🔔 [RETURNED] ${label} returned from Mobile. (Session: ${sessionId})`)
  lastHandover = null
  const msg = JSON.stringify({ type: 'handover_cleared' })
  clients.forEach(ws => ws.send(msg))
  // macOS notification
  if (platform() === 'darwin') {
    Bun.spawn(['osascript', '-e',
      `display notification "iPhone이 제어권을 반환했습니다: ${label}" with title "claude-remote" sound name "Glass"`
    ], { stdout: 'ignore', stderr: 'ignore' })
  }
  return c.json({ ok: true })
})

// GitHub token config (saves to process.env at runtime)
app.post('/api/config/github-token', async (c) => {
  const { token } = await c.req.json()
  if (!token || typeof token !== 'string') return c.json({ error: 'token required' }, 400)
  process.env.GITHUB_TOKEN = token.trim()
  console.log('[config] GITHUB_TOKEN set (runtime only — add to .env to persist)')
  return c.json({ ok: true })
})

// GitHub Repos (Real API with private repo support)
app.get('/api/github/repos', async (c) => {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return c.json({ error: 'GITHUB_TOKEN not configured', repos: [] }, 200)
  }

  let ghRepos: any[]
  try {
    const res = await fetch('https://api.github.com/user/repos?type=all&per_page=100&sort=updated', {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'claude-remote',
        Accept: 'application/vnd.github+json',
      },
    })
    if (!res.ok) {
      const text = await res.text()
      return c.json({ error: `GitHub API error: ${res.status} ${text}`, repos: [] }, 200)
    }
    ghRepos = await res.json() as any[]
  } catch (err: any) {
    return c.json({ error: `Fetch failed: ${err?.message ?? String(err)}`, repos: [] }, 200)
  }

  const home = process.env.HOME ?? ''
  const projectsBase = process.env.PROJECTS_BASE ?? ''

  const repos = ghRepos.map((repo: any) => {
    const name: string = repo.name
    const candidates = [
      projectsBase ? `${projectsBase}/${name}` : null,
      home ? `${home}/Desktop/Projects/${name}` : null,
      home ? `${home}/Projects/${name}` : null,
      `${process.cwd()}/../${name}`,
    ].filter(Boolean) as string[]

    const localPath = candidates.find(p => existsSync(p)) ?? null

    return {
      name,
      description: repo.description ?? '',
      stars: repo.stargazers_count as number,
      private: repo.private as boolean,
      htmlUrl: repo.html_url as string,
      updatedAt: repo.updated_at as string,
      localPath,
    }
  })

  return c.json(repos)
})

// New Project — create local folder + optional GitHub repo
app.post('/api/new-project', async (c) => {
  const body = await c.req.json()
  const { name, description = '', private: isPrivate = true } = body as {
    name?: string
    description?: string
    private?: boolean
  }

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return c.json({ error: 'name is required' }, 400)
  }

  const safeName = name.trim()
  const base =
    process.env.PROJECTS_BASE ||
    (process.env.HOME ? `${process.env.HOME}/Desktop/Projects` : process.cwd())

  const projectPath = `${base}/${safeName}`

  if (existsSync(projectPath)) {
    return c.json({ error: `Project folder already exists: ${projectPath}` }, 400)
  }

  const token = process.env.GITHUB_TOKEN
  let repoUrl: string | null = null

  // Try creating GitHub repo first
  if (token) {
    try {
      const ghRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'claude-remote',
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: safeName, description, private: isPrivate, auto_init: true }),
      })

      if (ghRes.ok) {
        const ghData = await ghRes.json() as any
        repoUrl = ghData.clone_url as string

        const cloneProc = Bun.spawn(['git', 'clone', repoUrl, projectPath], {
          stdout: 'ignore',
          stderr: 'ignore',
        })
        await cloneProc.exited
      } else {
        console.warn(`[new-project] GitHub repo creation failed: ${ghRes.status}`)
      }
    } catch (err: any) {
      console.warn(`[new-project] GitHub API error: ${err?.message ?? String(err)}`)
    }
  }

  // Create local folder if git clone didn't
  if (!existsSync(projectPath)) {
    mkdirSync(projectPath, { recursive: true })
    const initProc = Bun.spawn(['git', 'init'], {
      cwd: projectPath,
      stdout: 'ignore',
      stderr: 'ignore',
    })
    await initProc.exited
  }

  // Create .context dir + template files
  const contextDir = `${projectPath}/.context`
  if (!existsSync(contextDir)) {
    mkdirSync(contextDir, { recursive: true })
  }

  await Bun.write(`${projectPath}/CLAUDE.md`, `# ${safeName}

## 세션 시작 시 반드시 읽기
1. \`.context/CURRENT.md\` — 현재 상태 / 진행 작업 / 다음 할 일

## 핵심 원칙
- **Coding Safety**: 파일 전체 읽고 수정, 수정 후 빌드 검증
- **Commit Format**: \`[type]: 요약\` + NOW/NEXT/BLOCK 구조
`)

  await Bun.write(`${projectPath}/.context/CURRENT.md`, `# CURRENT — ${safeName}

## Goal
${description}

## Status
초기 설정 완료 — 개발 시작 전

## Next Tasks
1. [ ] 프로젝트 요구사항 정리 및 첫 번째 기능 구현

## Blockers
- (없음)
`)

  console.log(`[new-project] created: ${projectPath}${repoUrl ? ` (GitHub: ${repoUrl})` : ''}`)

  return c.json({ ok: true, path: projectPath, repoUrl, localCreated: true })
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
        newSession.pty.onData((data) => ws.send(JSON.stringify({ type: 'output', data })))
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
