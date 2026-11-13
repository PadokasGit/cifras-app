import { useState } from 'react'
import Library from './ui/Library'
import SongView from './ui/SongView'

type Screen = { name: 'library' } | { name: 'song'; id: string }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'library' })
  return (
    <main>
      {screen.name === 'library' && (
        <>
          <h1>Cifras</h1>
          <Library onOpen={(id) => setScreen({ name: 'song', id })} />
        </>
      )}
      {screen.name === 'song' && (
        <SongView songId={screen.id} onBack={() => setScreen({ name: 'library' })} />
      )}
    </main>
  )
}
