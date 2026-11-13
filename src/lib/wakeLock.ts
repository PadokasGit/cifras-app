/** Mantém a tela ligada. Devolve a função que libera; nunca lança se a API não existir. */
export async function acquireWakeLock(): Promise<() => void> {
  let sentinel: WakeLockSentinel | null = null
  let released = false

  async function request() {
    try {
      if (released || !('wakeLock' in navigator)) return
      sentinel = await navigator.wakeLock.request('screen')
    } catch {
      sentinel = null
    }
  }

  // o navegador solta o bloqueio quando a aba fica oculta; pede de novo ao voltar
  const onVisible = () => {
    if (document.visibilityState === 'visible') void request()
  }
  document.addEventListener('visibilitychange', onVisible)
  await request()

  return () => {
    released = true
    document.removeEventListener('visibilitychange', onVisible)
    void sentinel?.release().catch(() => {})
    sentinel = null
  }
}
