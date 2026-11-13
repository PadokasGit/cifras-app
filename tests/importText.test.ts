import { describe, test, expect } from 'vitest'
import { parsePastedText } from '../src/lib/importText'

describe('parsePastedText', () => {
  test('texto vazio não lança', () => {
    const r = parsePastedText('')
    expect(r.title).toBe('Sem título')
    expect(r.artist).toBe('')
    expect(r.rawText).toBe('')
    expect(r.originalKey).toBe('')
  })
  test('só espaços também não lança', () => {
    expect(parsePastedText('   \n  ').title).toBe('Sem título')
  })
  test('sem acordes mantém o texto intacto e tom vazio', () => {
    const r = parsePastedText('só letra inventada\noutra linha')
    expect(r.originalKey).toBe('')
    expect(r.rawText).toBe('só letra inventada\noutra linha')
  })
  test('lê título, artista e tom', () => {
    const r = parsePastedText('Canção Teste - Banda X\nG   D\nletra inventada')
    expect(r.title).toBe('Canção Teste')
    expect(r.artist).toBe('Banda X')
    expect(r.originalKey).toBe('G')
    expect(r.rawText).toBe('G   D\nletra inventada')
  })
  test('linha de acordes com hífen não vira título', () => {
    const r = parsePastedText('A - E\nletra inventada')
    expect(r.title).toBe('Sem título')
    expect(r.rawText).toBe('A - E\nletra inventada')
    expect(r.originalKey).toBe('A')
  })
})
