import React, { useState } from 'react'
import type { ServerConfig } from '../hooks/useServerConfig'

interface Props {
  servers: ServerConfig[]
  lastServer: ServerConfig | null
  onSelect: (server: ServerConfig) => void
  onAdd: (config: Omit<ServerConfig, 'id'>) => ServerConfig
  onRemove: (id: string) => void
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
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">claude-remote</h1>
        <p className="text-gray-400 text-sm mt-1">접속할 서버를 선택하세요</p>
      </div>

      {/* 저장된 서버 목록 */}
      {servers.length > 0 && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          {servers.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                lastServer?.id === s.id
                  ? 'border-white bg-gray-800'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500'
              }`}
              onClick={() => onSelect(s)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{s.label}</p>
                <p className="text-gray-500 text-xs truncate">{s.wsUrl}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(s.id) }}
                className="text-gray-600 hover:text-red-400 text-xs px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 서버 추가 폼 */}
      {showAdd ? (
        <div className="w-full max-w-sm flex flex-col gap-3 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-white text-sm font-medium">서버 추가</p>
          <input
            className="bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-gray-400"
            placeholder="라벨 (예: Mac 집, Windows 회사)"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
          <input
            className="bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-gray-400"
            placeholder="IP (Tailscale: 100.x.x.x, 로컬: 192.168.x.x)"
            value={form.ip}
            onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
          />
          <div className="flex gap-2">
            <input
              className="bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-gray-400 w-1/2"
              placeholder="서버 포트 (3001)"
              value={form.wsPort}
              onChange={(e) => setForm((f) => ({ ...f, wsPort: e.target.value }))}
            />
            <input
              className="bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-gray-400 w-1/2"
              placeholder="웹 포트 (5173)"
              value={form.webPort}
              onChange={(e) => setForm((f) => ({ ...f, webPort: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!form.label || !form.ip}
              className="flex-1 py-2 bg-white text-black text-sm font-bold rounded disabled:opacity-40"
            >
              추가
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-2 border border-gray-600 text-gray-400 text-sm rounded"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm text-gray-400 border border-gray-700 rounded-lg px-4 py-2 hover:border-gray-500 hover:text-white"
        >
          + 서버 추가
        </button>
      )}

      <p className="text-gray-600 text-xs text-center max-w-xs">
        Tailscale IP(100.x.x.x)를 사용하면<br />Wi-Fi 밖에서도 접속 가능합니다
      </p>
    </div>
  )
}
