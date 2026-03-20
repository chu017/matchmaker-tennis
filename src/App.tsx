import { useState, useEffect, useCallback } from 'react'
import { generateDraw, TournamentDraw } from './lib/tournament'
import { applyPredictionsToDraw } from './lib/minimax'
import { fetchParticipants, type StoredParticipant } from './lib/participantsApi'
import { toTournamentParticipants } from './lib/participantUtils'
import { SignUpForm } from './components/SignUpForm'
import { ParticipantsList } from './components/ParticipantsList'
import { DrawTabs } from './components/DrawTabs'
import { TournamentAssistant } from './components/TournamentAssistant'
import { checkApiHealth } from './lib/minimaxApi'

const POLL_INTERVAL_MS = 3000

function App() {
  const [participants, setParticipants] = useState<StoredParticipant[]>([])
  const [apiReady, setApiReady] = useState<boolean | null>(null)

  const [singlesDraw, setSinglesDraw] = useState<TournamentDraw | null>(null)
  const [doublesDraw, setDoublesDraw] = useState<TournamentDraw | null>(null)

  const loadParticipants = useCallback(async () => {
    try {
      const data = await fetchParticipants()
      setParticipants(data)
      const singles = data.filter((p) => p.type === 'singles')
      const doubles = data.filter((p) => p.type === 'doubles')
      if (singles.length >= 2) {
        const sp = toTournamentParticipants(singles)
        setSinglesDraw(applyPredictionsToDraw(generateDraw(sp)))
      } else {
        setSinglesDraw(null)
      }
      if (doubles.length >= 2) {
        const dp = toTournamentParticipants(doubles)
        setDoublesDraw(applyPredictionsToDraw(generateDraw(dp)))
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
    loadParticipants()
    const id = setInterval(loadParticipants, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [loadParticipants])

  useEffect(() => {
    checkApiHealth()
      .then(({ ok, hasKey }) => setApiReady(ok && hasKey))
      .catch(() => setApiReady(false))
  }, [])

  const tournamentParticipants = toTournamentParticipants(participants)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-court-line/20 bg-court-green/40 backdrop-blur-sm sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-court-line/20 flex items-center justify-center">
                <span className="text-lg sm:text-xl">🎾</span>
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-xl sm:text-3xl tracking-wider text-court-line truncate">
                  SF TENNIS MATCHMAKER
                </h1>
                <p className="text-xs sm:text-sm text-court-line/70">
                  San Francisco Tournament
                  <span className="ml-2 inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400 animate-pulse" />
                    Live
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className="min-h-[44px] px-4 py-2.5 rounded-lg bg-court-line/20 text-court-line hover:bg-court-line/30 active:bg-court-line/40 transition-colors text-sm font-medium touch-manipulation w-full sm:w-auto"
              >
                Copy link to share
              </button>
              {apiReady === false && (
                <p className="text-amber-400/90 text-xs">Set MINIMAX_API_KEY for AI</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <SignUpForm />
            <ParticipantsList participants={participants} />
          </div>
          <div className="lg:col-span-2 order-1 lg:order-2">
            <DrawTabs singlesDraw={singlesDraw} doublesDraw={doublesDraw} />
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
