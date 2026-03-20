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
      <header className="border-b border-court-line/20 bg-court-green/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-court-line/20 flex items-center justify-center">
                <span className="text-xl">🎾</span>
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl tracking-wider text-court-line">
                  SF TENNIS MATCHMAKER
                </h1>
                <p className="text-sm text-court-line/70">
                San Francisco Tournament
                <span className="ml-2 inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-lg bg-court-line/20 text-court-line hover:bg-court-line/30 transition-colors text-sm font-medium"
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
          <div className="lg:col-span-2">
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
