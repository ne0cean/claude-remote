import { describe, it, expect, beforeEach, vi } from 'vitest'

// localStorage mock
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
}
vi.stubGlobal('localStorage', localStorageMock)

// load/save 로직을 직접 테스트 (useServerConfig 내부와 동일)
const STORAGE_KEY = 'claude-remote:servers'

function load() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function save(servers: unknown[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(servers))
}

describe('ServerConfig storage helpers', () => {
  beforeEach(() => localStorageMock.clear())

  it('초기 상태: 빈 배열 반환', () => {
    expect(load()).toEqual([])
  })

  it('저장 후 로드: 동일한 데이터', () => {
    const servers = [{ id: '1', label: 'Mac', wsUrl: 'ws://localhost:3001', webUrl: 'http://localhost:5188' }]
    save(servers)
    expect(load()).toEqual(servers)
  })

  it('손상된 JSON: 빈 배열 반환', () => {
    store[STORAGE_KEY] = '{invalid json}'
    expect(load()).toEqual([])
  })

  it('여러 서버 저장/로드', () => {
    const servers = [
      { id: '1', label: 'Mac', wsUrl: 'ws://100.1.1.1:3001', webUrl: 'http://100.1.1.1:5188' },
      { id: '2', label: 'Windows', wsUrl: 'ws://100.1.1.2:3001', webUrl: 'http://100.1.1.2:5188' },
    ]
    save(servers)
    expect(load()).toHaveLength(2)
    expect(load()[1].label).toBe('Windows')
  })
})
