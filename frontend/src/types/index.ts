export interface Source {
  filename: string
  quotes: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

export interface Document {
  filename: string
  document_type: string
  summary: string
  revision_date?: string | null
  supersedes?: string | null
  use_for: string[]
  do_not_use_for: string[]
  topics: string[]
  key_facts: { fact: string; source_section: string }[]
  revision?: {
    version: string | null
    date: string | null
    supersedes: string | null
  }
}

export type AppState = 'landing' | 'processing' | 'ready'