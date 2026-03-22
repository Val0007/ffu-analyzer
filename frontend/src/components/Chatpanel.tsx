import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, Source } from '../types'
import { sendMessage } from '../api/client'
import ReactMarkdown from "react-markdown";

interface Props {
    onSourceClick: (filename: string, quote: string[]) => void
}

export default function ChatPanel({ onSourceClick }: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const [streamingContent, setStreamingContent] = useState('')
    const [streamingSources, setStreamingSources] = useState<Source[]>([])
    const [readingFile, setReadingFile] = useState<string | null>(null)
    const streamingRef = useRef('')
    const messagesEndRef = useRef<HTMLDivElement>(null)


    async function handleSend() {
        if (!input.trim() || loading) return

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        }

        //if setstate is not immediately done , then gpt history might not be consistent
        const history = streamingContent
            ? [
                ...messages,
                {
                    id: Date.now().toString(),
                    role: 'assistant' as const,
                    content: streamingContent,
                    sources: streamingSources
                },
                userMessage
            ]
            : [...messages, userMessage]

        const completedContent = streamingContent
        const completedSources = streamingSources
        setStreamingContent('')
        setStreamingSources([])
        setReadingFile(null)
        streamingRef.current = ''

        //add both last streamed and current user message to state
        setMessages(prev => {
            const next = [...prev]
            if (completedContent) {
                next.push({
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: completedContent,
                    sources: completedSources,
                })
            }
            next.push(userMessage)
            return next
        })

        setInput('')
        setLoading(true)

        try {
            const response = await sendMessage(input, history,
                (token) => {
                    if (!streamingRef.current) setReadingFile(null) //clear reading files render
                    streamingRef.current += token
                    //before sources arrives , render answer , if sources come in - stop render 
                    //stop <|sources|> from displaying in the stream , as they might arrive in chunks , just strip them
                    if (!streamingRef.current.includes('<|')) {
                        setStreamingContent(streamingRef.current)
                    } else {
                        // show everything before <|, strip the delimiter
                        const idx = streamingRef.current.indexOf('<|')
                        setStreamingContent(streamingRef.current.slice(0, idx).trimEnd())
                    }
                },
                (filename) => {
                    // setLoading(false)
                    setReadingFile(filename)
                },
                (sources) => {
                    const parts = streamingRef.current.split('<|SOURCES|>')
                    setStreamingContent(parts[0].trim())
                    setStreamingSources(sources)
                    setReadingFile(null)
                    setLoading(false)
                }
            )
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, streamingContent, streamingSources])

    return (
        <div className="h-full flex flex-col"
            style={{ background: 'var(--bg-primary)' }}>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {messages.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                            Ask anything about the documents
                        </p>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id}
                        className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                        <div
                            className="max-w-[85%] px-3 py-2 rounded text-sm leading-relaxed"
                            style={{
                                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                                color: 'var(--text-primary)',
                                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                            }}>
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 flex flex-col gap-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 flex flex-col gap-1">{children}</ol>,
                                    li: ({ children }) => <li className="text-sm">{children}</li>,
                                    strong: ({ children }) => <strong style={{ color: 'var(--text-primary)' }}>{children}</strong>,
                                }}>
                                {msg.content}
                            </ReactMarkdown>
                        </div>

                        {msg.sources && msg.sources.length > 0 && (
                            <div className="flex flex-col gap-3 max-w-[85%]">
                                {Object.entries(
                                    msg.sources.reduce((acc, source) => {
                                        if (!acc[source.filename]) acc[source.filename] = []
                                        acc[source.filename].push(...source.quotes)
                                        return acc
                                    }, {} as Record<string, string[]>)
                                ).map(([filename, quotes]) => (
                                    <div
                                        key={filename}
                                        className="flex flex-col gap-2 px-3 py-2 rounded"
                                        style={{
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--accent)',
                                        }}>

                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium truncate"
                                                style={{ color: 'var(--text-primary)' }}>
                                                {filename.replace('.pdf', '')}
                                            </span>
                                            <button
                                                onClick={() => onSourceClick(filename, quotes)}
                                                className="text-xs px-2 py-0.5 rounded shrink-0 hover:opacity-80"
                                                style={{
                                                    background: 'var(--accent)',
                                                    color: 'white',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                }}>
                                                See source
                                            </button>
                                        </div>

                                        {quotes.map((quote, i) => (
                                            <p key={i} className="text-xs leading-relaxed italic"
                                                style={{ color: 'var(--text-secondary)' }}>
                                                "{quote}"
                                            </p>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {readingFile && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border-2 animate-spin"
                            style={{
                                borderColor: 'var(--border)',
                                borderTopColor: 'var(--accent)',
                            }} />
                        <span className="text-xs" style={{ color: 'white' }}>
                            Reading {readingFile.replace('.pdf', '')}...
                        </span>
                    </div>
                )}

                {(streamingContent || streamingSources.length > 0) && (
                    <div className="flex flex-col items-start gap-2">
                        {streamingContent && (
                            <div
                                className="max-w-[85%] px-3 py-2 rounded text-sm leading-relaxed "
                                style={{
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border)',
                                }}>

                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 flex flex-col gap-1">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 flex flex-col gap-1">{children}</ol>,
                                        li: ({ children }) => <li className="text-sm">{children}</li>,
                                    }}>
                                    {streamingContent}
                                </ReactMarkdown>
                                {loading && (
                                    <span className="animate-pulse ml-0.5"
                                        style={{ color: 'var(--accent)' }}>
                                        |
                                    </span>
                                )}
                            </div>
                        )}

                        {streamingSources.length > 0 && (
                            <div className="flex flex-col gap-3 max-w-[85%]">
                                {Object.entries(
                                    streamingSources.reduce((acc, source) => {
                                        if (!acc[source.filename]) acc[source.filename] = []
                                        acc[source.filename].push(...source.quotes)
                                        return acc
                                    }, {} as Record<string, string[]>)
                                ).map(([filename, quotes]) => (
                                    <div
                                        key={filename}
                                        className="flex flex-col gap-2 px-3 py-2 rounded"
                                        style={{
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--accent)',
                                        }}>

                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium truncate"
                                                style={{ color: 'var(--text-primary)' }}>
                                                {filename.replace('.pdf', '')}
                                            </span>
                                            <button
                                                onClick={() => onSourceClick(filename, quotes)}
                                                className="text-xs px-2 py-0.5 rounded shrink-0 hover:opacity-80"
                                                style={{
                                                    background: 'var(--accent)',
                                                    color: 'white',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                }}>
                                                See source
                                            </button>
                                        </div>

                                        {quotes.map((quote, i) => (
                                            <p key={i} className="text-xs leading-relaxed italic"
                                                style={{ color: 'var(--text-secondary)' }}>
                                                "{quote}"
                                            </p>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {/* //scroll to the bottom on each message */}
                <div ref={messagesEndRef} />
            </div>

            {loading && (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 animate-spin"
                        style={{
                            borderColor: 'var(--border)',
                            borderTopColor: 'var(--accent)',
                        }} />
                    <span className="text-xs" style={{ color: 'white' }}>
                        Thinking...
                    </span>
                </div>
            )}

            <div className="p-4"
                style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex gap-2">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about the documents..."
                        rows={2}
                        className="flex-1 resize-none rounded px-3 py-2 text-sm outline-none"
                        style={{
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                        }} />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="px-4 py-2 text-sm font-semibold rounded transition-all duration-150 disabled:opacity-40"
                        style={{
                            background: 'var(--accent)',
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            border: 'none',
                        }}>
                        Send
                    </button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>
                    Enter to send · Shift+Enter for new line
                </p>
            </div>
        </div>
    )
}