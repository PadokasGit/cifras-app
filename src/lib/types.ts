export type Accidental = 'sharp' | 'flat'

export type SongSource = { kind: 'paste' } | { kind: 'link'; url: string }

export interface Song {
  id: string
  title: string
  artist: string
  originalKey: string
  rawText: string
  semitones: number
  fontSize: number
  accidental: Accidental
  source: SongSource
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export interface Setlist {
  id: string
  name: string
  songIds: string[]
  updatedAt: number
  deletedAt?: number
}
