import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { Terminal as XTerm } from '@xterm/xterm'
import { Terminal } from './components/Terminal'
import type { QuickCommand } from './components/Terminal'
import { ProviderSwitch } from './components/ProviderSwitch'
import { ServerSelect } from './components/ServerSelect'
import { Dashboard } from './components/Dashboard'
import { NewProject } from './components/NewProject'
import { useRelay } from './hooks/useRelay'
import { useServerConfig } from './hooks/useServerConfig'
import type { ServerConfig } from './hooks/useServerConfig'

type Screen = 'home' | 'server-select' | 'terminal' | 'github-browser' | 'new-project' | 'dashboard'
type TerminalContext = 'rc' | 'github' | 'new-project'

interface HandoverState {
  path: string
  label: string
  timestamp: number
  sessionId?: string
}

interface GithubRepo {
  name: string
  description: string
  stars: number
  private: boolean
  localPath?: string | null
}

export default function App() {
  const termRef = useRef<XTerm | null>(null)
  const [provider, setProvider] = useState<'claude' | 'gemini' | 'shell'>('claude')
  const [handover, setHandover] = useState<HandoverState | null>(null)
  const [screen, setScreen] = useState<Screen>('home')
  const [activeServer, setActiveServer] = useState<ServerConfig | null>(null)
  const [repos, setRepos] = useState<GithubRepo[]>([])
  const [terminalContext, setTerminalContext] = useState<TerminalContext>('rc')
  const [githubSessionLabel, setGithubSessionLabel] = useState<string>('')

  const [githubTokenInput, setGithubTokenInput] = useState<string>('')
  const [githubTokenError, setGithubTokenError] = useState<string | null>(null)
  const [githubTokenSaving, setGithubTokenSaving] = useState(false)
  const [githubNeedsToken, setGithubNeedsToken] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)

  const { servers, lastServer, addServer, removeServer, selectServer } = useServerConfig()

  const [sessionCwd, setSessionCwd] = useState<string | null>(null)
  const [tokenLimitHit, setTokenLimitHit] = useState(false)
  const pendingSessionRef = useRef<{ cwd: string; provider: 'claude' | 'gemini' | 'shell'; attachId?: string; autoVibe?: boolean } | null>(null)

  const {
    newSession,
    writeInput,
    resize,
    switchProvider,
    connected: wsConnected,
    attachSession
  } = useRelay({
    url: activeServer?.wsUrl ?? '',
    onOutput: useCallback((data: string) => {
      termRef.current?.write(data)
      // Detect Claude Code token/rate limit messages
      if (
        data.includes('Claude usage limit') ||
        data.includes('rate limit') ||
        data.includes('API error: 429') ||
        data.includes('overloaded_error') ||
        data.includes('exceeded your current quota')
      ) {
        setTokenLimitHit(true)
      }
    }, []),
    onProviderSwitch: (p) => setProvider(p as 'claude' | 'gemini' | 'shell'),
    onHandover: useCallback((h: HandoverState) => {
      setHandover(h)
      setScreen('home')
    }, []),
    onHandoverClear: useCallback(() => {
      setHandover(null)
    }, []),
    onSessionCwd: useCallback((cwd: string) => {
      setSessionCwd(cwd)
      setTokenLimitHit(false)
    }, [])
  })

  useEffect(() => {
    if (!activeServer && lastServer) {
      setActiveServer(lastServer)
    }
  }, [activeServer, lastServer])

  const handleStartRC = () => {
    if (!handover || !activeServer) return
    setTerminalContext('rc')
    pendingSessionRef.current = handover.sessionId
      ? { cwd: handover.path, provider: provider as 'claude' | 'gemini' | 'shell', attachId: handover.sessionId, autoVibe: true }
      : { cwd: handover.path, provider: provider as 'claude' | 'gemini' | 'shell', autoVibe: true }
    setScreen('terminal')
  }

  const handleReturnToPC = useCallback(async () => {
    if (!activeServer || !handover) return
    try {
      await fetch(`${activeServer.wsUrl.replace(/^ws(s?):\/\//, 'http$1://').replace(':3001', ':3001')}/api/handover-back`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: handover.path,
          sessionId: handover.sessionId
        })
      })
    } catch (e) {
      console.error('Failed to signal Mac return', e)
    }
  }, [activeServer, handover])

  const handleFetchRepos = async () => {
    setScreen('github-browser')
    setGithubNeedsToken(false)
    setGithubLoading(true)
    if (!activeServer) return
    try {
      const serverHttp = activeServer.wsUrl.replace(/^ws(s?):\/\//, 'http$1://')
      const res = await fetch(`${serverHttp}/api/github/repos`)
      const data = await res.json()
      if (data.error && data.error.includes('GITHUB_TOKEN')) {
        setGithubNeedsToken(true)
        setRepos([])
      } else {
        setRepos(Array.isArray(data) ? data : data.repos ?? [])
      }
    } catch (e) {
      console.error('GitHub access failed', e)
    } finally {
      setGithubLoading(false)
    }
  }

  const handleSaveToken = async () => {
    if (!activeServer || !githubTokenInput.trim()) return
    setGithubTokenSaving(true)
    try {
      const serverHttp = activeServer.wsUrl.replace(/^ws(s?):\/\//, 'http$1://')
      const res = await fetch(`${serverHttp}/api/config/github-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubTokenInput.trim() })
      })
      if (res.ok) {
        setGithubNeedsToken(false)
        setGithubTokenInput('')
        handleFetchRepos()
      } else {
        setGithubTokenError('저장 실패. 서버 응답 확인 필요.')
      }
    } catch (e) {
      setGithubTokenError('서버 연결 실패')
    } finally {
      setGithubTokenSaving(false)
    }
  }

  const handleOpenRepo = (repo: GithubRepo) => {
    setGithubSessionLabel(repo.name)
    setTerminalContext('github')
    pendingSessionRef.current = { cwd: repo.localPath || repo.name, provider: 'claude', autoVibe: true }
    setScreen('terminal')
  }

  const handleOpenAntigravity = useCallback(async () => {
    if (!activeServer || !sessionCwd) return
    const serverHttp = activeServer.wsUrl.replace(/^ws(s?):\/\//, 'http$1://')
    try {
      await fetch(`${serverHttp}/api/open-in-antigravity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: sessionCwd })
      })
    } catch (e) {
      console.error('Failed to open Antigravity', e)
    }
    setTokenLimitHit(false)
  }, [activeServer, sessionCwd])

  // Quick commands per context — include AG button when sessionCwd available
  const agCommand: QuickCommand | null = sessionCwd
    ? { label: '→ AG', action: handleOpenAntigravity, variant: 'accent' }
    : null

  const rcQuickCommands: QuickCommand[] = [
    { label: '/vibe', cmd: '/vibe\r', variant: 'accent' },
    { label: '/end', cmd: '/end\r', variant: 'default' },
    { label: '← PC', action: async () => { await handleReturnToPC(); setScreen('home') }, variant: 'danger' },
    ...(agCommand ? [agCommand] : []),
  ]

  const githubQuickCommands: QuickCommand[] = [
    { label: '/vibe', cmd: '/vibe\r', variant: 'accent' },
    { label: '/end', cmd: '/end\r', variant: 'default' },
    { label: '← HOME', action: () => setScreen('home'), variant: 'danger' },
    ...(agCommand ? [agCommand] : []),
  ]

  const activeQuickCommands =
    terminalContext === 'rc' ? rcQuickCommands : githubQuickCommands

  const terminalLabel =
    terminalContext === 'rc' ? (handover?.label || 'RC Session') : (githubSessionLabel || 'Session')

  const handleTerminalReady = useCallback(() => {
    const pending = pendingSessionRef.current
    if (!pending) return
    pendingSessionRef.current = null

    if (pending.attachId) {
      attachSession(pending.attachId)
    } else {
      newSession(pending.cwd, pending.provider)
    }
    if (pending.autoVibe) {
      setTimeout(() => writeInput('/vibe\r'), 1500)
    }
  }, [attachSession, newSession, writeInput])

  const renderHome = () => (
    <div className="flex-1 p-6 flex flex-col gap-6 aurora-bg animate-in overflow-y-auto">
      <header className="mb-4">
        <h1 className="text-4xl font-black text-white tracking-tighter">Remote Workspace</h1>
        <p className="text-gray-400 text-sm">Choose your entry point</p>
      </header>

      {/* RC Mode */}
      <div
        onClick={handover ? handleStartRC : undefined}
        className={`glass-card p-6 flex flex-col gap-3 transition-all ${handover ? 'border-teal-500/50 bg-teal-500/5 hover:scale-[1.02] cursor-pointer' : 'opacity-50 grayscale cursor-not-allowed'}`}
      >
        <div className="flex justify-between items-start">
          <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400">
            <span className="text-2xl">🔄</span>
          </div>
          {handover && <span className="bg-teal-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse uppercase">Detected</span>}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">RC Mode</h2>
          <p className="text-gray-400 text-sm line-clamp-1">{handover ? `Resume: ${handover.label}` : 'No active PC context'}</p>
        </div>
      </div>

      {/* GitHub Projects */}
      <div
        onClick={handleFetchRepos}
        className="glass-card p-6 flex flex-col gap-3 hover:scale-[1.02] hover:border-white/20 transition-all cursor-pointer"
      >
        <div className="p-3 rounded-2xl bg-white/5 text-white w-fit">
          <span className="text-2xl">🐙</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">GitHub Projects</h2>
          <p className="text-gray-400 text-sm">Deploy or attach from your repositories</p>
        </div>
      </div>

      {/* New Project */}
      <div
        onClick={() => setScreen('new-project')}
        className="glass-card p-6 flex flex-col gap-3 hover:scale-[1.02] hover:border-white/20 transition-all cursor-pointer"
      >
        <div className="p-3 rounded-2xl bg-white/5 text-white w-fit">
          <span className="text-2xl">✨</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">New Project</h2>
          <p className="text-gray-400 text-sm">Start a fresh AI-driven session</p>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="mt-auto flex items-center justify-between glass-card px-4 py-3 border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-teal-500' : 'bg-rose-500'}`} />
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{activeServer?.label ?? 'Not Connected'}</span>
        </div>
        <div className="flex items-center gap-3">
          {activeServer && <button onClick={() => setScreen('dashboard')} className="text-[10px] text-gray-500 font-bold hover:text-teal-500 hover:underline">DASHBOARD</button>}
          <button onClick={() => setScreen('server-select')} className="text-[10px] text-teal-500 font-bold hover:underline">SWITCH NODE</button>
        </div>
      </footer>
    </div>
  )

  const renderGithub = () => (
    <div className="flex-1 p-6 flex flex-col gap-6 aurora-bg animate-in">
      <header className="flex items-center gap-4">
        <button onClick={() => setScreen('home')} className="p-2 bg-white/5 rounded-xl text-gray-400">←</button>
        <h1 className="text-2xl font-black text-white tracking-tighter">Your Repositories</h1>
      </header>

      {githubNeedsToken ? (
        <div className="flex flex-col gap-4">
          <div className="glass-card p-5 border-yellow-500/20 bg-yellow-500/5">
            <h3 className="text-yellow-400 font-black text-sm mb-1">GitHub Token 필요</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Private 레포를 포함한 전체 레포 목록을 보려면 GitHub Personal Access Token이 필요합니다.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">발급 방법</p>
            <div className="glass-card p-4 border-white/5 text-xs text-gray-400 flex flex-col gap-1">
              <p>1. github.com → Settings → Developer settings</p>
              <p>2. Personal access tokens → Fine-grained tokens</p>
              <p>3. Generate new token → repo 권한 선택</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="password"
              value={githubTokenInput}
              onChange={(e) => setGithubTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="bg-white/5 border border-white/10 p-3 rounded-xl text-white text-sm font-mono placeholder-gray-700 outline-none focus:border-teal-500/50"
            />
            {githubTokenError && <p className="text-rose-400 text-xs">{githubTokenError}</p>}
            <button
              onClick={handleSaveToken}
              disabled={!githubTokenInput.trim() || githubTokenSaving}
              className="bg-teal-500 text-black font-black py-3 rounded-xl disabled:opacity-40 active:scale-95 transition-all"
            >
              {githubTokenSaving ? '저장 중...' : '토큰 저장 및 연결'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {githubLoading && (
            <div className="flex flex-col gap-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="glass-card p-4 border-white/5 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}
          {!githubLoading && repos.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-8">
              레포가 없습니다
            </div>
          )}
          <div className="flex flex-col gap-3 overflow-y-auto">
            {repos.map(repo => (
              <div
                key={repo.name}
                onClick={() => handleOpenRepo(repo)}
                className="glass-card p-4 border-white/5 flex flex-col gap-1 hover:border-teal-500/30 transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex justify-between items-center text-white">
                  <span className="font-bold">{repo.name}</span>
                  <div className="flex items-center gap-2">
                    {repo.private && (
                      <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-bold">PRIVATE</span>
                    )}
                    {repo.stars > 0 && <span className="text-[10px] text-gray-500">⭐ {repo.stars}</span>}
                  </div>
                </div>
                <p className="text-xs text-gray-400">{repo.description}</p>
                {repo.localPath && <p className="text-[10px] text-teal-600 font-mono">{repo.localPath}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0d1117] overflow-hidden text-slate-200">
      {screen === 'home' && renderHome()}
      {screen === 'server-select' && (
        <ServerSelect
          onSelect={(s) => { setActiveServer(s); selectServer(s.id); setScreen('home') }}
          onAdd={addServer}
          servers={servers}
          onRemove={removeServer}
          lastServer={lastServer}
        />
      )}
      {screen === 'github-browser' && renderGithub()}
      {screen === 'terminal' && (
        <React.Fragment>
          <div className="glass flex items-center gap-4 px-4 py-3 z-50 border-b border-white/5 safe-top">
            <button onClick={() => setScreen('home')} className="p-2 hover:bg-white/5 rounded-xl font-bold text-gray-400 text-xs">← HOME</button>
            <h1 className="flex-1 text-center font-black text-xs tracking-tight truncate px-4">{terminalLabel}</h1>
            <ProviderSwitch current={provider} onSwitch={switchProvider} />
          </div>
          <Terminal
            termRef={termRef}
            onInput={writeInput}
            onResize={resize}
            quickCommands={activeQuickCommands}
            tokenLimitHit={tokenLimitHit}
            onOpenAntigravity={sessionCwd ? handleOpenAntigravity : undefined}
            onDismissTokenLimit={() => setTokenLimitHit(false)}
            onReady={handleTerminalReady}
          />
        </React.Fragment>
      )}
      {screen === 'dashboard' && activeServer && (
        <Dashboard
          serverUrl={activeServer.wsUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://')}
          onClose={() => setScreen('home')}
        />
      )}
      {screen === 'new-project' && (
        <NewProject
          serverUrl={activeServer ? activeServer.wsUrl.replace(/^ws(s?):\/\//, 'http$1://') : 'http://localhost:3001'}
          onCreated={(path, label) => {
            setGithubSessionLabel(label)
            setTerminalContext('new-project')
            pendingSessionRef.current = { cwd: path, provider: 'claude', autoVibe: true }
            setScreen('terminal')
          }}
          onCancel={() => setScreen('home')}
        />
      )}
    </div>
  )
}
