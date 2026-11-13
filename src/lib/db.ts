import Dexie, { type EntityTable } from 'dexie'
import type { Song, Setlist } from './types'

export const DEFAULT_FONT_SIZE = 20
export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 48

class CifrasDB extends Dexie {
  songs!: EntityTable<Song, 'id'>
  setlists!: EntityTable<Setlist, 'id'>

  constructor() {
    super('cifras')
    this.version(1).stores({
      songs: 'id, title, updatedAt',
      setlists: 'id, updatedAt',
    })
  }
}

export const db = new CifrasDB()

export function clampFontSize(n: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return DEFAULT_FONT_SIZE
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, n))
}

export async function addSong(
  input: Pick<Song, 'title' | 'artist' | 'originalKey' | 'rawText' | 'source'>,
): Promise<Song> {
  const now = Date.now()
  const song: Song = {
    ...input,
    id: crypto.randomUUID(),
    semitones: 0,
    fontSize: DEFAULT_FONT_SIZE,
    accidental: 'sharp',
    createdAt: now,
    updatedAt: now,
  }
  await db.songs.add(song)
  return song
}

export function getSong(id: string): Promise<Song | undefined> {
  return db.songs.get(id)
}

export async function listSongs(): Promise<Song[]> {
  const all = await db.songs.toArray()
  return all
    .filter((s) => s.deletedAt === undefined)
    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
}

export async function updateSong(id: string, patch: Partial<Song>): Promise<void> {
  await db.songs.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteSong(id: string): Promise<void> {
  await db.transaction('rw', db.songs, db.setlists, async () => {
    await db.songs.update(id, { deletedAt: Date.now(), updatedAt: Date.now() })
    const lists = await db.setlists.toArray()
    for (const l of lists) {
      if (l.songIds.includes(id)) {
        await db.setlists.update(l.id, {
          songIds: l.songIds.filter((s) => s !== id),
          updatedAt: Date.now(),
        })
      }
    }
  })
}

export async function createSetlist(name: string): Promise<Setlist> {
  const l: Setlist = { id: crypto.randomUUID(), name, songIds: [], updatedAt: Date.now() }
  await db.setlists.add(l)
  return l
}

export async function listSetlists(): Promise<Setlist[]> {
  const all = await db.setlists.toArray()
  return all
    .filter((l) => l.deletedAt === undefined)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export async function getSetlist(id: string): Promise<Setlist | undefined> {
  const l = await db.setlists.get(id)
  return l && l.deletedAt === undefined ? l : undefined
}

export async function setSetlistOrder(id: string, songIds: string[]): Promise<void> {
  await db.setlists.update(id, { songIds, updatedAt: Date.now() })
}

export async function addToSetlist(id: string, songId: string): Promise<void> {
  const l = await db.setlists.get(id)
  if (!l || l.songIds.includes(songId)) return
  await setSetlistOrder(id, [...l.songIds, songId])
}

export async function removeFromSetlist(id: string, songId: string): Promise<void> {
  const l = await db.setlists.get(id)
  if (!l) return
  await setSetlistOrder(id, l.songIds.filter((s) => s !== songId))
}

export async function deleteSetlist(id: string): Promise<void> {
  await db.setlists.update(id, { deletedAt: Date.now(), updatedAt: Date.now() })
}
