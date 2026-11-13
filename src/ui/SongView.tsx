import { useEffect, useMemo, useState } from 'react'
import { clampFontSize, getSong, updateSong } from '../lib/db'
import { normalizeSemitones, transposeChord, transposeText } from '../lib/chords'
import { acquireWakeLock } from '../lib/wakeLock'
import type { Accidental, Song } from '../lib/types'

const FONT_STEP = 2

interface Props {
  songId: string
  onBack: () => void
  onPrev?: () => void
  onNext?: () => void
  position?: string
}

export default function SongView({ songId, onBack, onPrev, onNext, position }: Props) {
  const [song, setSong] = useState<Song | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    void getSong(songId).then((s) => {
      if (alive) setSong(s && s.deletedAt === undefined ? s : null)
    })
    return () => {
      alive = false
    }
  }, [songId])

  useEffect(() => {
    let release: (() => void) | undefined
    let cancelled = false
    void acquireWakeLock().then((r) => {
      if (cancelled) r()
      else release = r
    })
    return () => {
      cancelled = true
      release?.()
    }
  }, [])

  const fontSize = song ? clampFontSize(song.fontSize) : 20
  const text = useMemo(
    () => (song ? transposeText(song.rawText, song.semitones, song.accidental) : ''),
    [song],
  )

  if (song === undefined) return null
  if (song === null) {
    return (
      <div>
        <p>Música não encontrada</p>
        <button onClick={onBack}>Voltar</button>
      </div>
    )
  }

  function change(patch: Partial<Pick<Song, 'semitones' | 'fontSize' | 'accidental'>>) {
    setSong((s) => (s ? { ...s, ...patch } : s))
    void updateSong(songId, patch)
  }

  const currentKey = song.originalKey
    ? transposeChord(song.originalKey, song.semitones, song.accidental)
    : '—'

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      /* alguns navegadores móveis não permitem */
    }
  }

  const setAccidental = (accidental: Accidental) => change({ accidental })

  return (
    <div className="stage">
      <header className="row">
        <button className="ghost" onClick={onBack}>
          Voltar
        </button>
        {position && <span>{position}</span>}
        <strong>{song.title}</strong>
        <span>Tom: {currentKey}</span>
      </header>

      <pre aria-label="Cifra" className="cifra" style={{ fontSize: `${fontSize}px` }}>
        {text}
      </pre>

      <footer className="controls">
        {onPrev && <button onClick={onPrev}>Anterior</button>}
        <button aria-label="Descer tom" onClick={() => change({ semitones: normalizeSemitones(song.semitones - 1) })}>
          Tom −
        </button>
        <button aria-label="Subir tom" onClick={() => change({ semitones: normalizeSemitones(song.semitones + 1) })}>
          Tom +
        </button>
        <button aria-label="Bemol" className={song.accidental === 'flat' ? '' : 'ghost'} onClick={() => setAccidental('flat')}>
          ♭
        </button>
        <button aria-label="Sustenido" className={song.accidental === 'sharp' ? '' : 'ghost'} onClick={() => setAccidental('sharp')}>
          ♯
        </button>
        <button aria-label="Diminuir letra" onClick={() => change({ fontSize: clampFontSize(fontSize - FONT_STEP) })}>
          A−
        </button>
        <button aria-label="Aumentar letra" onClick={() => change({ fontSize: clampFontSize(fontSize + FONT_STEP) })}>
          A+
        </button>
        <button aria-label="Tela cheia" className="ghost" onClick={toggleFullscreen}>
          ⛶
        </button>
        {onNext && <button onClick={onNext}>Próxima</button>}
      </footer>
    </div>
  )
}
