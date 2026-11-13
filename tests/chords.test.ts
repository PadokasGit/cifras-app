import { describe, test, expect } from 'vitest'
import {
  transposeChord,
  isChordLine,
  transposeText,
  semitonesBetween,
  normalizeSemitones,
} from '../src/lib/chords'

describe('transposeChord', () => {
  test('sobe notas naturais', () => {
    expect(transposeChord('C', 2, 'sharp')).toBe('D')
  })
  test('usa sustenido ou bemol conforme a preferência', () => {
    expect(transposeChord('A', 1, 'sharp')).toBe('A#')
    expect(transposeChord('A', 1, 'flat')).toBe('Bb')
  })
  test('preserva qualidade e extensões', () => {
    expect(transposeChord('F#m7(b5)', 2, 'sharp')).toBe('G#m7(b5)')
    expect(transposeChord('Cmaj7', 2, 'sharp')).toBe('Dmaj7')
    expect(transposeChord('Dsus4', 2, 'sharp')).toBe('Esus4')
    expect(transposeChord('E7M', 1, 'sharp')).toBe('F7M')
    expect(transposeChord('Gdim', 2, 'sharp')).toBe('Adim')
    expect(transposeChord('C4/9', 2, 'sharp')).toBe('D4/9')
  })
  test('transpõe o baixo após a barra junto com a raiz', () => {
    expect(transposeChord('G/B', 2, 'sharp')).toBe('A/C#')
    expect(transposeChord('Eb/G', 3, 'flat')).toBe('Gb/Bb')
    expect(transposeChord('Eb/G', 3, 'sharp')).toBe('F#/A#')
  })
  test('12 semitons (ou -12) devolve o mesmo acorde', () => {
    expect(transposeChord('C', 12, 'sharp')).toBe('C')
    expect(transposeChord('C', -12, 'sharp')).toBe('C')
    expect(transposeChord('Bb/D', 12, 'flat')).toBe('Bb/D')
  })
  test('texto que não é acorde volta intacto', () => {
    expect(transposeChord('casa', 2, 'sharp')).toBe('casa')
  })
})

describe('isChordLine', () => {
  test('reconhece linhas só de acordes', () => {
    expect(isChordLine('C  G  Am  F')).toBe(true)
    expect(isChordLine('Bb  F/A  Gm7')).toBe(true)
    expect(isChordLine('C G | Am F |')).toBe(true)
  })
  test('aceita rótulo no início', () => {
    expect(isChordLine('Intro: C G Am')).toBe(true)
    expect(isChordLine('Refrão: F C')).toBe(true)
  })
  test('rejeita linhas de letra com palavras parecidas com acorde', () => {
    expect(isChordLine('A vida é bela')).toBe(false)
    expect(isChordLine('E agora')).toBe(false)
    expect(isChordLine('Em casa')).toBe(false)
    expect(isChordLine('Dia de sol')).toBe(false)
  })
  test('rejeita vazio, espaços e rótulo sozinho', () => {
    expect(isChordLine('')).toBe(false)
    expect(isChordLine('    ')).toBe(false)
    expect(isChordLine('Intro:')).toBe(false)
  })
})

describe('transposeText', () => {
  test('transpõe só as linhas de acorde, mantendo o rótulo', () => {
    expect(transposeText('Intro: C G\nA vida é bela', 2, 'sharp')).toBe(
      'Intro: D A\nA vida é bela',
    )
  })
  test('mantém a coluna dos acordes seguintes', () => {
    const out = transposeText('C      G', 1, 'sharp')
    expect(out).toBe('C#     G#')
    expect(out.indexOf('G#')).toBe(7)
  })
  test('deixa ao menos um espaço quando o acorde cresce', () => {
    expect(transposeText('C G', 1, 'sharp')).toBe('C# G#')
    expect(transposeText('A B', 1, 'flat')).toBe('Bb C')
  })
  test('texto vazio, sem acordes ou com CRLF não quebra', () => {
    expect(transposeText('', 2, 'sharp')).toBe('')
    expect(transposeText('só letra aqui', 2, 'sharp')).toBe('só letra aqui')
    expect(transposeText('C G\r\nletra\r\n', 2, 'sharp')).toBe('D A\r\nletra\r\n')
  })
  test('+12 e -12 devolvem o texto original (grafia igual à preferência)', () => {
    const flats = 'Intro: Bb F/A Gm7\nletra inventada\n  Ebm    Ab'
    expect(transposeText(flats, 12, 'flat')).toBe(flats)
    expect(transposeText(flats, -12, 'flat')).toBe(flats)
    const sharps = 'Intro: A# F/A Gm7\nletra inventada\n  C#m    G#'
    expect(transposeText(sharps, 12, 'sharp')).toBe(sharps)
    expect(transposeText(sharps, -12, 'sharp')).toBe(sharps)
  })
})

describe('semitonesBetween / normalizeSemitones', () => {
  test('distância entre tons', () => {
    expect(semitonesBetween('C', 'D')).toBe(2)
    expect(semitonesBetween('G', 'F')).toBe(10)
    expect(semitonesBetween('Am', 'Bm')).toBe(2)
  })
  test('tom inválido dá 0', () => {
    expect(semitonesBetween('', 'D')).toBe(0)
  })
  test('normaliza para 0 a 11', () => {
    expect(normalizeSemitones(-1)).toBe(11)
    expect(normalizeSemitones(12)).toBe(0)
    expect(normalizeSemitones(-13)).toBe(11)
  })
})

describe('extensões com barra dentro do parêntese', () => {
  test('transpõe A7(4/9) e E7(b9/13) sem mexer na extensão', () => {
    expect(transposeChord('A7(4/9)', 2, 'sharp')).toBe('B7(4/9)')
    expect(transposeChord('E7(b9/13)', 1, 'sharp')).toBe('F7(b9/13)')
    expect(transposeChord('D7(4/9)/F#', 2, 'sharp')).toBe('E7(4/9)/G#')
  })
  test('a linha inteira continua sendo de acordes e é transposta', () => {
    expect(isChordLine('D  A7(4/9)  G')).toBe(true)
    expect(transposeText('D  A7(4/9)  G', 2, 'sharp')).toBe('E  B7(4/9)  A')
  })
})
