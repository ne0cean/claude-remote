import React from 'react'

interface Props {
  current: 'claude' | 'gemini'
  onSwitch: (provider: 'claude' | 'gemini') => void
}

export function ProviderBadge({ current }: { current: string }) {
  const isClaude = current === 'claude'
  return (
    <span className={`px-2 py-1 rounded text-xs font-bold ${isClaude ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
      {isClaude ? 'Claude' : 'Gemini'}
    </span>
  )
}

export function ProviderSwitch({ current, onSwitch }: Props) {
  const next = current === 'claude' ? 'gemini' : 'claude'

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
      <ProviderBadge current={current} />
      <button
        onClick={() => onSwitch(next)}
        className="ml-auto text-xs text-gray-400 hover:text-white border border-gray-600 rounded px-2 py-1"
      >
        {next === 'gemini' ? 'Gemini로 전환' : 'Claude로 전환'}
      </button>
    </div>
  )
}
