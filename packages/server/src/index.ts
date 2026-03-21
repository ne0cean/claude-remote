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

// GitHub Repos (Real API with public + private repo support + 5min cache + pagination)
let repoCache: { data: any[]; timestamp: number; hasToken: boolean } | null = null
const REPO_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchAllGithubRepos(token: string | undefined): Promise<{ repos: any[]; error?: string }> {
  const headers: Record<string, string> = {
    'User-Agent': 'claude-remote',
    Accept: 'application/vnd.github+json',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const allRepos: any[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const url = token
      ? `https://api.github.com/user/repos?type=owner&per_page=${perPage}&sort=updated&page=${page}`
      : null

    if (!url) break

    const res = await fetch(url, { headers })
    if (!res.ok) {
      const text = await res.text()
      return { repos: [], error: `GitHub API error: ${res.status} ${text}` }
    }

    const batch = await res.json() as any[]
    allRepos.push(...batch)

    if (batch.length < perPage) break
    page++
    if (page > 10) break // safety limit: max 1000 repos
  }

  return { repos: allRepos }
}

app.get('/api/github/repos', async (c) => {
  const token = process.env.GITHUB_TOKEN
  const username = c.req.query('username')

  if (!token && !username) {
    return c.json({ error: 'GITHUB_TOKEN not configured. Set a token or provide ?username= for public repos.', repos: [] }, 200)
  }

  // Return cache if fresh and same auth state
  if (repoCache && Date.now() - repoCache.timestamp < REPO_CACHE_TTL && repoCache.hasToken === !!token) {
    return c.json(repoCache.data)
  }

  let ghRepos: any[]

  if (token) {
    // Authenticated: fetch all owned repos (public + private) with pagination
    const result = await fetchAllGithubRepos(token)
    if (result.error) return c.json({ error: result.error, repos: [] }, 200)
    ghRepos = result.repos
  } else if (username) {
    // Unauthenticated: fetch public repos only by username
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`, {
        headers: { 'User-Agent': 'claude-remote', Accept: 'application/vnd.github+json' },
      })
      if (!res.ok) {
        const text = await res.text()
        return c.json({ error: `GitHub API error: ${res.status} ${text}`, repos: [] }, 200)
      }
      ghRepos = await res.json() as any[]
    } catch (err: any) {
      return c.json({ error: `Fetch failed: ${err?.message ?? String(err)}`, repos: [] }, 200)
    }
  } else {
    return c.json({ error: 'No auth method available', repos: [] }, 200)
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

  repoCache = { data: repos, timestamp: Date.now(), hasToken: !!token }
  return c.json(repos)
})

// Korean → romanized keyword map for fallback naming
const KR_MAP: Record<string, string> = {
  '앱': 'app', '관리': 'manager', '시스템': 'system', '도구': 'tool',
  '서비스': 'service', '플랫폼': 'platform', '일정': 'schedule',
  '자동': 'auto', '개인': 'personal', '프로젝트': 'project', '봇': 'bot',
  '분석': 'analytics', '대시보드': 'dashboard', '모니터링': 'monitor',
  '채팅': 'chat', '검색': 'search', '알림': 'notify', '추적': 'tracker',
  '변환': 'converter', '생성': 'generator', '기록': 'logger', '메모': 'memo',
  '학습': 'learn', '번역': 'translate', '요약': 'summarize', '계산': 'calc',
  '예약': 'booking', '결제': 'pay', '인증': 'auth', '저장': 'vault',
  '공유': 'share', '편집': 'editor', '뉴스': 'news', '날씨': 'weather',
  '음악': 'music', '사진': 'photo', '영상': 'video', '게임': 'game',
  '건강': 'health', '운동': 'fitness', '요리': 'recipe', '쇼핑': 'shop',
  '지도': 'maps', '여행': 'travel', '가계부': 'ledger', '일기': 'diary',
  '타이머': 'timer', '캘린더': 'calendar', '리모컨': 'remote',
  '클라우드': 'cloud', '데이터': 'data', '파일': 'file', '코드': 'code',
}

function koreanToKeywords(text: string): string[] {
  const words: string[] = []
  // Extract Korean words and map them
  for (const [kr, en] of Object.entries(KR_MAP)) {
    if (text.includes(kr)) words.push(en)
  }
  // Extract English words
  const eng = text.match(/[a-zA-Z]{2,}/g)
  if (eng) words.push(...eng.map(w => w.toLowerCase()))
  return [...new Set(words)].slice(0, 4)
}

// AI Name Suggestions — uses claude CLI for smart naming
app.post('/api/suggest-names', async (c) => {
  const { description } = await c.req.json() as { description?: string }
  if (!description || typeof description !== 'string') {
    return c.json({ error: 'description required' }, 400)
  }

  try {
    const prompt = `You are a GitHub repository naming expert. Given this project idea, suggest exactly 3 short, memorable repo names. Rules: lowercase, hyphens only, max 30 chars, no generic names like "my-app". Return ONLY a JSON array of 3 strings, nothing else.

Project idea: "${description.slice(0, 200)}"`

    // Remove CLAUDECODE env to avoid nested session block
    const cleanEnv = { ...process.env }
    delete cleanEnv.CLAUDECODE
    delete cleanEnv.CLAUDE_CODE

    const proc = Bun.spawn(['claude', '-p', prompt], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: cleanEnv,
    })

    // Timeout: race between output and 15s timer
    const output = await Promise.race([
      new Response(proc.stdout).text(),
      new Promise<string>((_, reject) => setTimeout(() => {
        proc.kill()
        reject(new Error('timeout'))
      }, 15000)),
    ])
    await proc.exited

    // Extract JSON array from output
    const match = output.match(/\[[\s\S]*?\]/)
    if (match) {
      const names = JSON.parse(match[0]) as string[]
      const valid = names
        .map((n: string) => n.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
        .filter((n: string) => n.length >= 2 && n.length <= 30)
        .slice(0, 3)
      if (valid.length > 0) {
        return c.json({ names: valid, source: 'ai' })
      }
    }
    throw new Error('Failed to parse AI response')
  } catch (err: any) {
    console.warn(`[suggest-names] AI fallback: ${err?.message}`)
    // Fallback: Korean-aware local generation
    const keywords = koreanToKeywords(description)
    if (keywords.length === 0) keywords.push('project')
    const base = keywords.slice(0, 3).join('-')
    const alt1 = keywords.length > 1 ? `${keywords[0]}-${keywords[1]}` : `${keywords[0]}-app`
    const alt2 = `${keywords[0]}-${Date.now().toString(36).slice(-4)}`
    return c.json({
      names: [base, alt1, alt2].map(n => n.replace(/-+/g, '-').replace(/^-|-$/g, '')),
      source: 'fallback',
    })
  }
})

// New Project — create local folder + optional GitHub repo (with step-by-step status)
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
  let githubError: string | null = null
  const steps = { github: 'skipped' as string, folder: 'pending' as string, files: 'pending' as string }

  // Step 1: Try creating GitHub repo
  if (token) {
    steps.github = 'pending'
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
          stdout: 'pipe',
          stderr: 'pipe',
        })
        await cloneProc.exited
        steps.github = 'done'
      } else {
        const text = await ghRes.text()
        githubError = `GitHub ${ghRes.status}: ${text.slice(0, 200)}`
        steps.github = 'failed'
        console.warn(`[new-project] GitHub repo creation failed: ${ghRes.status} ${text.slice(0, 100)}`)
      }
    } catch (err: any) {
      githubError = err?.message ?? String(err)
      steps.github = 'failed'
      console.warn(`[new-project] GitHub API error: ${githubError}`)
    }
  }

  // Step 2: Create local folder if git clone didn't
  if (!existsSync(projectPath)) {
    mkdirSync(projectPath, { recursive: true })
    const initProc = Bun.spawn(['git', 'init'], {
      cwd: projectPath,
      stdout: 'ignore',
      stderr: 'ignore',
    })
    await initProc.exited
  }
  steps.folder = 'done'

  // Step 3: Create .context dir + template files
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

## 빌드 명령
\`\`\`bash
# 프로젝트에 맞게 수정하세요
npm run build
npm run test
\`\`\`
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
  steps.files = 'done'

  console.log(`[new-project] created: ${projectPath}${repoUrl ? ` (GitHub: ${repoUrl})` : ' (local only)'}`)

  return c.json({
    ok: true,
    path: projectPath,
    repoUrl,
    steps,
    githubError,
    hasToken: !!token,
  })
})

// Open project in Antigravity IDE (Mac)
app.post('/api/open-in-antigravity', async (c) => {
  const { path: projectPath } = await c.req.json()
  if (!projectPath || typeof projectPath !== 'string') {
    return c.json({ error: 'path required' }, 400)
  }

  if (platform() !== 'darwin') {
    return c.json({ error: 'macOS only' }, 400)
  }

  // Try antigravity CLI, fall back to 'open -a Antigravity'
  const tryCli = Bun.spawn(['which', 'antigravity'], { stdout: 'pipe', stderr: 'ignore' })
  await tryCli.exited
  const cliPath = (await new Response(tryCli.stdout).text()).trim()

  if (cliPath) {
    Bun.spawn([cliPath, projectPath], { stdout: 'ignore', stderr: 'ignore' })
    console.log(`[antigravity] opened via CLI: ${projectPath}`)
  } else {
    Bun.spawn(['open', '-a', 'Antigravity', projectPath], { stdout: 'ignore', stderr: 'ignore' })
    console.log(`[antigravity] opened via open -a: ${projectPath}`)
  }

  return c.json({ ok: true, path: projectPath })
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
        try {
          const session = createSession(msg.provider as ProviderName, msg.cwd ?? process.cwd())
          session.pty.onData((data) => ws.send(JSON.stringify({ type: 'output', data })))
          ;(ws as any).data = { sessionId: session.id }
          ws.send(JSON.stringify({ type: 'session_created', sessionId: session.id, provider: msg.provider, cwd: session.cwd }))
          console.log(`[session] created ${session.id} (${msg.provider}) at ${session.cwd}`)
        } catch (e) {
          const errMsg = (e as Error).message
          console.error(`[session] create failed:`, errMsg)
          ws.send(JSON.stringify({ type: 'error', message: `Session creation failed: ${errMsg}` }))
        }
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
        try {
          const s = getSession(sessionId)
          if (s && msg.cols > 0 && msg.rows > 0) s.pty.resize(msg.cols, msg.rows)
        } catch (e) {
          console.warn('[resize] failed:', (e as Error).message)
        }
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
