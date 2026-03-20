import React, { useState } from 'react'

interface Props {
  current: 'claude' | 'gemini' | 'shell'
  onSwitch: (provider: 'claude' | 'gemini' | 'shell') => void
}

export function ProviderBadge({ current }: { current: string }) {
  const getStyle = () => {
    switch (current) {
      case 'claude': return 'bg-orange-500/20 text-orange-500 border-orange-500/20 shadow-orange-500/10'
      case 'gemini': return 'bg-blue-600/20 text-blue-400 border-blue-500/20 shadow-blue-500/10'
      case 'shell': return 'bg-teal-500/20 text-teal-500 border-teal-500/20 shadow-teal-500/10'
      default: return 'bg-white/10 text-white border-white/10'
    }
  }

  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm ${getStyle()}`}>
      {current}
    </span>
  )
}

export function ProviderSwitch({ current, onSwitch }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const providers = ['claude', 'gemini', 'shell'] as const
  const next = providers[(providers.indexOf(current) + 1) % providers.length]

  const handleConfirm = () => {
    onSwitch(next)
    setShowConfirm(false)
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 pr-1 pl-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all group active:scale-95"
      >
        <ProviderBadge current={current} />
        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-gray-400 group-hover:text-white transition-colors">
          <span className="text-xs">→</span>
        </div>
      </button>

      {/* Switch Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm glass rounded-[32px] p-6 border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-3xl animate-pulse">
                {next === 'claude' ? '🧡' : next === 'gemini' ? '💙' : '🐚'}
              </div>
              
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Switch to {next.toUpperCase()}?</h3>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Changing the AI provider will detach the current PTY session and re-establish the bridge.
                </p>
              </div>

              <div className="flex flex-col w-full gap-2 mt-2">
                <button
                  onClick={handleConfirm}
                  className="w-full py-4 bg-white text-black font-black text-sm rounded-2xl active:scale-95 transition-transform hover:bg-slate-200"
                >
                  CONFIRM SWITCH
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-4 bg-white/5 text-slate-400 font-bold text-sm rounded-2xl hover:text-white hover:bg-white/10 transition-all"
                >
                  KEEP {current.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
