import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

export interface QuickCommand {
  label: string
  cmd?: string
  action?: () => void
  variant?: 'default' | 'danger' | 'accent'
}

interface Props {
  onInput: (data: string) => void
  onResize: (cols: number, rows: number) => void
  termRef: React.MutableRefObject<XTerm | null>
  quickCommands?: QuickCommand[]
  tokenLimitHit?: boolean
  onOpenAntigravity?: () => void
  onDismissTokenLimit?: () => void
}

export function Terminal({ onInput, onResize, termRef, quickCommands, tokenLimitHit, onOpenAntigravity, onDismissTokenLimit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [fontSize, setFontSize] = useState(13)
  const [inputValue, setInputValue] = useState('')

  // Focus the input bar instead of xterm directly (iOS keyboard friendly)
  const handleFocus = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = useCallback(() => {
    if (!inputValue) return
    onInput(inputValue + '\r')
    setInputValue('')
  }, [inputValue, onInput])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    handleSend()
  }, [handleSend])

  const handleQuickCommand = useCallback((qc: QuickCommand) => {
    if (qc.action) {
      qc.action()
    } else if (qc.cmd) {
      onInput(qc.cmd)
    }
  }, [onInput])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#14b8a6',
        selectionBackground: 'rgba(20, 184, 166, 0.3)',
      },
      fontFamily: 'Menlo, Monaco, Lucida Console, monospace',
      fontSize,
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    const timeout = setTimeout(() => {
      fitAddon.fit()
      onResize(term.cols, term.rows)
      term.focus()
    }, 150)

    termRef.current = term
    term.onData(onInput)

    const observer = new ResizeObserver(() => {
      try {
        fitAddon.fit()
        onResize(term.cols, term.rows)
      } catch (e) {
        console.warn('Fit failed', e)
      }
    })
    observer.observe(containerRef.current)

    return () => {
      clearTimeout(timeout)
      observer.disconnect()
      term.dispose()
    }
  }, [fontSize, onInput, onResize, termRef])

  const variantClass = (variant?: QuickCommand['variant']) => {
    if (variant === 'danger') return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    if (variant === 'accent') return 'bg-teal-500/20 text-teal-400 border-teal-500/30'
    return 'bg-white/5 text-gray-400 border-white/10'
  }

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-[#0d1117] overflow-hidden"
      onClick={handleFocus}
    >
      {/* Token limit banner */}
      {tokenLimitHit && (
        <div
          className="mx-3 mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 relative z-20"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-lg">⚡</span>
          <div className="flex-1">
            <p className="text-amber-400 text-xs font-black">Claude 토큰 소진</p>
            <p className="text-gray-500 text-[10px]">Antigravity로 컨텍스트를 이어받아 계속할 수 있어요</p>
          </div>
          <div className="flex gap-2">
            {onOpenAntigravity && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenAntigravity() }}
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onOpenAntigravity() }}
                className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 active:scale-95 transition-all"
              >
                → AG
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDismissTokenLimit?.() }}
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onDismissTokenLimit?.() }}
              className="text-[10px] font-black px-2 py-1.5 rounded-lg bg-white/5 text-gray-500 border border-white/10 active:scale-95 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* xterm container */}
      <div
        ref={containerRef}
        className="flex-1 w-full px-[env(safe-area-inset-left)] overflow-hidden"
        style={{ position: 'relative' }}
      />

      {/* Mobile input bar */}
      <div
        className="border-t border-white/5 bg-[#0d1117] px-3 py-2 flex flex-col gap-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] relative z-10"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Quick command chips */}
        {quickCommands && quickCommands.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {quickCommands.map((qc, i) => (
              <button
                key={i}
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                onPointerUp={(e) => { e.stopPropagation(); handleQuickCommand(qc) }}
                className={`text-xs font-bold px-3 py-1 rounded-full border transition-all active:scale-95 ${variantClass(qc.variant)}`}
              >
                {qc.label}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => { e.stopPropagation(); setInputValue(e.target.value) }}
            placeholder="type a command..."
            enterKeyHint="send"
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          {/* Zoom controls */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden">
            <button
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault() }}
              onPointerUp={(e) => { e.stopPropagation(); setFontSize(f => Math.max(9, f - 1)) }}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-bold text-xs"
            >
              A-
            </button>
            <div className="w-[1px] bg-white/10 self-stretch" />
            <button
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault() }}
              onPointerUp={(e) => { e.stopPropagation(); setFontSize(f => Math.min(24, f + 1)) }}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-bold text-xs"
            >
              A+
            </button>
          </div>

          {/* Send button */}
          <button
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault() }}
            onPointerUp={(e) => { e.stopPropagation(); handleSend() }}
            className="w-8 h-8 flex items-center justify-center bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-xl text-sm font-bold transition-all active:scale-95 hover:bg-teal-500/30"
          >
            ↵
          </button>
        </form>
      </div>

      <style>{`
        .xterm-viewport::-webkit-scrollbar { width: 4px; }
        .xterm-viewport::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  )
}
