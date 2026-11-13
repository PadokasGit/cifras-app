import { describe, test, expect, beforeEach } from 'vitest'
import {
  db,
  addSong,
  getSong,
  listSongs,
  updateSong,
  deleteSong,
  createSetlist,
  getSetlist,
  listSetlists,
  setSetlistOrder,
  addToSetlist,
  removeFromSetlist,
  deleteSetlist,
  clampFontSize,
} from '../src/lib/db'

const base = {
  title: 'Canção Teste',
  artist: 'Banda X',
  originalKey: 'G',
  rawText: 'G   D\nletra inventada',
  source: { kind: 'paste' as const },
}

beforeEach(async () => {
  await db.songs.clear()
  await db.setlists.clear()
})

describe('songs', () => {
  test('addSong devolve os valores padrão', async () => {
    const s = await addSong(base)
    expect(s.semitones).toBe(0)
    expect(s.fontSize).toBe(20)
    expect(s.accidental).toBe('sharp')
    expect(await getSong(s.id)).toEqual(s)
  })
  test('updateSong persiste tom e fonte e muda updatedAt', async () => {
    const s = await addSong(base)
    await new Promise((r) => setTimeout(r, 5))
    await updateSong(s.id, { semitones: 3, fontSize: 30 })
    const got = await getSong(s.id)
    expect(got?.semitones).toBe(3)
    expect(got?.fontSize).toBe(30)
    expect(got!.updatedAt).toBeGreaterThan(s.updatedAt)
  })
  test('listSongs omite apagadas e ordena por título', async () => {
    const b = await addSong({ ...base, title: 'B' })
    await addSong({ ...base, title: 'A' })
    const c = await addSong({ ...base, title: 'C' })
    await deleteSong(c.id)
    expect((await listSongs()).map((s) => s.title)).toEqual(['A', 'B'])
    expect(await getSong(b.id)).toBeDefined()
  })
  test('deleteSong tira a música dos repertórios', async () => {
    const s = await addSong(base)
    const l = await createSetlist('Sábado')
    await addToSetlist(l.id, s.id)
    await deleteSong(s.id)
    expect((await getSetlist(l.id))?.songIds).toEqual([])
  })
})

describe('setlists', () => {
  test('setSetlistOrder preserva a ordem exata', async () => {
    const l = await createSetlist('Culto')
    await setSetlistOrder(l.id, ['c', 'a', 'b'])
    expect((await getSetlist(l.id))?.songIds).toEqual(['c', 'a', 'b'])
  })
  test('addToSetlist duas vezes não duplica', async () => {
    const l = await createSetlist('Culto')
    await addToSetlist(l.id, 'x')
    await addToSetlist(l.id, 'x')
    expect((await getSetlist(l.id))?.songIds).toEqual(['x'])
  })
  test('removeFromSetlist e deleteSetlist', async () => {
    const l = await createSetlist('Culto')
    await addToSetlist(l.id, 'x')
    await addToSetlist(l.id, 'y')
    await removeFromSetlist(l.id, 'x')
    expect((await getSetlist(l.id))?.songIds).toEqual(['y'])
    await deleteSetlist(l.id)
    expect(await listSetlists()).toEqual([])
  })
})

describe('clampFontSize', () => {
  test('limita entre 12 e 48 e trata inválido', () => {
    expect(clampFontSize(5)).toBe(12)
    expect(clampFontSize(99)).toBe(48)
    expect(clampFontSize(30)).toBe(30)
    expect(clampFontSize(NaN)).toBe(20)
    expect(clampFontSize(undefined as unknown as number)).toBe(20)
  })
})
