import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface Props {
  onInput: (data: string) => void
  onResize: (cols: number, rows: number) => void
  termRef: React.MutableRefObject<XTerm | null>
}

export function Terminal({ onInput, onResize, termRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(13)

  // Explicit focus helper for mobile gestures
  const handleFocus = useCallback(() => {
    if (termRef.current) {
      termRef.current.focus()
    }
  }, [termRef])

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
    
    // Initial fit with a small delay for DOM stability
    const timeout = setTimeout(() => {
      fitAddon.fit()
      onResize(term.cols, term.rows)
      term.focus() // Autonatic focus once opened
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

  return (
    <div 
      className="flex-1 relative flex flex-col min-h-0 bg-[#0d1117] overflow-hidden"
      onClick={handleFocus}
    >
      {/* Container with safe area padding for mobile */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full pb-[env(safe-area-inset-bottom)] px-[env(safe-area-inset-left)]" 
      />
      
      {/* Premium Zoom controls - Floating Glassmorphism */}
      <div className="absolute right-6 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] flex gap-2 no-select">
        <div className="flex bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-2xl opacity-40 hover:opacity-100 transition-all duration-300 transform scale-90 sm:scale-100 active:scale-110">
          <button 
            onClick={(e) => { e.stopPropagation(); setFontSize(f => Math.max(9, f - 1)) }}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-bold text-lg"
          >
            A-
          </button>
          <div className="w-[1px] bg-white/10 my-2" />
          <button 
            onClick={(e) => { e.stopPropagation(); setFontSize(f => Math.min(24, f + 1)) }}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-bold text-lg"
          >
            A+
          </button>
        </div>
      </div>

      <style>{`
        .xterm-viewport::-webkit-scrollbar { width: 4px; }
        .xterm-viewport::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  )
}
