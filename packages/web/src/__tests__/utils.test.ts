import { describe, it, expect } from 'vitest'
import { formatUptime, wsUrlToHttp } from '../utils'

describe('formatUptime', () => {
  it('0초 → 0h 0m', () => {
    expect(formatUptime(0)).toBe('0h 0m')
  })
  it('59초 → 0h 0m', () => {
    expect(formatUptime(59)).toBe('0h 0m')
  })
  it('60초 → 0h 1m', () => {
    expect(formatUptime(60)).toBe('0h 1m')
  })
  it('3600초 → 1h 0m', () => {
    expect(formatUptime(3600)).toBe('1h 0m')
  })
  it('3661초 → 1h 1m', () => {
    expect(formatUptime(3661)).toBe('1h 1m')
  })
  it('90061초 → 25h 1m', () => {
    expect(formatUptime(90061)).toBe('25h 1m')
  })
})

describe('wsUrlToHttp', () => {
  it('ws:// → http://', () => {
    expect(wsUrlToHttp('ws://100.1.2.3:3001')).toBe('http://100.1.2.3:3001')
  })
  it('wss:// → https://', () => {
    expect(wsUrlToHttp('wss://100.1.2.3:3001')).toBe('https://100.1.2.3:3001')
  })
  it('http:// 그대로 유지', () => {
    expect(wsUrlToHttp('http://localhost:3001')).toBe('http://localhost:3001')
  })
})
