import { useCallback, useEffect, useState } from 'react'
import { listSongs } from '../lib/db'
import type { Song } from '../lib/types'
import ImportDialog from './ImportDialog'

export default function Library({
  onOpen,
  initialImportText,
  notice,
}: {
  onOpen: (id: string) => void
  initialImportText?: string
  notice?: string
}) {
  const [songs, setSongs] = useState<Song[] | null>(null)
  const [query, setQuery] = useState('')
  const [importing, setImporting] = useState(initialImportText !== undefined)
  const [showNotice, setShowNotice] = useState(!!notice)

  const reload = useCallback(async () => setSongs(await listSongs()), [])
  useEffect(() => {
    void reload()
  }, [reload])

  const q = query.trim().toLocaleLowerCase('pt-BR')
  const shown = (songs ?? []).filter(
    (s) =>
      q === '' ||
      s.title.toLocaleLowerCase('pt-BR').includes(q) ||
      s.artist.toLocaleLowerCase('pt-BR').includes(q),
  )

  if (importing) {
    return (
      <ImportDialog
        initialText={initialImportText}
        onCancel={() => setImporting(false)}
        onSaved={async () => {
          setImporting(false)
          await reload()
        }}
      />
    )
  }

  return (
    <section>
      {showNotice && (
        <p className="notice" role="status">
          {notice}{' '}
          <button className="ghost" onClick={() => setShowNotice(false)}>
            Entendi
          </button>
        </p>
      )}
      <div className="row">
        <input
          placeholder="Buscar"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={() => setImporting(true)}>Importar</button>
      </div>
      {songs !== null && songs.length === 0 && <p className="muted">Nenhuma cifra ainda</p>}
      <ul className="list">
        {shown.map((s) => (
          <li key={s.id}>
            <button className="item" onClick={() => onOpen(s.id)}>
              <span>{s.title}</span>
              <small>{s.artist}</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
