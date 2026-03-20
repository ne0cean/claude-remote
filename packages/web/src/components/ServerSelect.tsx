import React, { useState, useEffect } from 'react'
import type { ServerConfig } from '../hooks/useServerConfig'

interface Props {
  servers: ServerConfig[]
  lastServer: ServerConfig | null
  onSelect: (server: ServerConfig) => void
  onAdd: (config: Omit<ServerConfig, 'id'>) => ServerConfig
  onRemove: (id: string) => void
}

function ServerItem({ 
  server, 
  isActive, 
  onSelect, 
  onRemove 
}: { 
  server: ServerConfig, 
  isActive: boolean, 
  onSelect: (s: ServerConfig) => void,
  onRemove: (id: string) => void
}) {
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading')

  useEffect(() => {
    const checkHealth = async () => {
      const apiUrl = server.wsUrl.replace(/^ws/, 'http')
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        
        const res = await fetch(`${apiUrl}/health`, { signal: controller.signal })
        clearTimeout(timeoutId)
        
        if (res.ok) {
          setStatus('online')
        } else {
          setStatus('offline')
        }
      } catch (err) {
        setStatus('offline')
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 10000) // Check every 10s
    return () => clearInterval(interval)
  }, [server.wsUrl])

  return (
    <div
      className={`group flex items-center gap-4 p-4 rounded-2xl glass-card cursor-pointer border-white/5 transition-all duration-300 ${
        isActive ? 'ring-2 ring-teal-500/50 bg-white/10 shadow-lg shadow-teal-500/5' : 'hover:bg-white/5'
      }`}
      onClick={() => onSelect(server)}
    >
      <div className="relative">
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-teal-500 font-bold border border-white/5">
          {server.label.charAt(0).toUpperCase()}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#020617] transition-colors duration-500 ${
          status === 'online' ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 
          status === 'loading' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
        }`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white text-sm font-black truncate">{server.label}</p>
          {status === 'online' && (
            <span className="text-[9px] font-black text-teal-500/80 uppercase tracking-tighter">Secure</span>
          )}
        </div>
        <p className="text-gray-500 text-[9px] uppercase font-bold tracking-widest mt-0.5 truncate opacity-60 group-hover:opacity-100 transition-opacity">
          {server.wsUrl}
        </p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(server.id) }}
        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-rose-400 text-sm transition-all duration-200 p-2 translate-x-2 group-hover:translate-x-0"
      >
        ✕
      </button>
    </div>
  )
}

export function ServerSelect({ servers, lastServer, onSelect, onAdd, onRemove }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ label: '', ip: '', wsPort: '3001', webPort: '5173' })

  function handleAdd() {
    if (!form.label || !form.ip) return
    const server = onAdd({
      label: form.label,
      wsUrl: `ws://${form.ip}:${form.wsPort}`,
      webUrl: `http://${form.ip}:${form.webPort}`,
    })
    onSelect(server)
    setShowAdd(false)
    setForm({ label: '', ip: '', wsPort: '3001', webPort: '5173' })
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 vibe-dot-grid relative overflow-y-auto safe-top pb-safe-bottom">
      <div className="text-center mb-10 overflow-hidden">
        <h1 className="text-5xl font-black text-white tracking-tighter mb-3 animate-in slide-in-from-top-4 duration-700">Vibe Remote</h1>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-md animate-in fade-in duration-1000 delay-300">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-teal-500/50" />
          <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none mt-0.5">Infrastructure Hub</span>
        </div>
      </div>

      {/* 저장된 서버 목록 */}
      {servers.length > 0 && !showAdd && (
        <div className="w-full max-w-sm flex flex-col gap-3 mb-8 animate-in slide-in-from-bottom-4 duration-700">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] ml-2 mb-1">Active Clusters</p>
          {servers.map((s) => (
            <ServerItem
              key={s.id}
              server={s}
              isActive={lastServer?.id === s.id}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {/* 서버 추가 폼 */}
      {showAdd ? (
        <div className="w-full max-w-sm flex flex-col gap-4 p-6 glass rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="mb-2">
            <h3 className="text-white font-black tracking-tight text-xl">Register Node</h3>
            <p className="text-gray-500 text-[11px] font-medium mt-1">Deploy a new bridge between devices</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 opacity-70">Node Identity</label>
              <input
                className="w-full bg-white/5 text-white text-sm rounded-2xl px-4 py-3.5 border border-white/5 focus:outline-none focus:border-teal-500/50 focus:bg-white/10 placeholder:text-gray-700 transition-all font-bold"
                placeholder="e.g. Studio M4"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 opacity-70">Bridge Address (Tailscale IP)</label>
              <input
                className="w-full bg-white/5 text-white text-sm rounded-2xl px-4 py-3.5 border border-white/5 focus:outline-none focus:border-teal-500/50 focus:bg-white/10 placeholder:text-gray-700 transition-all font-mono"
                placeholder="100.x.y.z"
                value={form.ip}
                onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
              />
            </div>

            <div className="flex gap-4 pt-2">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 text-center block opacity-70">Relay</label>
                <input
                  className="w-full bg-white/5 text-white text-sm rounded-2xl py-3 border border-white/5 focus:outline-none focus:border-teal-500/50 text-center font-mono"
                  value={form.wsPort}
                  onChange={(e) => setForm((f) => ({ ...f, wsPort: e.target.value }))}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 text-center block opacity-70">Web</label>
                <input
                  className="w-full bg-white/5 text-white text-sm rounded-2xl py-3 border border-white/5 focus:outline-none focus:border-teal-500/50 text-center font-mono"
                  value={form.webPort}
                  onChange={(e) => setForm((f) => ({ ...f, webPort: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-6">
            <button
              onClick={handleAdd}
              disabled={!form.label || !form.ip}
              className="w-full vibe-button"
            >
              LINK INFRASTRUCTURE
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="w-full py-3 text-gray-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="group flex flex-col items-center gap-3 mt-4 active:scale-95 transition-transform"
        >
          <div className="w-16 h-16 flex items-center justify-center rounded-3xl bg-white/5 border border-white/5 group-hover:border-teal-500/30 group-hover:bg-teal-500/5 transition-all duration-500">
            <span className="text-3xl text-gray-600 group-hover:text-teal-400 font-light transition-colors">+</span>
          </div>
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] group-hover:text-gray-400 transition-colors">
            Enlist New Node
          </span>
        </button>
      )}

      <div className="fixed bottom-10 text-center space-y-1 pointer-events-none opacity-40">
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
          Powered by Vibe Toolkit Node v1.4<br />
          E2E Encrypted PTY Session
        </p>
      </div>
    </div>
  )
}
