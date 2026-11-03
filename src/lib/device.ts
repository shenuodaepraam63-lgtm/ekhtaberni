export function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
}

export function isMobileViewport() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768 || isTouchDevice()
}
