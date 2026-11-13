import { useEffect, useState } from 'react'
import { getSetlist, listSongs } from '../lib/db'
import SongView from './SongView'

export default function SetlistPlayer({
  setlistId,
  onBack,
}: {
  setlistId: string
  onBack: () => void
}) {
  const [ids, setIds] = useState<string[] | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let alive = true
    void (async () => {
      const [l, songs] = await Promise.all([getSetlist(setlistId), listSongs()])
      const existing = new Set(songs.map((s) => s.id))
      if (alive) setIds((l?.songIds ?? []).filter((id) => existing.has(id)))
    })()
    return () => {
      alive = false
    }
  }, [setlistId])

  if (ids === null) return null
  if (ids.length === 0) {
    return (
      <div>
        <p>Repertório vazio</p>
        <button onClick={onBack}>Voltar</button>
      </div>
    )
  }

  return (
    <SongView
      key={ids[index]}
      songId={ids[index]}
      onBack={onBack}
      position={`${index + 1}/${ids.length}`}
      onPrev={() => setIndex((i) => Math.max(0, i - 1))}
      onNext={() => setIndex((i) => Math.min(ids.length - 1, i + 1))}
      prevDisabled={index === 0}
      nextDisabled={index === ids.length - 1}
    />
  )
}
