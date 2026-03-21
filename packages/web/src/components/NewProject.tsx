import React, { useState } from 'react'

interface NewProjectProps {
  serverUrl: string
  onCreated: (path: string, label: string) => void
  onCancel: () => void
}

type Step = 1 | 2 | 3

type StepStatus = 'waiting' | 'loading' | 'done' | 'failed' | 'skipped'

interface CreationProgress {
  github: StepStatus
  folder: StepStatus
  files: StepStatus
  terminal: StepStatus
}

function isValidName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(name)
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') return <span className="text-teal-400 font-black w-5 text-center">✓</span>
  if (status === 'loading') return <span className="text-white font-black w-5 text-center animate-spin inline-block">⟳</span>
  if (status === 'failed') return <span className="text-rose-400 font-black w-5 text-center">✗</span>
  if (status === 'skipped') return <span className="text-gray-600 font-black w-5 text-center">—</span>
  return <span className="text-gray-600 font-black w-5 text-center">○</span>
}

export function NewProject({ serverUrl, onCreated, onCancel }: NewProjectProps) {
  const [step, setStep] = useState<Step>(1)
  const [description, setDescription] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestSource, setSuggestSource] = useState<'ai' | 'fallback' | null>(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [selectedChip, setSelectedChip] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [githubWarning, setGithubWarning] = useState<string | null>(null)
  const [progress, setProgress] = useState<CreationProgress>({
    github: 'waiting',
    folder: 'waiting',
    files: 'waiting',
    terminal: 'waiting',
  })

  const effectiveName = customName.trim() !== '' ? customName.trim() : (selectedChip ?? '')
  const nameIsValid = effectiveName !== '' && isValidName(effectiveName)

  const handleNextStep1 = async () => {
    if (!description.trim()) return
    setSuggestLoading(true)
    setStep(2)

    try {
      const res = await fetch(`${serverUrl}/api/suggest-names`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })
      const data = await res.json() as { names?: string[]; source?: string }
      if (data.names && data.names.length > 0) {
        setSuggestions(data.names)
        setSelectedChip(data.names[0])
        setSuggestSource(data.source as 'ai' | 'fallback')
      }
    } catch {
      // Fallback: simple local generation
      const words = description.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1).slice(0, 3)
      const base = words.map(w => w.toLowerCase()).join('-') || 'new-project'
      setSuggestions([base, `${base}-app`, `${words[0]?.toLowerCase() || 'project'}-kit`])
      setSelectedChip(base)
      setSuggestSource('fallback')
    } finally {
      setSuggestLoading(false)
    }
  }

  const handleSelectChip = (name: string) => {
    setSelectedChip(name)
    setCustomName('')
  }

  const handleCustomNameChange = (value: string) => {
    setCustomName(value)
    setSelectedChip(null)
  }

  const handleCreate = async () => {
    if (!nameIsValid) return

    setStep(3)
    setError(null)
    setGithubWarning(null)
    setProgress({ github: 'loading', folder: 'waiting', files: 'waiting', terminal: 'waiting' })

    try {
      const res = await fetch(`${serverUrl}/api/new-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: effectiveName,
          description: description,
          private: true,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(text || `HTTP ${res.status}`)
      }

      const data = await res.json() as {
        ok: boolean
        path: string
        repoUrl: string | null
        steps: { github: string; folder: string; files: string }
        githubError: string | null
        hasToken: boolean
      }

      // Map server steps to UI progress
      const ghStatus: StepStatus = !data.hasToken ? 'skipped'
        : data.steps.github === 'done' ? 'done'
        : 'failed'

      if (data.githubError) {
        const msg = data.githubError.includes('403')
          ? 'GitHub 토큰 권한 부족 — Settings → Developer settings → Token에서 repo 권한(Administration: Read & Write)을 추가하세요'
          : data.githubError.includes('422')
          ? '같은 이름의 GitHub 레포가 이미 존재합니다'
          : data.githubError
        setGithubWarning(msg)
      } else if (!data.hasToken) {
        setGithubWarning('GITHUB_TOKEN 미설정 — 로컬에만 생성됨')
      }

      setProgress({
        github: ghStatus,
        folder: data.steps.folder === 'done' ? 'done' : 'failed',
        files: data.steps.files === 'done' ? 'done' : 'failed',
        terminal: 'loading',
      })

      setTimeout(() => {
        setProgress(prev => ({ ...prev, terminal: 'done' }))
        setTimeout(() => {
          onCreated(data.path, effectiveName)
        }, 600)
      }, 500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setProgress({ github: 'failed', folder: 'failed', files: 'failed', terminal: 'failed' })
    }
  }

  const truncateDescription = (text: string, maxLen = 40) => {
    if (text.length <= maxLen) return text
    return text.slice(0, maxLen) + '...'
  }

  // ─── Step 1: 아이디어 입력 ─────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="flex-1 p-6 flex flex-col gap-6 aurora-bg animate-in overflow-y-auto">
        <header className="flex items-center justify-between">
          <button onClick={onCancel} className="p-2 bg-white/5 rounded-xl text-gray-400">←</button>
          <h1 className="text-2xl font-black text-white tracking-tighter">New Project</h1>
          <div className="w-9" />
        </header>

        <div className="flex flex-col gap-4 flex-1">
          <p className="text-gray-400 text-sm leading-relaxed">
            프로젝트 아이디어를 설명하면 Claude가 이름을 제안합니다
          </p>

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={'예) "AI를 활용한 개인 일정 관리 앱. 자연어로 \n일정을 입력하면 자동으로 캘린더에 추가해줌"'}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white text-sm placeholder-gray-600 resize-none h-32 outline-none focus:border-teal-500/50 transition-colors allow-select"
          />
        </div>

        <button
          onClick={handleNextStep1}
          disabled={!description.trim()}
          className="bg-teal-500 text-black font-black px-6 py-3 rounded-xl disabled:opacity-40 transition-opacity self-end"
        >
          다음 →
        </button>
      </div>
    )
  }

  // ─── Step 2: 이름 선택 ────────────────────────────────────────────
  if (step === 2) {
    const nameError = customName.trim() !== '' && !isValidName(customName.trim())
      ? '소문자, 숫자, 하이픈만 사용 가능합니다 (예: my-app-2)'
      : null

    return (
      <div className="flex-1 p-6 flex flex-col gap-6 aurora-bg animate-in overflow-y-auto">
        <header className="flex items-center justify-between">
          <button onClick={() => setStep(1)} className="p-2 bg-white/5 rounded-xl text-gray-400">←</button>
          <h1 className="text-2xl font-black text-white tracking-tighter">이름 선택</h1>
          <div className="w-9" />
        </header>

        <p className="text-gray-500 text-xs font-mono bg-white/5 px-3 py-2 rounded-xl border border-white/5">
          아이디어: &quot;{truncateDescription(description)}&quot;
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              {suggestLoading ? '이름 생성 중...' : suggestSource === 'ai' ? 'Claude 제안' : '제안된 이름'}
            </span>
            {suggestSource === 'ai' && !suggestLoading && (
              <span className="text-[9px] bg-teal-500/20 text-teal-400 border border-teal-500/30 px-1.5 py-0.5 rounded font-bold">AI</span>
            )}
          </div>

          {suggestLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-4 border-white/5 animate-pulse rounded-2xl">
                  <div className="h-4 bg-white/10 rounded w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {suggestions.map(name => (
                <button
                  key={name}
                  onClick={() => handleSelectChip(name)}
                  className={`glass-card p-4 cursor-pointer border transition-all text-left rounded-2xl ${
                    selectedChip === name && customName === ''
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-white/5'
                  }`}
                >
                  <span className="text-white text-xs font-bold break-all">{name}</span>
                  {selectedChip === name && customName === '' && (
                    <p className="text-teal-400 text-[10px] mt-1 font-bold">✓ 선택됨</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">직접 입력</span>
          <input
            type="text"
            value={customName}
            onChange={e => handleCustomNameChange(e.target.value)}
            placeholder={selectedChip ?? suggestions[0] ?? 'my-project'}
            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-sm outline-none focus:border-teal-500/50 transition-colors allow-select placeholder-gray-600"
          />
          {nameError && (
            <p className="text-rose-400 text-xs font-medium">{nameError}</p>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={!nameIsValid || suggestLoading}
          className="bg-teal-500 text-black font-black px-6 py-3 rounded-xl disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
        >
          프로젝트 생성
        </button>
      </div>
    )
  }

  // ─── Step 3: 생성 중 ──────────────────────────────────────────────
  const creationSteps: { key: keyof CreationProgress; label: string }[] = [
    { key: 'github', label: 'GitHub 레포 생성' },
    { key: 'folder', label: '로컬 폴더 생성' },
    { key: 'files', label: '초기 파일 작성 (CLAUDE.md, CURRENT.md)' },
    { key: 'terminal', label: 'Claude Code 세션 연결' },
  ]

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 aurora-bg animate-in overflow-y-auto">
      <header className="flex items-center justify-between">
        <div className="w-9" />
        <h1 className="text-2xl font-black text-white tracking-tighter">
          {error ? '생성 실패' : '생성 중...'}
        </h1>
        <div className="w-9" />
      </header>

      <div className="glass-card p-6 flex flex-col gap-5 border-white/5">
        <p className="text-gray-400 text-sm font-mono truncate">
          <span className="text-teal-400 font-bold">{effectiveName}</span>
        </p>

        <div className="flex flex-col gap-4">
          {creationSteps.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <StepIcon status={progress[key]} />
              <span
                className={`text-sm font-medium transition-colors ${
                  progress[key] === 'done' ? 'text-white'
                    : progress[key] === 'loading' ? 'text-white'
                    : progress[key] === 'failed' ? 'text-rose-400'
                    : progress[key] === 'skipped' ? 'text-gray-600'
                    : 'text-gray-600'
                }`}
              >
                {label}
                {progress[key] === 'skipped' && <span className="text-[10px] ml-2 text-gray-600">(토큰 없음)</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {githubWarning && !error && (
        <div className="glass-card p-4 border-yellow-500/20 bg-yellow-500/5">
          <p className="text-yellow-400 text-xs font-bold">GitHub 알림</p>
          <p className="text-gray-400 text-[11px] mt-1">{githubWarning}</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-3 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 animate-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 text-sm font-black flex-shrink-0">!</div>
            <div>
              <p className="text-rose-400 text-sm font-black">생성 오류</p>
              <p className="text-gray-500 text-[11px] font-medium mt-0.5 break-all">{error}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex-1 py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              재시도
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              뒤로
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
