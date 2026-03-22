import { useState, useEffect, useRef, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
interface Props {
    filename: string
    highlightQuotes: string[] | null
}

const API = window.location.hostname === 'localhost' ? '/api' : ''


const normalizeText = (text: string) => text
    .replace(/<br\s*\/?>/gi, ' ')  // replace <br> with space
    .replace(/[•·▪▸]/g, '-')      // normalize bullets
    .trim()
    .split(/\s+/)
    .join(' ')

const cleanContent = (raw: string) => raw
    // remove picture omission lines
    .replace(/==> picture.*?<==\n?/g, '')
    // remove the repeated page header tables (DOKUMENT, STATUS, PROJEKT etc)
    .replace(/\|DOKUMENT.*?\|BET\.\|[\s\S]*?\n\n/g, '')
    // remove table of contents dot leaders
    .replace(/\.{4,}/g, '')
    // remove excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()

export default function DocumentContent({ filename, highlightQuotes }: Props) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [markCount, setMarkCount] = useState(0)
    const [markIndex, setMarkIndex] = useState(0)

    useEffect(() => {
        const controller = new AbortController()
        setLoading(true)

        fetch(`${API}/document?filename=${encodeURIComponent(filename)}`, {
            signal: controller.signal
        })
            .then(r => r.json())
            .then(data => setContent(data.content))
            .catch(e => {
                if (e.name === 'AbortError') return // ignore cancelled requests
                console.error(e)
            })
            .finally(() => setLoading(false))

        // cleanup — cancel if filename changes before fetch completes
        return () => controller.abort()
    }, [filename])

    const highlighted = useMemo(() => {
        if (loading) return ''
        if (highlightQuotes == null) return content
        if (!highlightQuotes.length || !content) return content

        let result = normalizeText(content)

        highlightQuotes.forEach(quote => {
            if (!quote.trim()) return

            const normalizedQuote = normalizeText(quote)
            console.log('searching for:', JSON.stringify(normalizedQuote))
            console.log('found:', result.includes(normalizedQuote))

            result = result.split(normalizedQuote).join(
                `<mark style="background: rgba(255,30,0,0.35); font-weight: bold; color: white;">${normalizedQuote}</mark>`
            )
        })
        return result
    }, [content, highlightQuotes,loading])

    useEffect(() => {
        if (highlightQuotes == null) return
        if (!highlightQuotes.length) {
            setMarkCount(0)
            return
        }
        setTimeout(() => {
            const marks = Array.from(containerRef.current?.querySelectorAll('mark') ?? [])
            setMarkCount(marks.length)
            setMarkIndex(0)
            marks[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
    }, [highlighted])


    function scrollToNext() {
        //calc mark everytime on demand -> cause we need location to the current scroll ?
        const marks = Array.from(containerRef.current?.querySelectorAll('mark') ?? []) as HTMLElement[]
        if (!marks.length) return
        const next = (markIndex + 1) % marks.length //circular 
        setMarkIndex(next)
        marks[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    if (loading) return (
        <div className="flex items-center gap-2 p-6">
            <div className="w-4 h-4 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                Loading...
            </span>
        </div>
    )



    return (
        <div
            ref={containerRef}
            className="h-full overflow-y-auto"
            style={{ padding: '32px 40px' }}>

            <p className="text-xs uppercase tracking-widest mb-6"
                style={{ color: 'white' }}>
                {filename} (This is a markdown version of the file)
            </p>

            <ReactMarkdown
                rehypePlugins={[rehypeRaw]}
                //   className="prose prose-invert prose-sm max-w-none"
                components={{
                    p: ({ children }) => (
                        <p className="mb-4 leading-7 text-sm"
                            style={{ color: 'var(--text-secondary)' }}>
                            {children}
                        </p>
                    ),
                    h1: ({ children }) => (
                        <h1 className="text-base font-bold mb-4 mt-8 pb-2"
                            style={{
                                color: 'var(--text-primary)',
                                borderBottom: '1px solid var(--border)'
                            }}>
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-sm font-bold mb-3 mt-6"
                            style={{ color: 'var(--text-primary)' }}>
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-sm font-semibold mb-2 mt-4"
                            style={{ color: 'var(--accent)' }}>
                            {children}
                        </h3>
                    ),
                    ul: ({ children }) => (
                        <ul className="mb-4 flex flex-col gap-1.5 pl-4 list-disc">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="mb-4 flex flex-col gap-1.5 pl-4 list-decimal">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-sm leading-6"
                            style={{ color: 'var(--text-secondary)' }}>
                            {children}
                        </li>
                    ),
                    strong: ({ children }) => (
                        <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {children}
                        </strong>
                    ),
                    table: ({ children }) => (
                        <div className="mb-6 overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                {children}
                            </table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="text-left px-3 py-2 text-xs font-semibold"
                            style={{
                                borderBottom: '2px solid var(--accent)',
                                color: 'var(--text-primary)',
                                background: 'var(--bg-elevated)'
                            }}>
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-3 py-2 text-xs"
                            style={{
                                borderBottom: '1px solid var(--border)',
                                color: 'var(--text-secondary)'
                            }}>
                            {children}
                        </td>
                    ),
                    code: ({ children }) => (
                        <code className="px-1.5 py-0.5 rounded text-xs"
                            style={{
                                background: 'var(--bg-elevated)',
                                color: 'var(--accent)'
                            }}>
                            {children}
                        </code>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="pl-4 my-4 italic text-sm"
                            style={{
                                borderLeft: '2px solid var(--accent)',
                                color: 'var(--text-secondary)'
                            }}>
                            {children}
                        </blockquote>
                    ),
                }}>
                {highlighted}
            </ReactMarkdown>

            {markCount > 0 && (
                <div className="sticky bottom-6 flex justify-end pointer-events-none">
                    <button
                        onClick={scrollToNext}
                        className="pointer-events-auto flex items-center justify-center gap-1 rounded-full text-xs font-semibold shadow-lg transition-all hover:opacity-80 active:scale-95"
                        style={{
                            bottom: '24px',
                            right: '10px',
                            width: '28px',
                            height: '28px',
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            zIndex: 50,
                        }}>
                        ↓
                    </button>
                </div>
            )}

        </div>
    )
}