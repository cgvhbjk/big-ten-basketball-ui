import { create } from 'zustand'

// Matchup Analyzer state. Each team carries an independent year so the
// analyzer can run cross-year hypotheticals (e.g., 2024 Purdue vs 2022 Michigan).
// Defaults are legacy Big Ten members so they have data in every season.
// Team A defaults to Illinois — the app's landing team on a fresh load of /teams.
// The matchup reads only from this store (no team is encoded in the route), so
// a future deep-link that sets analyzerTeamA would still take precedence over
// this initial value.
const useStore = create((set) => ({
  analyzerTeamA: 'illinois',
  analyzerTeamB: 'purdue',
  analyzerYearA: 2026,
  analyzerYearB: 2026,

  setAnalyzerTeamA: (v) => set({ analyzerTeamA: v }),
  setAnalyzerTeamB: (v) => set({ analyzerTeamB: v }),
  setAnalyzerYearA: (v) => set({ analyzerYearA: v }),
  setAnalyzerYearB: (v) => set({ analyzerYearB: v }),
}))

export default useStore
