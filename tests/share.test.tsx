import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { parseShare } from '../src/lib/share'
import App from '../src/App'
import { db } from '../src/lib/db'

describe('parseShare', () => {
  test('sem parâmetros: none', () => {
    expect(parseShare('')).toEqual({ kind: 'none', text: '' })
    expect(parseShare('?x=1')).toEqual({ kind: 'none', text: '' })
  })
  test('texto compartilhado vira texto', () => {
    expect(parseShare('?text=' + encodeURIComponent('G  D\nletra inventada'))).toEqual({
      kind: 'text',
      text: 'G  D\nletra inventada',
    })
  })
  test('só um link (em text ou url) vira link', () => {
    expect(parseShare('?text=' + encodeURIComponent('https://www.cifraclub.com.br/a/b/')).kind).toBe('link')
    expect(parseShare('?url=' + encodeURIComponent('https://www.cifraclub.com.br/a/b/')).kind).toBe('link')
  })
  test('link colado no fim do texto é removido', () => {
    const t = 'G  D\nletra inventada\nhttps://www.cifraclub.com.br/a/b/'
    expect(parseShare('?text=' + encodeURIComponent(t))).toEqual({
      kind: 'text',
      text: 'G  D\nletra inventada',
    })
  })
  test('texto só com espaços conta como none', () => {
    expect(parseShare('?text=%20%20').kind).toBe('none')
  })
})

describe('App recebendo compartilhamento', () => {
  beforeEach(async () => {
    await db.songs.clear()
    window.history.pushState({}, '', '/')
  })

  test('texto compartilhado abre a importação já preenchida', async () => {
    window.history.pushState({}, '', '/?text=' + encodeURIComponent('G  D\nletra inventada'))
    render(<App />)
    const box = (await screen.findByLabelText('Texto da cifra')) as HTMLTextAreaElement
    expect(box.value).toBe('G  D\nletra inventada')
    expect(window.location.search).toBe('')
  })

  test('só um link mostra o aviso e não abre a importação', async () => {
    window.history.pushState({}, '', '/?url=' + encodeURIComponent('https://www.cifraclub.com.br/a/b/'))
    render(<App />)
    expect(await screen.findByText(/só um link/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Texto da cifra')).not.toBeInTheDocument()
  })
})
