import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Unmount rendered components between tests (no-op for tests without a DOM).
afterEach(() => {
  if (typeof document !== 'undefined') cleanup()
})

// jsdom lacks the layout APIs Radix primitives call; a no-op is enough for behaviour tests.
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  window.ResizeObserver = class {
    constructor(_callback: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
