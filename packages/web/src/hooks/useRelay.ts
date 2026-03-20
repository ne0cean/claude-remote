import { useEffect, useRef, useState, useCallback } from 'react'

type ServerMessage =
  | { type: 'output'; data: string }
  | { type: 'provider_switched'; provider: string; sessionId: string }
  | { type: 'session_created'; sessionId: string; provider: string }
  | { type: 'session_attached'; sessionId: string; provider: string; cwd: string }
  | { type: 'handover_detected'; handover: { path: string; label: string; timestamp: number; sessionId?: string } }
  | { type: 'handover_cleared' }
  | { type: 'error'; message: string }

interface UseRelayOptions {
  url: string
  onOutput: (data: string) => void
  onProviderSwitch: (provider: string) => void
  onHandover?: (handover: { path: string; label: string; timestamp: number; sessionId?: string }) => void
  onHandoverClear?: () => void
}

export function useRelay({ url, onOutput, onProviderSwitch, onHandover, onHandoverClear }: UseRelayOptions) {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const reconnectAttempts = useRef(0)

  // Use refs for callbacks to avoid re-connecting on every change
  const onOutputRef = useRef(onOutput)
  const onProviderSwitchRef = useRef(onProviderSwitch)
  const onHandoverRef = useRef(onHandover)
  const onHandoverClearRef = useRef(onHandoverClear)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    onOutputRef.current = onOutput
    onProviderSwitchRef.current = onProviderSwitch
    onHandoverRef.current = onHandover
    onHandoverClearRef.current = onHandoverClear
    sessionIdRef.current = sessionId
  }, [onOutput, onProviderSwitch, onHandover, onHandoverClear, sessionId])

  const connect = useCallback(() => {
    if (!url) return
    if (ws.current?.readyState === WebSocket.OPEN) return

    console.log(`[ws] Connecting to ${url}...`)
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => {
      console.log('[ws] Connected')
      setConnected(true)
      setReconnecting(false)
      reconnectAttempts.current = 0
      
      // Re-attach if we have a session
      if (sessionIdRef.current) {
        console.log(`[ws] Re-attaching to session ${sessionIdRef.current}`)
        socket.send(JSON.stringify({ type: 'attach_session', sessionId: sessionIdRef.current }))
      }
    }

    socket.onmessage = (e) => {
      try {
        const msg: ServerMessage = JSON.parse(e.data)
        if (msg.type === 'output') {
          onOutputRef.current(msg.data)
        } else if (msg.type === 'session_created') {
          setSessionId(msg.sessionId)
        } else if (msg.type === 'session_attached') {
          setSessionId(msg.sessionId)
          onProviderSwitchRef.current(msg.provider)
        } else if (msg.type === 'provider_switched') {
          setSessionId(msg.sessionId)
          onProviderSwitchRef.current(msg.provider)
        } else if (msg.type === 'handover_detected') {
          onHandoverRef.current?.(msg.handover)
        } else if (msg.type === 'handover_cleared') {
          onHandoverClearRef.current?.()
        } else if (msg.type === 'error') {
          console.error('[ws] server error:', msg.message)
        }
      } catch (err) {
        console.error('[ws] parse error', err)
      }
    }

    socket.onclose = () => {
      setConnected(false)
      ws.current = null
      
      // Attempt reconnect if not explicitly unmounted
      setReconnecting(true)
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
      console.log(`[ws] Disconnected. Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`)
      
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      reconnectTimer.current = window.setTimeout(() => {
        reconnectAttempts.current++
        connect()
      }, delay)
    }

    socket.onerror = (err) => {
      console.error('[ws] error', err)
    }
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (ws.current) {
        ws.current.onclose = null // Prevent auto-reconnect on unmount
        ws.current.close()
      }
    }
  }, [url, connect])

  const send = useCallback((payload: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload))
    }
  }, [])

  const newSession = useCallback((cwd: string, provider: 'claude' | 'gemini' | 'shell') => {
    send({ type: 'new_session', provider, cwd: cwd ?? '' })
  }, [send])

  const writeInput = useCallback((data: string) => {
    send({ type: 'input', data })
  }, [send])

  const resize = useCallback((cols: number, rows: number) => {
    send({ type: 'resize', cols, rows })
  }, [send])

  const switchProvider = useCallback((provider: 'claude' | 'gemini' | 'shell') => {
    send({ type: 'switch_provider', provider })
  }, [send])

  const attachSession = useCallback((sessionId: string) => {
    send({ type: 'attach_session', sessionId })
  }, [send])

  return { connected, reconnecting, sessionId, newSession, attachSession, writeInput, resize, switchProvider }
}
