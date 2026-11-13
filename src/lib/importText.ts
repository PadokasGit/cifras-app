import { isChordLine } from './chords'

export interface ParsedSong {
  title: string
  artist: string
  originalKey: string
  rawText: string
}

const FIRST_CHORD_RE = /\S+/

export function parsePastedText(text: string): ParsedSong {
  let title = 'Sem título'
  let artist = ''
  let lines = text.split('\n')

  // primeira linha no formato "Título - Artista" (e que não seja linha de acordes)
  const first = lines[0]?.replace(/\r$/, '') ?? ''
  const sep = first.indexOf(' - ')
  if (sep > 0 && first.trim() !== '' && !isChordLine(first)) {
    title = first.slice(0, sep).trim() || title
    artist = first.slice(sep + 3).trim()
    lines = lines.slice(1)
    while (lines.length > 0 && lines[0].trim() === '') lines = lines.slice(1)
  }

  const rawText = lines.join('\n')
  const chordLine = lines.find((l) => isChordLine(l.replace(/\r$/, '')))
  let originalKey = ''
  if (chordLine) {
    const tokens = chordLine.trim().split(/\s+/)
    const firstToken = tokens[0].endsWith(':') ? tokens[1] : tokens[0]
    originalKey = firstToken?.match(FIRST_CHORD_RE)?.[0] ?? ''
  }

  return { title, artist, originalKey, rawText: rawText.trim() === '' ? '' : rawText }
}
