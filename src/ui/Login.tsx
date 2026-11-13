import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { syncNow } from '../lib/sync'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session))
  }, [])

  if (!supabase) {
    return (
      <p className="muted">
        Sincronização não configurada. O app funciona 100% neste aparelho.
      </p>
    )
  }
  const client = supabase

  async function login(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) return setMsg('Não foi possível entrar. Confira e-mail e senha.')
    setSignedIn(true)
    setMsg('')
    const r = await syncNow()
    setMsg(`Sincronizado: ${r.uploaded} enviadas, ${r.downloaded} recebidas.`)
  }

  if (signedIn) {
    return (
      <div className="dialog">
        <button
          onClick={async () => {
            const r = await syncNow()
            setMsg(`Sincronizado: ${r.uploaded} enviadas, ${r.downloaded} recebidas.`)
          }}
        >
          Sincronizar agora
        </button>
        <button
          className="ghost"
          onClick={async () => {
            await client.auth.signOut()
            setSignedIn(false)
          }}
        >
          Sair
        </button>
        {msg && <p className="muted">{msg}</p>}
      </div>
    )
  }

  return (
    <form className="dialog" onSubmit={login}>
      <label htmlFor="email">E-mail</label>
      <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="senha">Senha</label>
      <input id="senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Entrar</button>
      {msg && <p className="muted">{msg}</p>}
    </form>
  )
}
