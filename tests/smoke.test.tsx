import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import App from '../src/App'

test('mostra o título Cifras', () => {
  render(<App />)
  expect(screen.getByText('Cifras')).toBeInTheDocument()
})
