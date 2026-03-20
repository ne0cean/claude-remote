import React, { useRef, useState, useCallback } from 'react'
import type { Terminal as XTerm } from '@xterm/xterm'
import { Terminal } from './components/Terminal'
import { ProviderSwitch } from './components/ProviderSwitch'
import { ServerSelect } from './components/ServerSelect'
import { useRelay } from './hooks/useRelay'
import { useServerConfig } from './hooks/useServerConfig'
import type { ServerConfig } from './hooks/useServerConfig'

type Screen = 'server-select' | 'session-start' | 'terminal'

export default function App() {
  const termRef = useRef<XTerm | null>(null)
  const [provider, setProvider] = useState<'claude' | 'gemini'>('claude')
  const [screen, setScreen] = useState<Screen>('server-select')
  const [activeServer, setActiveServer] = useState<ServerConfig | null>(null)

  const { servers, lastServer, addServer, removeServer, selectServer } = useServerConfig()

  const { newSession, writeInput, resize, switchProvider, connected: wsConnected } = useRelay({
    url: activeServer?.wsUrl ?? '',
    onOutput: (data) => termRef.current?.write(data),
    onProviderSwitch: (p) => {
      setProvider(p as 'claude' | 'gemini')
      termRef.current?.writeln(`\r\n[claude-remote] switched to ${p}\r\n`)
    },
  })

  const handleSelectServer = useCallback((server: ServerConfig) => {
    selectServer(server.id)
    setActiveServer(server)
    setScreen('session-start')
  }, [selectServer])

  const handleStart = useCallback(() => {
    newSession(provider)
    setScreen('terminal')
  }, [newSession, provider])

  const handleSwitchProvider = useCallback((p: 'claude' | 'gemini') => {
    switchProvider(p)
  }, [switchProvider])

  // 서버 전환 (헤더에서)
  const handleChangeServer = useCallback(() => {
    setScreen('server-select')
    setActiveServer(null)
  }, [])

  if (screen === 'server-select') {
    return (
      <div className="flex flex-col h-screen bg-gray-950 text-white">
        <ServerSelect
          servers={servers}
          lastServer={lastServer}
          onSelect={handleSelectServer}
          onAdd={addServer}
          onRemove={removeServer}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <button
          onClick={handleChangeServer}
          className="text-gray-500 hover:text-white text-xs mr-1"
          title="서버 변경"
        >
          ⇄
        </button>
        <span className="text-gray-400 text-xs truncate flex-1">{activeServer?.label}</span>
        <ProviderSwitch current={provider} onSwitch={handleSwitchProvider} />
      </div>

      {screen === 'session-start' ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <p className="text-gray-400 text-xs">{activeServer?.wsUrl}</p>
          <div className="flex gap-2">
            {(['claude', 'gemini'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
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
        <Terminal termRef={termRef} onInput={writeInput} onResize={resize} />
      )}
    </div>
  )
}
