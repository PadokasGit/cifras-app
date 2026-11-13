import { db } from './db'
import { supabase } from './supabase'
import type { Setlist, Song } from './types'

export function mergeRecords<T extends { id: string; updatedAt: number }>(
  local: T[],
  remote: T[],
): { toUpload: T[]; toSaveLocal: T[] } {
  const remoteById = new Map(remote.map((r) => [r.id, r]))
  const localIds = new Set(local.map((l) => l.id))
  const toUpload: T[] = []
  const toSaveLocal: T[] = []

  for (const l of local) {
    const r = remoteById.get(l.id)
    if (!r || l.updatedAt > r.updatedAt) toUpload.push(l)
    else if (r.updatedAt > l.updatedAt) toSaveLocal.push(r)
  }
  for (const r of remote) if (!localIds.has(r.id)) toSaveLocal.push(r)
  return { toUpload, toSaveLocal }
}

/* ---------- mapeamento para as colunas do Postgres (snake_case) ---------- */

export function songToRow(s: Song, userId?: string) {
  return {
    ...(userId ? { user_id: userId } : {}),
    id: s.id,
    title: s.title,
    artist: s.artist,
    original_key: s.originalKey,
    raw_text: s.rawText,
    semitones: s.semitones,
    font_size: s.fontSize,
    accidental: s.accidental,
    source: s.source,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
    deleted_at: s.deletedAt ?? null,
  }
}

export function rowToSong(r: ReturnType<typeof songToRow>): Song {
  const song: Song = {
    id: r.id,
    title: r.title,
    artist: r.artist,
    originalKey: r.original_key,
    rawText: r.raw_text,
    semitones: r.semitones,
    fontSize: r.font_size,
    accidental: r.accidental,
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
  if (r.deleted_at !== null) song.deletedAt = r.deleted_at
  return song
}

export function setlistToRow(l: Setlist, userId?: string) {
  return {
    ...(userId ? { user_id: userId } : {}),
    id: l.id,
    name: l.name,
    song_ids: l.songIds,
    updated_at: l.updatedAt,
    deleted_at: l.deletedAt ?? null,
  }
}

export function rowToSetlist(r: ReturnType<typeof setlistToRow>): Setlist {
  const l: Setlist = { id: r.id, name: r.name, songIds: r.song_ids, updatedAt: r.updated_at }
  if (r.deleted_at !== null) l.deletedAt = r.deleted_at
  return l
}

/* ---------- dono dos dados locais ---------- */

const OWNER_KEY = 'syncOwnerId'

export function checkOwner(stored: string | null, sessionUserId: string): 'claim' | 'same' | 'different' {
  if (stored === null) return 'claim'
  return stored === sessionUserId ? 'same' : 'different'
}

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

function writeOwner(id: string) {
  try {
    localStorage.setItem(OWNER_KEY, id)
  } catch {
    /* sem armazenamento: segue sem registrar */
  }
}

export type SyncStatus =
  | 'ok'
  | 'not-configured'
  | 'signed-out'
  | 'offline'
  | 'owner-mismatch'
  | 'error'

export interface SyncResult {
  status: SyncStatus
  uploaded: number
  downloaded: number
  error?: string
}

const result = (status: SyncStatus, extra: Partial<SyncResult> = {}): SyncResult => ({
  status,
  uploaded: 0,
  downloaded: 0,
  ...extra,
})

/**
 * Envia e puxa mudanças. Nunca lança; o status diz o que aconteceu.
 * Os dados locais ficam ligados à primeira conta que sincronizou: outra conta no mesmo
 * aparelho é bloqueada (owner-mismatch) em vez de receber ou enviar dados alheios.
 */
export async function syncNow(): Promise<SyncResult> {
  if (!supabase) return result('not-configured')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return result('offline')
  try {
    const { data: auth } = await supabase.auth.getSession()
    const userId = auth.session?.user.id
    if (!userId) return result('signed-out')

    const owner = checkOwner(readOwner(), userId)
    if (owner === 'different') return result('owner-mismatch')

    const [remoteSongs, remoteLists] = await Promise.all([
      supabase.from('songs').select('*'),
      supabase.from('setlists').select('*'),
    ])
    if (remoteSongs.error) throw remoteSongs.error
    if (remoteLists.error) throw remoteLists.error

    const songs = mergeRecords(await db.songs.toArray(), (remoteSongs.data ?? []).map(rowToSong))
    const lists = mergeRecords(await db.setlists.toArray(), (remoteLists.data ?? []).map(rowToSetlist))

    if (songs.toUpload.length) {
      const { error } = await supabase.from('songs').upsert(songs.toUpload.map((x) => songToRow(x, userId)))
      if (error) throw error
    }
    if (lists.toUpload.length) {
      const { error } = await supabase.from('setlists').upsert(lists.toUpload.map((x) => setlistToRow(x, userId)))
      if (error) throw error
    }
    if (songs.toSaveLocal.length) await db.songs.bulkPut(songs.toSaveLocal)
    if (lists.toSaveLocal.length) await db.setlists.bulkPut(lists.toSaveLocal)

    if (owner === 'claim') writeOwner(userId)
    return result('ok', {
      uploaded: songs.toUpload.length + lists.toUpload.length,
      downloaded: songs.toSaveLocal.length + lists.toSaveLocal.length,
    })
  } catch (e) {
    return result('error', { error: e instanceof Error ? e.message : String(e) })
  }
}
