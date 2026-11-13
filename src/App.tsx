import { useState } from 'react'
import Library from './ui/Library'

type Screen = { name: 'library' } | { name: 'song'; id: string }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'library' })
  return (
    <main>
      <h1>Cifras</h1>
      {screen.name === 'library' && (
        <Library onOpen={(id) => setScreen({ name: 'song', id })} />
      )}
    </main>
  )
}
