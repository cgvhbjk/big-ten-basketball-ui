import { create } from 'zustand'

// A single EPA model (four-factor ridge on Big Ten per-game box scores) is
// cached here so it survives navigation and isn't refit on every render.
const useEpaStore = create((set) => ({
  epaResult:         null,
  error:             null,
  activeComparison:  'events',   // 'events' | 'coefficients' | 'scatter' | 'state'

  setEpaResult:        (result) => set({ epaResult: result }),
  setActiveComparison: (val)    => set({ activeComparison: val }),
  setError:            (msg)    => set({ error: msg }),
}))

export default useEpaStore
