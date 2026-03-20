import { useState, useCallback } from 'react'

export interface ServerConfig {
  id: string
  label: string       // "Mac (집)", "Windows (회사)"
  wsUrl: string       // ws://100.x.x.x:3001
  webUrl: string      // http://100.x.x.x:5173
}

const STORAGE_KEY = 'claude-remote:servers'
const LAST_KEY = 'claude-remote:last-server'

function load(): ServerConfig[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(servers: ServerConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(servers))
}

export function useServerConfig() {
  const [servers, setServers] = useState<ServerConfig[]>(load)
  const [lastId, setLastId] = useState<string | null>(() => localStorage.getItem(LAST_KEY))

  const addServer = useCallback((config: Omit<ServerConfig, 'id'>) => {
    const newServer: ServerConfig = { ...config, id: crypto.randomUUID() }
    setServers((prev) => {
      const next = [...prev, newServer]
      save(next)
      return next
    })
    return newServer
  }, [])

  const removeServer = useCallback((id: string) => {
    setServers((prev) => {
      const next = prev.filter((s) => s.id !== id)
      save(next)
      return next
    })
  }, [])

  const selectServer = useCallback((id: string) => {
    localStorage.setItem(LAST_KEY, id)
    setLastId(id)
  }, [])

  const lastServer = servers.find((s) => s.id === lastId) ?? servers[0] ?? null

  return { servers, lastServer, addServer, removeServer, selectServer }
}
