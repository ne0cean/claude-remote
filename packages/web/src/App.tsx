import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { Terminal as XTerm } from '@xterm/xterm'
import { Terminal } from './components/Terminal'
import { ProviderSwitch } from './components/ProviderSwitch'
import { ServerSelect } from './components/ServerSelect'
import { Dashboard } from './components/Dashboard'
import { useRelay } from './hooks/useRelay'
import { useServerConfig } from './hooks/useServerConfig'
import type { ServerConfig } from './hooks/useServerConfig'

type Screen = 'home' | 'server-select' | 'terminal' | 'github-browser' | 'new-project' | 'dashboard'

interface HandoverState {
  path: string
  label: string
  timestamp: number
  sessionId?: string
}

export default function App() {
  const termRef = useRef<XTerm | null>(null)
  const [provider, setProvider] = useState<'claude' | 'gemini' | 'shell'>('claude')
  const [handover, setHandover] = useState<HandoverState | null>(null)
  const [screen, setScreen] = useState<Screen>('home')
  const [activeServer, setActiveServer] = useState<ServerConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [repos, setRepos] = useState<any[]>([])

  const { servers, lastServer, addServer, removeServer, selectServer } = useServerConfig()

  const { 
    newSession, 
    writeInput, 
    resize, 
    switchProvider, 
    connected: wsConnected,
    reconnecting: wsReconnecting,
    attachSession
  } = useRelay({
    url: activeServer?.wsUrl ?? '',
    onOutput: (data) => termRef.current?.write(data),
    onProviderSwitch: (p) => setProvider(p as 'claude' | 'gemini' | 'shell'),
    onHandover: useCallback((h: HandoverState) => {
      setHandover(h)
      setScreen('home') // Always jump back to home on handover
    }, []),
    onHandoverClear: useCallback(() => {
      setHandover(null)
    }, [])
  })

  // Persistence: Auto-select last server
  useEffect(() => {
    if (!activeServer && lastServer) {
      setActiveServer(lastServer)
    }
  }, [activeServer, lastServer])

  const handleStartRC = () => {
    if (!handover || !activeServer) return
    if (handover.sessionId) {
      attachSession(handover.sessionId)
    } else {
      newSession(handover.path, provider as 'claude' | 'gemini' | 'shell')
    }
    setScreen('terminal')
    // Auto briefing
    setTimeout(() => {
      writeInput('\r\nvibe\r')
    }, 1000)
  }

  const handleReturnToPC = async () => {
    if (!activeServer || !handover) return
    try {
      await fetch(`${activeServer.webUrl.replace(':5188', ':3001')}/api/handover-back`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: handover.path, 
          sessionId: handover.sessionId 
        })
      })
      alert('Project context returned to Mac!')
    } catch (e) {
      setError('Failed to signal Mac return')
    }
  }

  const handleFetchRepos = async () => {
    setScreen('github-browser')
    // Placeholder repo fetch logic - will proxy through server
    if (!activeServer) return
    try {
      const res = await fetch(`${activeServer.webUrl.replace(':5188', ':3001')}/api/github/repos`)
      const data = await res.json()
      setRepos(data)
    } catch (e) {
      setError('GitHub access failed')
    }
  }

  const renderHome = () => (
    <div className="flex-1 p-6 flex flex-col gap-6 aurora-bg animate-in overflow-y-auto">
      <header className="mb-4">
        <h1 className="text-4xl font-black text-white tracking-tighter">Remote Workspace</h1>
        <p className="text-gray-400 text-sm">Choose your entry point</p>
      </header>

      {/* Option 1: RC Mode (Work in Progress) */}
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

      {/* Option 2: GitHub Projects */}
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

      {/* Option 3: New Project */}
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
      <div className="flex flex-col gap-3 overflow-y-auto">
        {repos.map(repo => (
          <div key={repo.name} className="glass-card p-4 border-white/5 flex flex-col gap-1 hover:border-teal-500/30 transition-all active:scale-[0.98]">
            <div className="flex justify-between items-center text-white">
              <span className="font-bold underline cursor-pointer">{repo.name}</span>
              <span className="text-[10px] text-gray-500">⭐️ {repo.stars}</span>
            </div>
            <p className="text-xs text-gray-400">{repo.description}</p>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0d1117] overflow-hidden text-slate-200">
      {screen === 'home' && renderHome()}
      {screen === 'server-select' && <ServerSelect onSelect={(s) => { setActiveServer(s); selectServer(s.id); setScreen('home'); }} onAdd={addServer} servers={servers} onRemove={removeServer} lastServer={lastServer} />}
      {screen === 'github-browser' && renderGithub()}
      {screen === 'terminal' && (
        <React.Fragment>
          <div className="glass flex items-center gap-4 px-4 py-3 z-50 border-b border-white/5 safe-top">
            <button onClick={() => setScreen('home')} className="p-2 hover:bg-white/5 rounded-xl font-bold text-gray-400 text-xs">← HOME</button>
            <h1 className="flex-1 text-center font-black text-xs tracking-tight truncate px-4">{handover?.label || 'Session'}</h1>
            <button onClick={handleReturnToPC} className="bg-teal-500 text-black text-[10px] font-black px-3 py-1.5 rounded-lg active:scale-95 transition-all whitespace-nowrap">RETURN TO MAC</button>
          </div>
          <Terminal termRef={termRef} onInput={writeInput} onResize={resize} />
        </React.Fragment>
      )}
      {screen === 'dashboard' && activeServer && (
        <Dashboard
          serverUrl={activeServer.wsUrl.replace('ws://', 'http://')}
          onClose={() => setScreen('home')}
        />
      )}
      {screen === 'new-project' && (
        <div className="flex-1 p-6 flex flex-col gap-6 aurora-bg animate-in items-center justify-center text-center">
            <span className="text-6xl mb-4">✨</span>
            <h2 className="text-2xl font-black text-white">Project Setup</h2>
            <p className="text-gray-400">Initialize a new project with Claude.</p>
            <input className="bg-white/5 border border-white/10 p-3 rounded-xl w-full max-w-xs text-white" placeholder="Project name..." />
            <button onClick={() => setScreen('terminal')} className="bg-white text-black font-black px-8 py-3 rounded-xl">CREATE SPACE</button>
            <button onClick={() => setScreen('home')} className="text-gray-500 text-sm font-bold">CANCEL</button>
        </div>
      )}
    </div>
  )
}
