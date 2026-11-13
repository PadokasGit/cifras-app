import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Library from '../src/ui/Library'
import { db, addSong } from '../src/lib/db'

beforeEach(async () => {
  await db.songs.clear()
  await db.setlists.clear()
})

describe('Library', () => {
  test('lista vazia mostra mensagem', async () => {
    render(<Library onOpen={vi.fn()} />)
    expect(await screen.findByText('Nenhuma cifra ainda')).toBeInTheDocument()
  })

  test('importar um texto faz o título aparecer na lista', async () => {
    const user = userEvent.setup()
    render(<Library onOpen={vi.fn()} />)
    await screen.findByText('Nenhuma cifra ainda')
    await user.click(screen.getByRole('button', { name: 'Importar' }))
    await user.type(
      screen.getByLabelText('Texto da cifra'),
      'Canção Teste - Banda X{enter}G   D{enter}letra inventada',
    )
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Canção Teste')).toBeInTheDocument()
    expect(screen.queryByText('Nenhuma cifra ainda')).not.toBeInTheDocument()
  })

  test('a busca filtra por título ou artista', async () => {
    await addSong({ title: 'Alfa', artist: 'Um', originalKey: '', rawText: '', source: { kind: 'paste' } })
    await addSong({ title: 'Beta', artist: 'Dois', originalKey: '', rawText: '', source: { kind: 'paste' } })
    const user = userEvent.setup()
    render(<Library onOpen={vi.fn()} />)
    await screen.findByText('Alfa')
    await user.type(screen.getByPlaceholderText('Buscar'), 'dois')
    await waitFor(() => expect(screen.queryByText('Alfa')).not.toBeInTheDocument())
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  test('clicar numa música chama onOpen com o id', async () => {
    const s = await addSong({ title: 'Gama', artist: '', originalKey: '', rawText: '', source: { kind: 'paste' } })
    const onOpen = vi.fn()
    const user = userEvent.setup()
    render(<Library onOpen={onOpen} />)
    await user.click(await screen.findByText('Gama'))
    expect(onOpen).toHaveBeenCalledWith(s.id)
  })
})
