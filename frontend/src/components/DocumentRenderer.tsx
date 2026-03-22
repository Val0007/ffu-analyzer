import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { useEffect, useRef, useState } from 'react'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface Props {
  filename: string | null
  highlightQuote: string | null
}

export default function DocumentViewer({ filename, highlightQuote }: Props) {
  const [numPages, setNumPages] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
const [containerWidth, setContainerWidth] = useState(0)
const [highlightIndex, setHighlightIndex] = useState(0)
const markRefs = useRef<HTMLElement[]>([])
const [markCount, setMarkCount] = useState<number>(0)


useEffect(() => {
  if (!containerRef.current) return
  const observer = new ResizeObserver(entries => {
    setContainerWidth(entries[0].contentRect.width)
  })
  observer.observe(containerRef.current)
  return () => observer.disconnect()
}, [])

useEffect(() => {
      setHighlightIndex(0)
  setMarkCount(0)
  markRefs.current = []
  if (!highlightQuote) return
  
  let attempts = 0
  const maxAttempts = 10
  
  const tryFindMarks = () => {
    const marks = Array.from(document.querySelectorAll('mark')) as HTMLElement[]
    console.log(marks)
    if (marks.length > 0) {
      markRefs.current = marks
      setMarkCount(marks.length)
      return
    }
    
    attempts++
    if (attempts < maxAttempts) {
      setTimeout(tryFindMarks, 500)  // retry every 500ms
      marks[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  
  setTimeout(tryFindMarks, 500)  // first attempt after 500ms
  
}, [highlightQuote, filename])


function scrollToNext() {
  const marks = Array.from(document.querySelectorAll('mark')) as HTMLElement[]
  if (!marks.length) return
  
  const next = (highlightIndex + 1) % marks.length
  setHighlightIndex(next)
  setMarkCount(marks.length)
  
  marks[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
  return (
    // observer observes the element ref points to for changing dimensions
    <div ref={containerRef} className="h-full overflow-y-auto">  

    

      {!filename ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
            Select a document to view
          </p>
        </div>
      ) : (

        <div>
        {markCount > 0 && (
        <button
        onClick={scrollToNext}
        className="sticky top-4 left-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:opacity-80"
        style={{
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          float: 'right',
          marginRight: '12px',
        }}>
        ↓ {highlightIndex + 1}/{markCount}
      </button>
        )}


                <Document
          file={`/files/${encodeURIComponent(filename)}`}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
          {Array.from({ length: numPages }, (_, i) => (
            <Page
              key={i + 1}
              pageNumber={i + 1}
            width={containerWidth || undefined}  // need to measure container
customTextRenderer={({ str }) => {
  if (!highlightQuote || !str.trim() || str.trim().length < 8) return str
  
  // normalize both strings for comparison
  const normalizedStr = str.trim().toLowerCase()
  const normalizedQuote = highlightQuote.toLowerCase()
  
  if (normalizedQuote.includes(normalizedStr)) {
    return `<mark style="background: rgba(255,30,0,0.3); color: inherit; font-weight: bold;">${str}</mark>`
  }
  return str
}}
            />
          ))}
        </Document>

        </div>





        
      )}
    </div>
  )
}