import { useEffect, useRef, useState, useCallback } from 'react'

type ServerMessage =
  | { type: 'output'; data: string }
  | { type: 'provider_switched'; provider: string; sessionId: string }
  | { type: 'session_created'; sessionId: string; provider: string }
  | { type: 'error'; message: string }

interface UseRelayOptions {
  url: string
  onOutput: (data: string) => void
  onProviderSwitch: (provider: string) => void
}

export function useRelay({ url, onOutput, onProviderSwitch }: UseRelayOptions) {
  const ws = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => setConnected(true)
    socket.onclose = () => setConnected(false)

    socket.onmessage = (e) => {
      const msg: ServerMessage = JSON.parse(e.data)
      if (msg.type === 'output') onOutput(msg.data)
      else if (msg.type === 'session_created') setSessionId(msg.sessionId)
      else if (msg.type === 'provider_switched') {
        setSessionId(msg.sessionId)
        onProviderSwitch(msg.provider)
      }
    }

    return () => socket.close()
  }, [url])

  const send = useCallback((payload: object) => {
    ws.current?.send(JSON.stringify(payload))
  }, [])

  const newSession = useCallback((provider: 'claude' | 'gemini', cwd?: string) => {
    send({ type: 'new_session', provider, cwd: cwd ?? '' })
  }, [send])

  const writeInput = useCallback((data: string) => {
    send({ type: 'input', data })
  }, [send])

  const resize = useCallback((cols: number, rows: number) => {
    send({ type: 'resize', cols, rows })
  }, [send])

  const switchProvider = useCallback((provider: 'claude' | 'gemini') => {
    send({ type: 'switch_provider', provider })
  }, [send])

  return { connected, sessionId, newSession, writeInput, resize, switchProvider }
}
