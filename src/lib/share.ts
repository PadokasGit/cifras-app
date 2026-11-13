export interface ShareInfo {
  kind: 'text' | 'link' | 'none'
  text: string
}

const URL_RE = /^https?:\/\/\S+$/

/** Lê o que o menu "Compartilhar" do celular mandou (Web Share Target, via GET). */
export function parseShare(search: string): ShareInfo {
  const params = new URLSearchParams(search)
  const text = (params.get('text') ?? '').replace(/\r\n/g, '\n')
  const url = (params.get('url') ?? '').trim()

  // alguns navegadores colam o link da página no fim do texto selecionado
  const lines = text.trimEnd().split('\n')
  if (lines.length > 1 && URL_RE.test(lines[lines.length - 1].trim())) lines.pop()
  const body = lines.join('\n').trimEnd()

  if (body.trim() === '') {
    return url !== '' || URL_RE.test(text.trim())
      ? { kind: 'link', text: '' }
      : { kind: 'none', text: '' }
  }
  if (URL_RE.test(body.trim())) return { kind: 'link', text: '' }
  return { kind: 'text', text: body }
}
