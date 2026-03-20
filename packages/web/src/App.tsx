import React, { useRef, useState, useCallback } from 'react'
import type { Terminal as XTerm } from '@xterm/xterm'
import { Terminal } from './components/Terminal'
import { ProviderSwitch } from './components/ProviderSwitch'
import { useRelay } from './hooks/useRelay'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:3001'

export default function App() {
  const termRef = useRef<XTerm | null>(null)
  const [provider, setProvider] = useState<'claude' | 'gemini'>('claude')
  const [connected, setConnected] = useState(false)

  const { newSession, writeInput, resize, switchProvider, connected: wsConnected } = useRelay({
    url: SERVER_URL,
    onOutput: (data) => termRef.current?.write(data),
    onProviderSwitch: (p) => {
      setProvider(p as 'claude' | 'gemini')
      termRef.current?.writeln(`\r\n[claude-remote] Provider switched to ${p}\r\n`)
    },
  })

  const handleSwitch = useCallback((p: 'claude' | 'gemini') => {
    switchProvider(p)
  }, [switchProvider])

  const handleStart = useCallback(() => {
    newSession(provider)
    setConnected(true)
  }, [newSession, provider])

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <ProviderSwitch current={provider} onSwitch={handleSwitch} />

      {!connected ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <p className="text-gray-400 text-sm">서버: {SERVER_URL}</p>
          <div className="flex gap-2">
            {(['claude', 'gemini'] as const).map((p) => (
              <button
                key={p}
                onClick={() => { setProvider(p); }}
                className={`px-4 py-2 rounded text-sm font-medium border ${
                  provider === p ? 'border-white text-white' : 'border-gray-600 text-gray-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={handleStart}
            disabled={!wsConnected}
            className="px-6 py-3 bg-white text-black rounded font-bold disabled:opacity-50"
          >
            {wsConnected ? '세션 시작' : '서버 연결 중...'}
          </button>
        </div>
      ) : (
        <Terminal
          termRef={termRef}
          onInput={writeInput}
          onResize={resize}
        />
      )}
    </div>
  )
}
