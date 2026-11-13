import { describe, test, expect } from 'vitest'
import { mergeRecords, songToRow, rowToSong, setlistToRow, rowToSetlist } from '../src/lib/sync'
import type { Song, Setlist } from '../src/lib/types'

type R = { id: string; updatedAt: number; deletedAt?: number; v?: string }
const r = (id: string, updatedAt: number, extra: Partial<R> = {}): R => ({ id, updatedAt, ...extra })

describe('mergeRecords', () => {
  test('registro só local sobe', () => {
    const out = mergeRecords([r('a', 1)], [])
    expect(out.toUpload).toEqual([r('a', 1)])
    expect(out.toSaveLocal).toEqual([])
  })
  test('registro só remoto desce', () => {
    const out = mergeRecords([], [r('a', 1)])
    expect(out.toSaveLocal).toEqual([r('a', 1)])
    expect(out.toUpload).toEqual([])
  })
  test('vence o mais recente nos dois sentidos', () => {
    const a = mergeRecords([r('a', 5, { v: 'local' })], [r('a', 2, { v: 'remoto' })])
    expect(a.toUpload).toEqual([r('a', 5, { v: 'local' })])
    expect(a.toSaveLocal).toEqual([])
    const b = mergeRecords([r('a', 2, { v: 'local' })], [r('a', 5, { v: 'remoto' })])
    expect(b.toSaveLocal).toEqual([r('a', 5, { v: 'remoto' })])
    expect(b.toUpload).toEqual([])
  })
  test('empate não gera ação', () => {
    expect(mergeRecords([r('a', 3)], [r('a', 3)])).toEqual({ toUpload: [], toSaveLocal: [] })
  })
  test('apagado mais recente vence não apagado mais antigo', () => {
    const out = mergeRecords([r('a', 9, { deletedAt: 9 })], [r('a', 4)])
    expect(out.toUpload).toEqual([r('a', 9, { deletedAt: 9 })])
    const back = mergeRecords([r('a', 4)], [r('a', 9, { deletedAt: 9 })])
    expect(back.toSaveLocal).toEqual([r('a', 9, { deletedAt: 9 })])
  })
  test('listas vazias dão resultado vazio', () => {
    expect(mergeRecords([], [])).toEqual({ toUpload: [], toSaveLocal: [] })
  })
})

describe('mapeamento linha <-> registro', () => {
  const song: Song = {
    id: 's1', title: 'T', artist: 'A', originalKey: 'G', rawText: 'G\nx',
    semitones: 2, fontSize: 24, accidental: 'flat', source: { kind: 'link', url: 'https://www.cifraclub.com.br/x/y/' },
    createdAt: 1, updatedAt: 2, deletedAt: 3,
  }
  test('música ida e volta', () => {
    expect(rowToSong(songToRow(song))).toEqual(song)
  })
  test('música sem deletedAt ida e volta', () => {
    const { deletedAt: _d, ...rest } = song
    expect(rowToSong(songToRow(rest))).toEqual(rest)
  })
  test('repertório ida e volta', () => {
    const l: Setlist = { id: 'l1', name: 'N', songIds: ['a', 'b'], updatedAt: 5 }
    expect(rowToSetlist(setlistToRow(l))).toEqual(l)
  })
})

import { checkOwner, syncNow } from '../src/lib/sync'

describe('dono dos dados locais', () => {
  test('primeiro uso reivindica; mesmo usuário passa; outro é bloqueado', () => {
    expect(checkOwner(null, 'u1')).toBe('claim')
    expect(checkOwner('u1', 'u1')).toBe('same')
    expect(checkOwner('u1', 'u2')).toBe('different')
  })
  test('user_id explícito só quando informado', () => {
    const s: Song = {
      id: 's', title: 'T', artist: '', originalKey: '', rawText: '', semitones: 0, fontSize: 20,
      accidental: 'sharp', source: { kind: 'paste' }, createdAt: 1, updatedAt: 1,
    }
    expect(songToRow(s, 'u1').user_id).toBe('u1')
    expect('user_id' in songToRow(s)).toBe(false)
    const l: Setlist = { id: 'l', name: 'N', songIds: [], updatedAt: 1 }
    expect(setlistToRow(l, 'u1').user_id).toBe('u1')
  })
})

describe('syncNow', () => {
  test('sem Supabase configurado devolve status not-configured', async () => {
    expect(await syncNow()).toEqual({ status: 'not-configured', uploaded: 0, downloaded: 0 })
  })
})
