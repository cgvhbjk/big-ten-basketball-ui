import { useState } from 'react'
import MatchupAnalyzer from './MatchupAnalyzer.jsx'
import InsightsLab from './InsightsLab.jsx'
import EpaLab from './EpaLab.jsx'
import SectionTabs from '../components/shared/SectionTabs.jsx'
import { T } from '../styles/theme.js'

// TeamsHub — one of the app's two destinations (the other is Players). It folds
// the former Matchup Analyzer, Insights Lab and EPA Lab into a single page,
// switched by a top-level tab strip. Each former page is rendered `embedded`
// so it drops its own title (the tab already names it) but keeps its controls,
// KPIs and sub-tabs.
const SECTIONS = [
  { value: 'matchup',  label: 'Matchup' },
  { value: 'insights', label: 'Insights' },
  { value: 'epa',      label: 'EPA Models' },
]

export default function TeamsHub() {
  const [section, setSection] = useState('matchup')

  return (
    <div style={{ background: T.bg, minHeight: '100vh' }}>
      {/* Primary view switcher for the Teams hub */}
      <div style={{ background: T.bgDeep, borderBottom: `1px solid ${T.border}` }}>
        <div className="bt-page" style={{ paddingTop: 10, paddingBottom: 10 }}>
          <SectionTabs
            tabs={SECTIONS}
            value={section}
            onChange={setSection}
            ariaLabel="Teams views"
          />
        </div>
      </div>

      {section === 'matchup'  && <MatchupAnalyzer embedded />}
      {section === 'insights' && <InsightsLab embedded />}
      {section === 'epa'      && <EpaLab embedded />}
    </div>
  )
}
