import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Setlists from '../src/ui/Setlists'
import SetlistPlayer from '../src/ui/SetlistPlayer'
import { db, addSong, createSetlist, getSetlist, setSetlistOrder } from '../src/lib/db'

const mk = (title: string) =>
  addSong({ title, artist: '', originalKey: 'C', rawText: 'C  G\nletra inventada', source: { kind: 'paste' } })

beforeEach(async () => {
  await db.songs.clear()
  await db.setlists.clear()
})

describe('Setlists', () => {
  test('criar repertório', async () => {
    const user = userEvent.setup()
    render(<Setlists onPlay={vi.fn()} />)
    await user.type(await screen.findByLabelText('Nome do repertório'), 'Sábado')
    await user.click(screen.getByRole('button', { name: 'Criar' }))
    expect(await screen.findByText('Sábado')).toBeInTheDocument()
  })

  test('adicionar, reordenar e remover músicas', async () => {
    const a = await mk('Alfa')
    const b = await mk('Beta')
    const l = await createSetlist('Culto')
    const user = userEvent.setup()
    render(<Setlists onPlay={vi.fn()} />)
    await user.click(await screen.findByText('Culto'))

    await user.selectOptions(await screen.findByLabelText('Adicionar música'), a.id)
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    await user.selectOptions(screen.getByLabelText('Adicionar música'), b.id)
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    await waitFor(async () => expect((await getSetlist(l.id))?.songIds).toEqual([a.id, b.id]))

    const items = screen.getAllByRole('listitem')
    await user.click(within(items[0]).getByRole('button', { name: 'Descer' }))
    await waitFor(async () => expect((await getSetlist(l.id))?.songIds).toEqual([b.id, a.id]))

    await user.click(within(screen.getAllByRole('listitem')[0]).getByRole('button', { name: 'Remover' }))
    await waitFor(async () => expect((await getSetlist(l.id))?.songIds).toEqual([a.id]))
  })

  test('tocar chama onPlay com o id do repertório', async () => {
    const l = await createSetlist('Culto')
    const onPlay = vi.fn()
    const user = userEvent.setup()
    render(<Setlists onPlay={onPlay} />)
    await user.click(await screen.findByText('Culto'))
    await user.click(await screen.findByRole('button', { name: 'Tocar' }))
    expect(onPlay).toHaveBeenCalledWith(l.id)
  })
})

describe('SetlistPlayer', () => {
  test('próxima avança e na última fica desabilitada', async () => {
    const a = await mk('Alfa')
    const b = await mk('Beta')
    const l = await createSetlist('Culto')
    await setSetlistOrder(l.id, [a.id, b.id])
    const user = userEvent.setup()
    render(<SetlistPlayer setlistId={l.id} onBack={vi.fn()} />)
    expect(await screen.findByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('Alfa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(await screen.findByText('2/2')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
  })

  test('repertório vazio não quebra', async () => {
    const l = await createSetlist('Vazio')
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<SetlistPlayer setlistId={l.id} onBack={onBack} />)
    expect(await screen.findByText('Repertório vazio')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(onBack).toHaveBeenCalled()
  })
})
