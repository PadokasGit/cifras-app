import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SongView from '../src/ui/SongView'
import { acquireWakeLock } from '../src/lib/wakeLock'
import { db, addSong, getSong } from '../src/lib/db'

async function makeSong() {
  return addSong({
    title: 'Canção Teste',
    artist: 'Banda X',
    originalKey: 'G',
    rawText: 'G   D\nletra inventada',
    source: { kind: 'paste' },
  })
}

beforeEach(async () => {
  await db.songs.clear()
  await db.setlists.clear()
})

describe('SongView', () => {
  test('mostra a cifra e o tom atual', async () => {
    const s = await makeSong()
    render(<SongView songId={s.id} onBack={vi.fn()} />)
    const pre = await screen.findByLabelText('Cifra')
    expect(pre).toHaveTextContent('G D')
    expect(screen.getByText('Tom: G')).toBeInTheDocument()
  })

  test('subir tom troca os acordes e persiste', async () => {
    const s = await makeSong()
    const user = userEvent.setup()
    render(<SongView songId={s.id} onBack={vi.fn()} />)
    await screen.findByLabelText('Cifra')
    await user.click(screen.getByRole('button', { name: 'Subir tom' }))
    expect(screen.getByLabelText('Cifra')).toHaveTextContent('G# D#')
    expect(screen.getByText('Tom: G#')).toBeInTheDocument()
    await waitFor(async () => expect((await getSong(s.id))?.semitones).toBe(1))
  })

  test('descer tom a partir de 0 vai para 11', async () => {
    const s = await makeSong()
    const user = userEvent.setup()
    render(<SongView songId={s.id} onBack={vi.fn()} />)
    await screen.findByLabelText('Cifra')
    await user.click(screen.getByRole('button', { name: 'Descer tom' }))
    await waitFor(async () => expect((await getSong(s.id))?.semitones).toBe(11))
    expect(screen.getByText('Tom: F#')).toBeInTheDocument()
  })

  test('bemol troca a grafia e persiste a preferência', async () => {
    const s = await makeSong()
    const user = userEvent.setup()
    render(<SongView songId={s.id} onBack={vi.fn()} />)
    await screen.findByLabelText('Cifra')
    await user.click(screen.getByRole('button', { name: 'Subir tom' }))
    await user.click(screen.getByRole('button', { name: 'Bemol' }))
    expect(screen.getByLabelText('Cifra')).toHaveTextContent('Ab Eb')
    await waitFor(async () => expect((await getSong(s.id))?.accidental).toBe('flat'))
  })

  test('tamanho da letra muda e persiste', async () => {
    const s = await makeSong()
    const user = userEvent.setup()
    render(<SongView songId={s.id} onBack={vi.fn()} />)
    const pre = await screen.findByLabelText('Cifra')
    expect(pre).toHaveStyle({ fontSize: '20px' })
    await user.click(screen.getByRole('button', { name: 'Aumentar letra' }))
    expect(screen.getByLabelText('Cifra')).toHaveStyle({ fontSize: '22px' })
    await waitFor(async () => expect((await getSong(s.id))?.fontSize).toBe(22))
  })

  test('tamanho da letra respeita os limites 12 e 48', async () => {
    const s = await makeSong()
    const user = userEvent.setup()
    await (await import('../src/lib/db')).updateSong(s.id, { fontSize: 48 })
    render(<SongView songId={s.id} onBack={vi.fn()} />)
    await screen.findByLabelText('Cifra')
    await user.click(screen.getByRole('button', { name: 'Aumentar letra' }))
    expect(screen.getByLabelText('Cifra')).toHaveStyle({ fontSize: '48px' })
    await (await import('../src/lib/db')).updateSong(s.id, { fontSize: 12 })
  })

  test('valor de fonte salvo inválido volta ao padrão', async () => {
    const s = await makeSong()
    await (await import('../src/lib/db')).updateSong(s.id, { fontSize: NaN })
    render(<SongView songId={s.id} onBack={vi.fn()} />)
    expect(await screen.findByLabelText('Cifra')).toHaveStyle({ fontSize: '20px' })
  })

  test('ao reabrir, tom e fonte voltam como salvos', async () => {
    const s = await makeSong()
    const user = userEvent.setup()
    const first = render(<SongView songId={s.id} onBack={vi.fn()} />)
    await screen.findByLabelText('Cifra')
    await user.click(screen.getByRole('button', { name: 'Subir tom' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar letra' }))
    await waitFor(async () => expect((await getSong(s.id))?.semitones).toBe(1))
    first.unmount()
    render(<SongView songId={s.id} onBack={vi.fn()} />)
    expect(await screen.findByText('Tom: G#')).toBeInTheDocument()
    expect(screen.getByLabelText('Cifra')).toHaveStyle({ fontSize: '22px' })
  })

  test('música sem acorde mostra o texto como está', async () => {
    const s = await addSong({ title: 'Só letra', artist: '', originalKey: '', rawText: 'só letra inventada', source: { kind: 'paste' } })
    const user = userEvent.setup()
    render(<SongView songId={s.id} onBack={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: 'Subir tom' }))
    expect(screen.getByLabelText('Cifra')).toHaveTextContent('só letra inventada')
  })

  test('navegação só aparece quando há onPrev/onNext', async () => {
    const s = await makeSong()
    const onNext = vi.fn()
    const user = userEvent.setup()
    render(<SongView songId={s.id} onBack={vi.fn()} onNext={onNext} position="1/3" />)
    await screen.findByLabelText('Cifra')
    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Anterior' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(onNext).toHaveBeenCalled()
  })

  test('id inexistente mostra aviso e voltar funciona', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<SongView songId="nao-existe" onBack={onBack} />)
    expect(await screen.findByText('Música não encontrada')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(onBack).toHaveBeenCalled()
  })
})

describe('acquireWakeLock', () => {
  test('não lança quando navigator.wakeLock não existe', async () => {
    const release = await acquireWakeLock()
    expect(() => release()).not.toThrow()
  })
})
