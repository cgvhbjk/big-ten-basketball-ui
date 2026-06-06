import { describe, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from './App.jsx'
import MatchupAnalyzer from './pages/MatchupAnalyzer.jsx'
import InsightsLab from './pages/InsightsLab.jsx'
import EpaLab from './pages/EpaLab.jsx'
import PlayerLab from './pages/PlayerLab.jsx'

// Smoke test: render each route + each embedded sub-page server-side to surface
// any runtime render error (the kind that shows as a blank/black screen but
// passes build). TeamsHub only mounts its active section, so the embedded
// sub-pages are rendered directly here to keep coverage.
const wrap = (node) => renderToString(<MemoryRouter>{node}</MemoryRouter>)

describe('smoke render', () => {
  for (const path of ['/teams', '/players']) {
    it(`route ${path}`, () => {
      renderToString(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
    })
  }
  it('embedded MatchupAnalyzer', () => wrap(<MatchupAnalyzer embedded />))
  it('embedded InsightsLab',     () => wrap(<InsightsLab embedded />))
  it('embedded EpaLab',          () => wrap(<EpaLab embedded />))
  it('PlayerLab',                () => wrap(<PlayerLab />))
})
