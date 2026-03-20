import React, { useEffect, useRef } from 'react'
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

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      theme: { background: '#0d1117' },
      fontFamily: 'Menlo, Monaco, monospace',
      fontSize: 13,
      cursorBlink: true,
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()
    termRef.current = term

    term.onData(onInput)

    const observer = new ResizeObserver(() => {
      fitAddon.fit()
      onResize(term.cols, term.rows)
    })
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      term.dispose()
    }
  }, [])

  return <div ref={containerRef} className="flex-1 w-full h-full" />
}
