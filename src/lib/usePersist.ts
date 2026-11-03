import { useState, useEffect, useRef } from 'react'

/**
 * usePersist - like useState but saves to localStorage automatically.
 * Survives page refresh. Uses JSON serialization.
 */
export function usePersist<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const fullKey = `ekhtaberni_${key}`

  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(fullKey)
      if (saved !== null) return JSON.parse(saved) as T
    } catch {}
    return defaultValue
  })

  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    try {
      if (state === undefined || state === null) {
        localStorage.removeItem(fullKey)
      } else {
        localStorage.setItem(fullKey, JSON.stringify(state))
      }
    } catch {}
  }, [state, fullKey])

  return [state, setState]
}

/** Save a simple string value */
export function persistGet(key: string): string | null {
  try { return localStorage.getItem(`ekhtaberni_${key}`) } catch { return null }
}

export function persistSet(key: string, value: string) {
  try { localStorage.setItem(`ekhtaberni_${key}`, value) } catch {}
}

export function persistRemove(key: string) {
  try { localStorage.removeItem(`ekhtaberni_${key}`) } catch {}
}

/** Clear all ekhtaberni persisted data */
export function persistClear() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('ekhtaberni_'))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}
