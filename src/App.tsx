import { useState } from 'react'
import Library from './ui/Library'
import SongView from './ui/SongView'
import Setlists from './ui/Setlists'
import SetlistPlayer from './ui/SetlistPlayer'

type Screen =
  | { name: 'library' }
  | { name: 'song'; id: string }
  | { name: 'setlists' }
  | { name: 'player'; id: string }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'library' })

  if (screen.name === 'song') {
    return (
      <main>
        <SongView songId={screen.id} onBack={() => setScreen({ name: 'library' })} />
      </main>
    )
  }
  if (screen.name === 'player') {
    return (
      <main>
        <SetlistPlayer setlistId={screen.id} onBack={() => setScreen({ name: 'setlists' })} />
      </main>
    )
  }

  return (
    <main>
      <h1>Cifras</h1>
      <nav className="row">
        <button
          className={screen.name === 'library' ? '' : 'ghost'}
          onClick={() => setScreen({ name: 'library' })}
        >
          Biblioteca
        </button>
        <button
          className={screen.name === 'setlists' ? '' : 'ghost'}
          onClick={() => setScreen({ name: 'setlists' })}
        >
          Repertórios
        </button>
      </nav>
      {screen.name === 'library' && (
        <Library onOpen={(id) => setScreen({ name: 'song', id })} />
      )}
      {screen.name === 'setlists' && (
        <Setlists onPlay={(id) => setScreen({ name: 'player', id })} />
      )}
    </main>
  )
}
