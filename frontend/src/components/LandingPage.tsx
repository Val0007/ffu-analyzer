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

interface FileProgress {
    filename: string
    status: 'processing' | 'ok' | 'failed'
}

export default function LandingPage({ onReady }: Props) {
    const [stage, setStage] = useState<Stage>('idle')
    const [error, setError] = useState<string | null>(null)
    const [files, setFiles] = useState<FileProgress[]>([])
    const [counts, setCounts] = useState({ processed: 0, failed: 0, total: 0 })

    async function handleStartSummary() {
        setStage('processing')
        setError(null)
        setFiles([])

        try {
            await triggerSummary(
                //for progress
                (data) => {
                    setCounts({
                        processed: data.processed,
                        failed: data.failed,
                        total: data.total
                    })
                    setFiles(prev => [...prev, {
                        filename: data.filename,
                        status: data.status as 'ok' | 'failed'
                    }])
                },
                //on done move to chat page
                (processed, failed) => {
                    setStage('done')
                }
            )
        } catch (e) {
            setError('Failed to process documents. Is the backend running?')
            setStage('idle')
        }
    }

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center gap-10"
            style={{ background: 'var(--bg-primary)' }}>

            <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-5xl font-black tracking-tighter"
                        style={{ color: 'var(--text-primary)' }}>FFU</span>
                    <span className="text-5xl font-black tracking-tighter"
                        style={{ color: 'var(--accent)' }}>Analyzer</span>
                </div>
                <p className="text-sm tracking-widest uppercase"
                    style={{ color: 'var(--text-secondary)' }}>
                    Construction's AI-native operating system for bid analysis, cost estimation and procurement.
                </p>
            </div>

            <div className="w-px h-16" style={{ background: 'var(--border)' }} />

            {stage === 'idle' && (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Process documents in{' '}
                        <code className="px-1 py-0.5 rounded text-xs"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>
                            /data
                        </code>{' '}
                        to begin
                    </p>
                    {/* <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Takes 4-5 min to finish</p> */}
                    {/* <button onClick={handleStartSummary} className="btn-primary px-8 py-3 text-sm font-semibold tracking-wide uppercase">
                        Start Chatting
                    </button> */}
                    <button onClick={onReady} className="btn-primary px-8 py-3 text-sm font-semibold tracking-wide uppercase">
                        Start Chatting (Docs were processed already!)
                    </button>
                    {error && <p className="text-xs" style={{ color: 'var(--accent)' }}>{error}</p>}
                </div>
            )}

            {stage === 'processing' && (
                <div className="flex flex-col items-center gap-4 w-full max-w-md">

                    <div className="w-full flex flex-col gap-2">
                        <div className="flex justify-between text-xs"
                            style={{ color: 'var(--text-secondary)' }}>
                            <span>Processing documents...(working)</span>
                            <span>{counts.processed}/{counts.total}</span>
                        </div>
                        <div className="w-full h-1 rounded-full overflow-hidden"
                            style={{ background: 'var(--bg-elevated)' }}>
                            <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                    background: 'var(--accent)',
                                    width: counts.total > 0
                                        ? `${(counts.processed / counts.total) * 100}%`
                                        : '0%'
                                }} />
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-1 h-48 overflow-y-auto">
                        {files.map(f => (
                            <div key={f.filename}
                                className="flex items-center gap-2 text-xs px-2 py-1 rounded"
                                style={{ background: 'var(--bg-elevated)' }}>
                                <span style={{
                                    color: f.status === 'ok' ? '#22c55e' :
                                        f.status === 'failed' ? 'var(--accent)' :
                                            'var(--text-dim)'
                                }}>
                                    {f.status === 'ok' ? 'processed' : 'failed'}
                                </span>
                                <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                                    {f.filename}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {stage === 'done' && (
                <div className="flex flex-col items-center gap-6 w-full max-w-md">
                    <div className="flex items-center gap-2">
                        <span style={{ color: '#22c55e' }}>✓</span>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {counts.processed} documents processed
                            {counts.failed > 0 && ` · ${counts.failed} failed`}
                        </span>
                    </div>

                    <div className="w-full flex flex-col gap-2">
                        <p className="text-xs uppercase tracking-widest mb-1"
                            style={{ color: 'var(--text-dim)' }}>
                            Try asking
                        </p>
                        {SUGGESTED_QUESTIONS.map((q) => (
                            <div key={q}
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

                    <button onClick={onReady} className="btn-outline w-full py-3 text-sm font-semibold tracking-wide uppercase">
                        Let's Chat →
                    </button>
                </div>
            )}
        </div>
    )
}