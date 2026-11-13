import { useState } from 'react'
import { addSong } from '../lib/db'
import { parsePastedText } from '../lib/importText'

export default function ImportDialog({
  onSaved,
  onCancel,
}: {
  onSaved: (id: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')

  async function save() {
    const parsed = parsePastedText(text)
    const song = await addSong({ ...parsed, source: { kind: 'paste' } })
    onSaved(song.id)
  }

  return (
    <div className="dialog" role="dialog" aria-label="Importar cifra">
      <label htmlFor="cifra-text">Texto da cifra</label>
      <textarea
        id="cifra-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Cole aqui a cifra. Dica: a 1ª linha pode ser Título - Artista"
        rows={12}
      />
      <div className="row">
        <button onClick={save}>Salvar</button>
        <button className="ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
