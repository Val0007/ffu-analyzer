import { useState } from 'react'
import { AppState } from './types'
import LandingPage from './components/LandingPage'
import MainView from './components/MainView'

export default function App() {
  const [state, setState] = useState<AppState>('landing')

  return (
    <div className="h-screen w-screen overflow-hidden">
      {state === 'landing' || state === 'processing'
        ? <LandingPage onReady={() => setState('ready')} />
        // ?        <MainView/>
        : <MainView />
      }
    </div>
  )
}