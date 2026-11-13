import { useEffect, useState } from 'react'
import Library from './ui/Library'
import SongView from './ui/SongView'
import Setlists from './ui/Setlists'
import SetlistPlayer from './ui/SetlistPlayer'
import Login from './ui/Login'
import { syncNow } from './lib/sync'
import { parseShare } from './lib/share'

const LINK_NOTICE =
  'Você compartilhou só um link. O Cifra Club não deixa o app buscar a cifra sozinho: abra a cifra, selecione o texto, toque em Compartilhar e escolha este app. Ou cole o texto em Importar.'

type Screen =
  | { name: 'library' }
  | { name: 'song'; id: string }
  | { name: 'setlists' }
  | { name: 'player'; id: string }
  | { name: 'account' }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'library' })
  // o que veio do menu Compartilhar do celular (lido uma vez, na abertura)
  const [incoming] = useState(() => {
    const info = parseShare(window.location.search)
    if (info.kind !== 'none') window.history.replaceState({}, '', window.location.pathname)
    return info
  })

  // sincroniza ao abrir e ao voltar o foco; sem login/internet não faz nada
  useEffect(() => {
    void syncNow()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

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

  const tab = (name: 'library' | 'setlists' | 'account', label: string) => (
    <button className={screen.name === name ? '' : 'ghost'} onClick={() => setScreen({ name } as Screen)}>
      {label}
    </button>
  )

  return (
    <main>
      <h1>Cifras</h1>
      <nav className="row">
        {tab('library', 'Biblioteca')}
        {tab('setlists', 'Repertórios')}
        {tab('account', 'Conta')}
      </nav>
      {screen.name === 'library' && (
        <Library
          onOpen={(id) => setScreen({ name: 'song', id })}
          initialImportText={incoming.kind === 'text' ? incoming.text : undefined}
          notice={incoming.kind === 'link' ? LINK_NOTICE : undefined}
        />
      )}
      {screen.name === 'setlists' && <Setlists onPlay={(id) => setScreen({ name: 'player', id })} />}
      {screen.name === 'account' && <Login />}
    </main>
  )
}
