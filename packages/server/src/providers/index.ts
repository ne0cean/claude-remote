export type ProviderName = 'claude' | 'gemini' | 'shell'

export interface Provider {
  name: ProviderName
  command: string
  args: string[]
}

export const providers: Record<ProviderName, Provider> = {
  claude: {
    name: 'claude',
    command: 'claude',
    args: [],
  },
  gemini: {
    name: 'gemini',
    command: 'gemini',
    args: [],
  },
  shell: {
    name: 'shell',
    command: '/bin/zsh',
    args: [],
  },
}
