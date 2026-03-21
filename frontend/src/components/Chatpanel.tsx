import { useState } from 'react'
import type { ChatMessage } from '../types'
import { sendMessage } from '../api/client'
import ReactMarkdown from "react-markdown";

interface Props {
  onSourceClick: (filename: string, quote: string) => void
}

export default function ChatPanel({ onSourceClick }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await sendMessage(input, messages)
      setMessages(prev => [...prev, response])
      console.log(response)
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

  return (
    <div className="h-full flex flex-col"
      style={{ background: 'var(--bg-primary)' }}>

      {/* Messages */}
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

            {/* Bubble */}
            <div
              className="max-w-[85%] px-3 py-2 rounded text-sm leading-relaxed"
              style={{
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              }}>
              <ReactMarkdown>
                {msg.content}
            </ReactMarkdown>
            </div>

            {/* Sources */}
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

        {/* Filename + See Source — shown once */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium truncate"
            style={{ color: 'var(--text-primary)' }}>
            {filename.replace('.pdf', '')}
          </span>
          <button
            onClick={() => onSourceClick(filename, quotes[0])}
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

        {/* All quotes from this file */}
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

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{
                borderColor: 'var(--border)',
                borderTopColor: 'var(--accent)',
              }} />
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
              Thinking...
            </span>
          </div>
        )}
      </div>

      {/* Input */}
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