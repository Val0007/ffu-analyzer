import type { ChatMessage, FFUDocument, Source } from '../types'
const API = window.location.hostname === 'localhost' ? '/api' : ''



export async function triggerSummary(
    onProgress: (data: {
        status: string
        filename: string
        processed: number
        failed: number
        total: number
    }) => void,
    onDone: (processed: number, failed: number) => void
): Promise<void> {
    const res = await fetch(`${API}/summary`, { method: 'POST' })
    if (!res.ok) throw new Error('Summary failed')

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value)
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of events) {
            const line = event.trim()
            if (!line.startsWith('data: ')) continue
            try {
                const data = JSON.parse(line.slice(6))
                if (data.status === 'done') {
                    onDone(data.processed, data.failed)
                } else {
                    onProgress(data)
                }
            } catch {
                // skip
            }
        }
    }
}
export async function getDocuments(): Promise<FFUDocument[]> {
    const res = await fetch(`${API}/documents`)
    if (!res.ok) throw new Error('Failed to fetch documents')
    return res.json()
}

export async function sendMessage(
    message: string,
    history: ChatMessage[],
    onToken: (token: string) => void,
    onReading: (filename: string) => void,
    onDone: (sources: Source[]) => void
) {
    const res = await fetch(`${API}/chatnew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history })
    })
    if (!res.ok) throw new Error('Chat failed')
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break //if tcp closes

        buffer += decoder.decode(value)  // append chunk to buffer
        const events = buffer.split('\n\n') //splits when successfully received a full token or filename with \n\n

        //Everything before the last \n\n is a complete event
        //Everything after the last \n\n is either empty or incomplete
        buffer = events.pop() ?? ''


        for (const event of events) {
            const line = event.trim()
            if (!line.startsWith('data: ')) continue

            try {
                const data = JSON.parse(line.slice(6))
                if (data.reading) onReading(data.reading)
                if (data.token) onToken(data.token)
                if (data.done) onDone(data.sources ?? [])
            } catch {
                // genuinely malformed, skip
            }
        }
    }
}

export async function getSummaries(): Promise<FFUDocument[]> {
    const res = await fetch(`${API}/getsummaries`)
    if (!res.ok) throw new Error('Failed to fetch summaries')
    return res.json()
}
