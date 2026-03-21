import { useState } from 'react'
import { triggerSummary } from '../api/client'

interface Props {
  onReady: () => void
}

const SUGGESTED_QUESTIONS = [
  'Give me an overview of this project',
  'What are the key deadlines and penalties?',
  'What are the archaeological constraints on this site?',
]

type Stage = 'idle' | 'processing' | 'done'

export default function LandingPage({ onReady }: Props) {
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleStartSummary() {
    setStage('processing')
    setError(null)
    try {
      await triggerSummary()
      setStage('done')
    } catch (e) {
      setError('Failed to process documents. Is the backend running?')
      setStage('idle')
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-10"
      style={{ background: 'var(--bg-primary)' }}>

      {/* Logo / Title */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className="text-5xl font-black tracking-tighter"
            style={{ color: 'var(--text-primary)' }}>
            FFU
          </span>
          <span
            className="text-5xl font-black tracking-tighter"
            style={{ color: 'var(--accent)' }}>
            Analyzer
          </span>
        </div>
        <p className="text-sm tracking-widest uppercase"
          style={{ color: 'var(--text-secondary)' }}>
          Construction's AI-native operating system for bid analysis, cost estimation and procurement.
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-16" style={{ background: 'var(--border)' }} />

      {/* Main action area */}
      {stage === 'idle' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Process documents in <code className="px-1 py-0.5 rounded text-xs"
              style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>
              /data
            </code> to begin
          </p>
          <button
            onClick={handleStartSummary}
            className="btn-primary px-8 py-3 text-sm font-semibold tracking-wide uppercase transition-all duration-150 hover:opacity-90 active:scale-95">
            Start Summary
          </button>
          {error && (
            <p className="text-xs mt-2" style={{ color: 'var(--accent)' }}>
              {error}
            </p>
          )}
        </div>
      )}

      {stage === 'processing' && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <Spinner />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Processing documents...
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Extracting text and generating summaries. This may take a minute.
          </p>
        </div>
      )}

      {stage === 'done' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {/* Success indicator */}
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--accent)' }}>✓</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Documents processed
            </span>
          </div>

          {/* Suggested questions */}
          <div className="w-full flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest mb-1"
              style={{ color: 'var(--text-dim)' }}>
              Try asking
            </p>
            {SUGGESTED_QUESTIONS.map((q) => (
              <div
                key={q}
                className="px-4 py-3 text-sm cursor-default"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}>
                "{q}"
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onReady}
            className="btn-outline w-full py-3 text-sm font-semibold tracking-wide uppercase transition-all duration-150 hover:opacity-90 active:scale-95"
            style={{
              background: 'transparent',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              cursor: 'pointer',
            }}>
            Let's Chat →
          </button>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div
      className="w-4 h-4 rounded-full border-2 animate-spin"
      style={{
        borderColor: 'var(--border)',
        borderTopColor: 'var(--accent)',
      }}
    />
  )
}
