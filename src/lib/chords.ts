import type { Accidental } from './types'

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

// raiz + sufixo (só construções conhecidas, para não confundir palavras com acordes) + baixo opcional
const SUFFIX = '(?:maj|min|dim|aug|sus|add|m|M|\\+|°|ø|-|\\d|\\(|\\)|#|b|,)*'
const CHORD_RE = new RegExp(`^([A-G][#b]?)(${SUFFIX})(?:/([A-G][#b]?|\\d+))?$`)

// tokens que podem aparecer em linhas de acordes sem serem acordes
const FILLER_RE = /^(?:[|\\/-]+|\(?x?\d+x?\)?)$/

export function normalizeSemitones(n: number): number {
  return ((n % 12) + 12) % 12
}

function noteIndex(note: string): number {
  const base = NATURAL[note[0]]
  const mod = note[1] === '#' ? 1 : note[1] === 'b' ? -1 : 0
  return normalizeSemitones(base + mod)
}

function transposeNote(note: string, semitones: number, prefer: Accidental): string {
  const table = prefer === 'flat' ? FLAT : SHARP
  return table[normalizeSemitones(noteIndex(note) + semitones)]
}

export function transposeChord(chord: string, semitones: number, prefer: Accidental): string {
  const m = CHORD_RE.exec(chord)
  if (!m) return chord
  const [, root, suffix, bass] = m
  let out = transposeNote(root, semitones, prefer) + suffix
  if (bass !== undefined) {
    out += '/' + (/^\d+$/.test(bass) ? bass : transposeNote(bass, semitones, prefer))
  }
  return out
}

function isChord(token: string): boolean {
  return CHORD_RE.test(token)
}

function tokenize(line: string): { text: string; col: number }[] {
  const tokens: { text: string; col: number }[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) tokens.push({ text: m[0], col: m.index })
  return tokens
}

/** Tokens da linha sem o rótulo inicial ("Intro:"), ou null se o rótulo não vale. */
function chordTokens(line: string) {
  const tokens = tokenize(line)
  const first = tokens[0]
  const hasLabel = first !== undefined && first.text.endsWith(':') && !isChord(first.text)
  return hasLabel ? tokens.slice(1) : tokens
}

export function isChordLine(line: string): boolean {
  const tokens = chordTokens(line)
  if (tokens.length === 0) return false
  let chords = 0
  for (const t of tokens) {
    if (isChord(t.text)) chords++
    else if (!FILLER_RE.test(t.text)) return false
  }
  return chords > 0
}

function transposeLine(line: string, semitones: number, prefer: Accidental): string {
  let out = ''
  for (const t of tokenize(line)) {
    const text = isChord(t.text) ? transposeChord(t.text, semitones, prefer) : t.text
    const target = out.length === 0 ? t.col : Math.max(t.col, out.length + 1)
    out += ' '.repeat(target - out.length) + text
  }
  return out
}

export function transposeText(text: string, semitones: number, prefer: Accidental): string {
  return text
    .split('\n')
    .map((raw) => {
      const cr = raw.endsWith('\r')
      const line = cr ? raw.slice(0, -1) : raw
      if (!isChordLine(line)) return raw
      return transposeLine(line, semitones, prefer) + (cr ? '\r' : '')
    })
    .join('\n')
}

export function semitonesBetween(fromKey: string, toKey: string): number {
  const from = CHORD_RE.exec(fromKey)
  const to = CHORD_RE.exec(toKey)
  if (!from || !to) return 0
  return normalizeSemitones(noteIndex(to[1]) - noteIndex(from[1]))
}
