import { useEffect, useState } from 'react'
import { ResizableBox } from 'react-resizable'
import Sidebar from './Sidebar'
import { getSummaries } from '../api/client'
import { FFUDocument } from '../types'
import ChatPanel from './Chatpanel'


export default function MainView() {

    const [activeDocument, setActiveDocument] = useState<string | null>(null)
    const [documents, setDocuments] = useState<FFUDocument[]>([])

useEffect(() => {
   getSummaries().then(res => setDocuments(res))
}, [])


  return (
    <div className="h-screen w-screen flex overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}>

<Sidebar
 documents={documents}
  activeDocument={activeDocument}
  onDocumentSelect={setActiveDocument}
/>


      {/* Document Viewer — resizable */}
      <ResizableBox
        width={700}
        axis="x"
        minConstraints={[300, Infinity]}
        maxConstraints={[1200, Infinity]}
        resizeHandles={['e']}
        >
        <div className="h-full w-full overflow-hidden"
          style={{ borderRight: '1px solid var(--border)' }}>
          {/* DocumentViewer goes here */}
        </div>
      </ResizableBox>

      {/* Chat Panel — takes remaining space */}
      <div className="flex-1 h-full overflow-hidden">
        <ChatPanel
  onSourceClick={(filename, quote) => {
    const doc = documents.find(d => d.filename === filename)
    if (doc) setActiveDocument(doc.filename)
    // setHighlightQuote(quote)
  }}
/>
      </div>

    </div>
  )
}