import type { ChatMessage, FFUDocument } from '../types'

export async function triggerSummary(): Promise<void> {
  const res = await fetch('/api/summary', { method: 'POST' })
  if (!res.ok) throw new Error('Summary failed')
}

export async function getDocuments(): Promise<FFUDocument[]> {
  const res = await fetch('/api/documents')
  if (!res.ok) throw new Error('Failed to fetch documents')
  return res.json()
}

export async function sendMessage(
  message: string,
  history: ChatMessage[]
): Promise<ChatMessage> {
  const res = await fetch('/api/chatnew', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  })
  if (!res.ok) throw new Error('Chat failed')
  
  const data = await res.json()
  console.log(data)
  const cleanContent = sanitizeResponse(data.answer);
  console.log(cleanContent)
  return {
    id: Date.now().toString(),
    role: 'assistant',
    content: cleanContent,
    sources: data.sources
  }
}

export async function getSummaries(): Promise<FFUDocument[]> {
  const res = await fetch('/api/getsummaries')
  if (!res.ok) throw new Error('Failed to fetch summaries')
  return res.json()
}

function sanitizeResponse(raw: any): string {
  try {
    console.log(raw)
    let text = typeof raw === "string" ? raw : raw?.answer || "";

    return text
      .replace(/\\n/g, "\n")        // fix escaped newlines
      .replace(/\\"/g, '"')         // fix escaped quotes
      .replace(/\n{3,}/g, "\n\n")   // normalize spacing
      .trim();
  } catch (e) {
    console.error("Sanitize failed:", e);
    return "";
  }
}