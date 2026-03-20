import React from 'react'

export interface SessionMeta {
  id: string
  provider: 'claude' | 'gemini'
  cwd: string
  createdAt: string
}

interface Props {
  sessions: SessionMeta[]
  onAttach: (sessionId: string) => void
}

export function SessionList({ sessions, onAttach }: Props) {
  if (sessions.length === 0) return null

  return (
    <div className="w-full max-w-sm flex flex-col gap-3 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center gap-3 px-1 mb-1">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Active Sessions</span>
        <div className="h-px flex-1 bg-white/5" />
      </div>
      <div className="flex flex-col gap-2.5">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onAttach(session.id)}
            className="group flex flex-col p-4 rounded-2xl glass-card cursor-pointer border-white/5 hover:border-teal-500/30 transition-all"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-2 h-2 rounded-full shadow-lg ${session.provider === 'claude' ? 'bg-orange-500 shadow-orange-500/20' : 'bg-blue-500 shadow-blue-500/20'}`} />
              <span className="text-white text-xs font-bold uppercase tracking-wider">{session.provider} Relay</span>
              <span className="text-gray-500 text-[9px] font-bold ml-auto uppercase tracking-tighter opacity-50">
                {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-gray-400 text-[10px] truncate font-mono bg-white/5 px-2 py-1.5 rounded-lg border border-white/5 group-hover:bg-white/10 transition-colors italic">
              {session.cwd}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
