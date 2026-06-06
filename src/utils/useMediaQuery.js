import { useState, useEffect } from 'react'

// useMediaQuery — subscribe to a CSS media query from JS.
// Needed because the app styles components inline (no className-driven media
// queries), so any layout decision that must change at a breakpoint reads the
// breakpoint here instead. SSR-safe: defaults to false when window is absent.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    // addEventListener is the modern API; addListener is the Safari < 14 fallback.
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [query])

  return matches
}

// Convenience breakpoints matching the CSS utilities in index.css.
export const useIsNarrow  = () => useMediaQuery('(max-width: 760px)')   // tablet / phone
export const useIsCompact = () => useMediaQuery('(max-width: 900px)')   // small laptop
export const useIsPhone   = () => useMediaQuery('(max-width: 520px)')   // phone
