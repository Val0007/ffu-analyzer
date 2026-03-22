import { useEffect, useState } from 'react'
import { ResizableBox } from 'react-resizable'
import Sidebar from './Sidebar'
import { getSummaries } from '../api/client'
import { FFUDocument } from '../types'
import ChatPanel from './Chatpanel'
import DocumentContent from './DocumentContent'

export default function MainView() {

    const [activeDocument, setActiveDocument] = useState<string | null>(null)
    const [documents, setDocuments] = useState<FFUDocument[]>([])
    const [highlightQuotes, setHighlightQuotes] = useState<string[]>([])
    const [isDragging, setIsDragging] = useState(false)


    useEffect(() => {
        getSummaries().then(res => setDocuments(res))
    }, [])

    function handleSourceClick(filename: string, quotes: string[]) {
        setActiveDocument(filename)
        setHighlightQuotes(quotes)
    }

    return (
        <div className="h-screen w-screen flex overflow-hidden"
            style={{ background: 'var(--bg-primary)' }}>

            <Sidebar
                documents={documents}
                activeDocument={activeDocument}
                onDocumentSelect={(filename) => {
                    setActiveDocument(filename)
                    setHighlightQuotes(null)
                }}
            />


            <ResizableBox
                width={700}
                axis="x"
                minConstraints={[300, Infinity]}
                maxConstraints={[1200, Infinity]}
                resizeHandles={['e']}
                onResizeStart={() => setIsDragging(true)}
                onResizeStop={() => setIsDragging(false)}
                className={isDragging ? 'is-dragging' : ''} //changes resizing icon color during drag
            >
                <div className="h-full w-full overflow-hidden"
                    style={{ borderRight: '1px solid var(--border)' }}>
                    {activeDocument ? (
                        <DocumentContent
                            filename={activeDocument}
                            highlightQuotes={highlightQuotes}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                                Select a document or click "See source"
                            </p>
                        </div>
                    )}

                </div>
            </ResizableBox>

            <div className="flex-1 h-full overflow-hidden">
                <ChatPanel
                    onSourceClick={handleSourceClick}
                />
            </div>

        </div>
    )
}