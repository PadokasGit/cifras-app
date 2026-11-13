import { test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Login from '../src/ui/Login'

test('sem Supabase configurado, avisa que o app segue 100% local', () => {
  render(<Login />)
  expect(screen.getByText(/Sincronização não configurada/)).toBeInTheDocument()
  expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
})
