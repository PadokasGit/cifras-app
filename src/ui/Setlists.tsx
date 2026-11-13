import { useCallback, useEffect, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  addToSetlist,
  createSetlist,
  deleteSetlist,
  getSetlist,
  listSetlists,
  listSongs,
  removeFromSetlist,
  setSetlistOrder,
} from '../lib/db'
import type { Setlist, Song } from '../lib/types'

function Row({
  song,
  isFirst,
  isLast,
  onMove,
  onRemove,
}: {
  song: Song
  isFirst: boolean
  isLast: boolean
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: song.id })
  return (
    <li
      ref={setNodeRef}
      className="row sortable"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button className="ghost handle" aria-label="Arrastar" {...attributes} {...listeners}>
        ⠿
      </button>
      <span className="grow">{song.title}</span>
      <button className="ghost" aria-label="Subir" disabled={isFirst} onClick={() => onMove(-1)}>
        ↑
      </button>
      <button className="ghost" aria-label="Descer" disabled={isLast} onClick={() => onMove(1)}>
        ↓
      </button>
      <button className="ghost" aria-label="Remover" onClick={onRemove}>
        ✕
      </button>
    </li>
  )
}

function Editor({
  setlistId,
  onBack,
  onPlay,
}: {
  setlistId: string
  onBack: () => void
  onPlay: (id: string) => void
}) {
  const [setlist, setSetlist] = useState<Setlist | undefined>()
  const [songs, setSongs] = useState<Song[]>([])
  const [toAdd, setToAdd] = useState('')

  const reload = useCallback(async () => {
    setSetlist(await getSetlist(setlistId))
    setSongs(await listSongs())
  }, [setlistId])
  useEffect(() => {
    void reload()
  }, [reload])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!setlist) return null
  const byId = new Map(songs.map((s) => [s.id, s]))
  const items = setlist.songIds.map((id) => byId.get(id)).filter((s): s is Song => !!s)
  const available = songs.filter((s) => !setlist.songIds.includes(s.id))

  async function reorder(ids: string[]) {
    setSetlist((l) => (l ? { ...l, songIds: ids } : l))
    await setSetlistOrder(setlistId, ids)
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = items.map((s) => s.id)
    void reorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  return (
    <section>
      <div className="row">
        <button className="ghost" onClick={onBack}>
          Voltar
        </button>
        <strong className="grow">{setlist.name}</strong>
        <button onClick={() => onPlay(setlistId)}>Tocar</button>
      </div>

      <div className="row">
        <select
          aria-label="Adicionar música"
          value={toAdd}
          onChange={(e) => setToAdd(e.target.value)}
        >
          <option value="">Escolha uma música…</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <button
          disabled={!toAdd}
          onClick={async () => {
            await addToSetlist(setlistId, toAdd)
            setToAdd('')
            await reload()
          }}
        >
          Adicionar
        </button>
      </div>

      {items.length === 0 && <p className="muted">Repertório vazio</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="list">
            {items.map((s, i) => (
              <Row
                key={s.id}
                song={s}
                isFirst={i === 0}
                isLast={i === items.length - 1}
                onMove={(dir) => {
                  const ids = items.map((x) => x.id)
                  void reorder(arrayMove(ids, i, i + dir))
                }}
                onRemove={async () => {
                  await removeFromSetlist(setlistId, s.id)
                  await reload()
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  )
}

export default function Setlists({ onPlay }: { onPlay: (setlistId: string) => void }) {
  const [lists, setLists] = useState<Setlist[]>([])
  const [name, setName] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const reload = useCallback(async () => setLists(await listSetlists()), [])
  useEffect(() => {
    void reload()
  }, [reload])

  if (openId) {
    return (
      <Editor
        setlistId={openId}
        onPlay={onPlay}
        onBack={() => {
          setOpenId(null)
          void reload()
        }}
      />
    )
  }

  return (
    <section>
      <div className="row">
        <input
          aria-label="Nome do repertório"
          placeholder="Nome do repertório"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          disabled={name.trim() === ''}
          onClick={async () => {
            await createSetlist(name.trim())
            setName('')
            await reload()
          }}
        >
          Criar
        </button>
      </div>
      {lists.length === 0 && <p className="muted">Nenhum repertório ainda</p>}
      <ul className="list">
        {lists.map((l) => (
          <li key={l.id} className="row">
            <button className="item grow" onClick={() => setOpenId(l.id)}>
              <span>{l.name}</span>
              <small>{l.songIds.length} músicas</small>
            </button>
            <button
              className="ghost"
              aria-label={`Apagar ${l.name}`}
              onClick={async () => {
                await deleteSetlist(l.id)
                await reload()
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
