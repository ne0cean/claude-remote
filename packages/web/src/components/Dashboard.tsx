import React, { useState, useEffect, useRef } from 'react'
import { formatUptime } from '../utils'

interface DashboardProps {
  serverUrl: string
  onClose: () => void
}

interface Metrics {
  cpu: {
    loadAvg1: number
  }
  memory: {
    usedPercent: number
    used: number
    total: number
  }
  sessions: number
  uptime: number
}


function CpuGauge({ value }: { value: number }) {
  // 0~4 range, cap at 100%
  const pct = Math.min(value / 4, 1)
  const danger = pct >= 0.75
  const warn = pct >= 0.5

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">CPU Load Avg (1m)</span>
        <span className={`text-lg font-black tabular-nums ${danger ? 'text-rose-400' : warn ? 'text-amber-400' : 'text-teal-400'}`}>
          {value.toFixed(2)}
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-white/5 border border-white/5 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${pct * 100}%`,
            background: danger
              ? 'linear-gradient(90deg, #f43f5e, #fb7185)'
              : warn
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(90deg, #14b8a6, #2dd4bf)',
            boxShadow: danger
              ? '0 0 8px rgba(244,63,94,0.5)'
              : warn
              ? '0 0 8px rgba(245,158,11,0.4)'
              : '0 0 8px rgba(20,184,166,0.4)',
          }}
        />
      </div>
      <div className="flex justify-between text-[9px] font-bold text-gray-700 uppercase tracking-widest">
        <span>0</span>
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4+</span>
      </div>
    </div>
  )
}

function MemoryCircle({ percent }: { percent: number }) {
  const radius = 40
  const stroke = 6
  const normalizedRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * normalizedRadius
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference

  const danger = percent >= 85
  const warn = percent >= 65

  const color = danger ? '#f43f5e' : warn ? '#f59e0b' : '#14b8a6'
  const glow = danger
    ? 'drop-shadow(0 0 6px rgba(244,63,94,0.6))'
    : warn
    ? 'drop-shadow(0 0 6px rgba(245,158,11,0.5))'
    : 'drop-shadow(0 0 6px rgba(20,184,166,0.5))'

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Memory Used</span>
      <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
        <svg
          width={radius * 2}
          height={radius * 2}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.7s ease, stroke 0.5s ease',
              filter: glow,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-black tabular-nums"
            style={{ color }}
          >
            {Math.round(percent)}%
          </span>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white/5 border border-white/5">
      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
      <span className="text-2xl font-black text-white tabular-nums tracking-tight">{value}</span>
      {sub && <span className="text-[10px] text-gray-600 font-bold">{sub}</span>}
    </div>
  )
}

export function Dashboard({ serverUrl, onClose }: DashboardProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMetrics = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(`${serverUrl}/api/metrics`, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: Metrics = await res.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out')
      } else {
        setError('Failed to reach server')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    intervalRef.current = setInterval(fetchMetrics, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [serverUrl])

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-6 vibe-dot-grid relative overflow-y-auto safe-top pb-safe-bottom">
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between mb-8 animate-in slide-in-from-top-4 duration-700">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter">Dashboard</h2>
          <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-0.5 font-mono truncate max-w-[200px]">
            {serverUrl}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all duration-200 active:scale-95"
          aria-label="Close dashboard"
        >
          ✕
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="w-full max-w-sm flex flex-col items-center gap-4 mt-16 animate-in fade-in duration-500">
          <div className="w-10 h-10 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin" />
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Fetching metrics…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="w-full max-w-sm animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-3 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 text-sm font-black">!</div>
              <div>
                <p className="text-rose-400 text-sm font-black">Connection Error</p>
                <p className="text-gray-500 text-[11px] font-medium mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchMetrics}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[11px] font-black uppercase tracking-widest transition-all duration-200 active:scale-95"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Metrics */}
      {!loading && !error && metrics && (
        <div className="w-full max-w-sm flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-700">
          {/* CPU Gauge */}
          <div className="p-5 rounded-2xl glass-card border-white/5">
            <CpuGauge value={metrics.cpu.loadAvg1} />
          </div>

          {/* Memory + Sessions row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl glass-card border-white/5 flex flex-col items-center">
              <MemoryCircle percent={metrics.memory.usedPercent} />
            </div>

            <div className="flex flex-col gap-4">
              <StatCard
                label="Active Sessions"
                value={String(metrics.sessions)}
                sub={metrics.sessions === 1 ? 'session' : 'sessions'}
              />
              <StatCard
                label="Uptime"
                value={formatUptime(metrics.uptime)}
              />
            </div>
          </div>

          {/* Memory detail row */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Mem Used"
              value={`${(metrics.memory.used / 1024 / 1024 / 1024).toFixed(1)} GB`}
            />
            <StatCard
              label="Mem Total"
              value={`${(metrics.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB`}
            />
          </div>

          {/* Live indicator */}
          <div className="flex items-center justify-center gap-2 mt-2 opacity-40">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse shadow-teal-500/50" />
            <span className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">Live — refreshes every 5s</span>
          </div>
        </div>
      )}
    </div>
  )
}
