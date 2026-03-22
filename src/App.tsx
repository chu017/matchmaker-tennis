import { useState, useEffect, useCallback } from 'react'
import { generateDraw, TournamentDraw, applyMatchResults } from './lib/tournament'
import { applyPredictionsToDraw } from './lib/minimax'
import { fetchParticipants, fetchMatchResults, type StoredParticipant } from './lib/participantsApi'
import { toTournamentParticipants } from './lib/participantUtils'
import { SignUpForm } from './components/SignUpForm'
import { ParticipantsList } from './components/ParticipantsList'
import { DrawTabs } from './components/DrawTabs'
import { TournamentAssistant } from './components/TournamentAssistant'
import { AdminPage } from './components/AdminPage'
import { checkApiHealth } from './lib/minimaxApi'
import { DOUBLES_ENABLED } from './lib/featureFlags'

const POLL_INTERVAL_MS = 3000

type GameTab = 'singles' | 'doubles'

function App() {
  const [participants, setParticipants] = useState<StoredParticipant[]>([])
  const [apiReady, setApiReady] = useState<boolean | null>(null)
  const [singlesDraw, setSinglesDraw] = useState<TournamentDraw | null>(null)
  const [doublesDraw, setDoublesDraw] = useState<TournamentDraw | null>(null)
  const [gameTab, setGameTab] = useState<GameTab>('singles')

  useEffect(() => {
    if (!DOUBLES_ENABLED && gameTab === 'doubles') setGameTab('singles')
  }, [gameTab])

  const loadData = useCallback(async () => {
    try {
      const [data, results] = await Promise.all([fetchParticipants(), fetchMatchResults()])
      setParticipants(data)

      const singles = data.filter((p) => p.type === 'singles')
      const doubles = data.filter((p) => p.type === 'doubles')

      if (singles.length >= 2) {
        const sp = toTournamentParticipants(singles)
        let draw = applyMatchResults(generateDraw(sp), results.singles)
        draw = applyPredictionsToDraw(draw)
        setSinglesDraw(draw)
      } else {
        setSinglesDraw(null)
      }
      if (doubles.length >= 2) {
        const dp = toTournamentParticipants(doubles)
        let draw = applyMatchResults(generateDraw(dp), results.doubles)
        draw = applyPredictionsToDraw(draw)
        setDoublesDraw(draw)
      } else {
        setDoublesDraw(null)
      }
    } catch {
      setParticipants([])
      setSinglesDraw(null)
      setDoublesDraw(null)
    }
  }, [])

  useEffect(() => {
    loadData()
    const id = setInterval(loadData, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [loadData])

  useEffect(() => {
    checkApiHealth()
      .then(({ ok, hasKey }) => setApiReady(ok && hasKey))
      .catch(() => setApiReady(false))
  }, [])

  const tournamentParticipants = toTournamentParticipants(participants)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
  }

  if (window.location.pathname === '/admin') {
    return <AdminPage onBack={() => { window.location.href = '/' }} />
  }

  return (
    <div className="min-h-screen relative z-[1]">
      <header className="border-b border-pink-soft bg-pink-soft/80 backdrop-blur-sm sticky top-0 z-10 pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full border border-dashed border-pink-primary/35 motion-reduce:hidden animate-orbit-dashed"
                  aria-hidden
                />
                <div className="relative z-[1] w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-sm flex items-center justify-center animate-header-glow motion-reduce:animate-none">
                  <span
                    className="text-lg sm:text-xl inline-block animate-float-brand motion-reduce:animate-none select-none"
                    role="img"
                    aria-hidden
                  >
                    🎾
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-xl sm:text-3xl tracking-wider text-pink-text truncate">
                  SF TENNIS OPEN
                </h1>
                <p className="text-xs sm:text-sm text-pink-text-muted">
                  by sf 🎾 网球约球群
                  <span className="ml-2 inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-primary animate-pulse" />
                    Live
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white border border-pink-soft text-pink-text-muted hover:bg-pink-muted/50 active:bg-pink-muted transition-colors text-sm font-medium touch-manipulation w-full sm:w-auto shadow-sm"
              >
                Copy link to share
              </button>
              {apiReady === false && (
                <p className="text-pink-accent text-xs">Set MINIMAX_API_KEY for AI</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 sm:px-6 pb-[max(6rem,env(safe-area-inset-bottom))]">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-1 space-y-6 order-1">
            <SignUpForm />
            <ParticipantsList
              participants={participants}
              tab={gameTab}
              onTabChange={setGameTab}
              doublesEnabled={DOUBLES_ENABLED}
            />
          </div>
          <div className="lg:col-span-2 order-2">
            <DrawTabs
              singlesDraw={singlesDraw}
              doublesDraw={doublesDraw}
              tab={gameTab}
              onTabChange={setGameTab}
              doublesEnabled={DOUBLES_ENABLED}
            />
          </div>
        </div>
      </main>
      <TournamentAssistant
        participants={tournamentParticipants}
        singlesDraw={singlesDraw}
        doublesDraw={doublesDraw}
      />
    </div>
  )
}

export default App
