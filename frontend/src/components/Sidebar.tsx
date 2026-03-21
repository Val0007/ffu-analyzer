import { useState } from 'react'
import { FFUDocument } from '../types'

interface Props {
      documents: FFUDocument[]
  activeDocument: string | null
  onDocumentSelect: (filename: string) => void
}

export default function Sidebar({ activeDocument, onDocumentSelect,documents }: Props) {
  const [open, setOpen] = useState(false)
  const [hoveredFile, setHoveredFile] = useState<string | null>(null)
  const [tooltipTop, setTooltipTop] = useState(0)

  function handleMouseEnter(e: React.MouseEvent, filename: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const tooltipHeight = 600
    //this will never go below , will always have 600px of space
    const spaceBelow = window.innerHeight - rect.top
    if(spaceBelow < tooltipHeight){
        const top = window.innerHeight - tooltipHeight
        setTooltipTop(top)
    }
    else{
         setTooltipTop(rect.top)
    }
    setHoveredFile(filename)
  }

  function handleMouseLeave() {
    setHoveredFile(null)
  }

  const hoveredMeta = documents.find(f => f.filename === hoveredFile)

  return (
    <>
      <div
        className="h-full flex flex-col shrink-0"
        style={{
          width: open ? '260px' : '48px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          transition: 'width 0.2s ease',
        }}>

        {/* Icon rail */}
        <div className='flex flex-row items-center pt-4'>
        <div className="w-12 h-full flex items-center justify-center">
          <button
            onClick={() => setOpen(p => !p)}
            className="w-8 h-8 flex items-center justify-center rounded transition-all duration-150 text-2xl"
            style={{
              background: open ? 'var(--accent-dim)' : 'transparent',
              border: open ? '1px solid var(--accent)' : '1px solid var(--border)',
              color: open ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
            title={open ? 'Collapse' : 'Expand'}>
            {open ? '←' : '☰'}
          </button>
           </div>
          {open ? 
          <div className=' w-full pl-2'>
            <p
    className="w-full h-full flex text-xs uppercase tracking-widest "
    style={{ color: 'var(--text-dim)' }}>
    Documents
            </p>
          </div>

            : null
         }

        </div>


        {/* Expanded content */}
        {open && (
          <div className="flex-1 flex flex-col overflow-hidden pt-4 pr-3">

            <div className="flex-1 overflow-y-auto flex flex-col gap-1 px-3 pb-4">
              {documents.map((doc) => {
                const isActive = activeDocument === doc.filename
                return (
                  <button
                    key={doc.filename}
                    onClick={() => onDocumentSelect(doc.filename)}
                    onMouseEnter={(e) => handleMouseEnter(e, doc.filename)}
                    onMouseLeave={handleMouseLeave}
                    className="doc-item w-full text-left px-2 py-2 rounded  transition-all duration-100 text-sm"
                    style={{
                      background: isActive ? 'var(--accent-dim)' : 'transparent',
                      color: isActive ? 'white' : 'var(--text-secondary)',
                      border: isActive ? '1px solid var(--accent) !important ' : '1px solid transparent',
                      cursor: 'pointer',
                      
                    }}
                   >
                    {doc.filename}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {open && hoveredFile && hoveredMeta && (
        <div
          className="fixed z-50 w-72 p-4 flex flex-col gap-3 pointer-events-none"
          style={{
            top: tooltipTop,
            left: '260px', //end of sidebar
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderLeft: '2px solid var(--accent)',
            borderRadius: '10px',
          }}>

          {/* Filename */}
          <p className="text-xs font-semibold leading-relaxed"
            style={{ color: 'var(--text-primary)' }}>
            {hoveredMeta.filename}
          </p>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border)' }} />

          {/* Summary */}
          <p className="text-xs leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}>
            {hoveredMeta.summary}
          </p>

          {/* Use for */}
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-widest mb-1"
              style={{ color: 'var(--text-dim)' }}>
              Used for
            </p>
            {hoveredMeta.use_for.slice(0, 3).map(u => (
              <p key={u} className="text-xs"
                style={{ color: 'var(--text-secondary)' }}>
                · {u}
              </p>
            ))}
          </div>

          {/* Key facts */}
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-widest mb-1"
              style={{ color: 'var(--text-dim)' }}>
              Key points
            </p>
            {hoveredMeta.key_facts.slice(0, 2).map(f => (
              <p key={f.fact} className="text-xs"
                style={{ color: 'var(--text-secondary)' }}>
                · {f.fact}
              </p>
            ))}
          </div>
        </div>
      )}
    </>
  )
}