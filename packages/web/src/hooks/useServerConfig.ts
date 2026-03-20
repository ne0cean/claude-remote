import { useState, useCallback, useEffect } from 'react'

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
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function save(servers: ServerConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers))
  } catch (e) {
    console.warn('localStorage save failed', e)
  }
}

export function useServerConfig() {
  const [servers, setServers] = useState<ServerConfig[]>(load)
  const [lastId, setLastId] = useState<string | null>(() => localStorage.getItem(LAST_KEY))

  // Auto-discover the server we are hosted on if list is empty
  useEffect(() => {
    if (servers.length === 0 && typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const wsUrl = `ws://${hostname}:3001`
      const webUrl = window.location.origin
      
      const defaultServer: ServerConfig = {
        id: 'default-local',
        label: hostname === 'localhost' ? 'Local Mac' : hostname.split('.')[0].toUpperCase(),
        wsUrl,
        webUrl
      }
      
      setServers([defaultServer])
      save([defaultServer])
    }
  }, [servers.length])

  const addServer = useCallback((config: Omit<ServerConfig, 'id'>) => {
    const id = (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function')
      ? window.crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36)
      
    const newServer: ServerConfig = { ...config, id }
    setServers((prev) => {
      // Avoid duplicates by WS URL
      if (prev.some(s => s.wsUrl === config.wsUrl)) return prev
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
    try {
      localStorage.setItem(LAST_KEY, id)
    } catch (e) {}
    setLastId(id)
  }, [])

  const lastServer = servers.find((s) => s.id === lastId) ?? servers[0] ?? null

  return { servers, lastServer, addServer, removeServer, selectServer }
}
