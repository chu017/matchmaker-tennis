import { useState, useRef, useEffect } from 'react'
import { Participant } from '../lib/tournament'
import { TournamentDraw } from '../lib/tournament'
import { chat } from '../lib/minimaxApi'
import { getRoundName } from '../lib/tournament'
import { DOUBLES_ENABLED } from '../lib/featureFlags'

interface TournamentAssistantProps {
  participants: Participant[]
  singlesDraw: TournamentDraw | null
  doublesDraw: TournamentDraw | null
  /** Extra line for AI context (e.g. waiting list counts) */
  waitingListNote?: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function formatDraw(draw: TournamentDraw): string {
  const byRound = draw.matches.reduce<Record<number, typeof draw.matches>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round].push(m)
    return acc
  }, {})
  return Object.keys(byRound).sort((a, b) => +a - +b).map((r) => {
    const ms = byRound[+r]
    return `${getRoundName(+r)}: ${ms.map((m) => {
      const p1 = m.player1?.name ?? 'TBD'
      const p2 = m.player2?.name ?? 'TBD'
      return `${p1} vs ${p2}`
    }).join('; ')}`
  }).join('. ')
}

export function TournamentAssistant({
  participants,
  singlesDraw,
  doublesDraw,
  waitingListNote,
}: TournamentAssistantProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages])

  const buildContext = (): string => {
    const parts: string[] = []
    if (participants.length > 0) {
      parts.push('Participants: ' + participants.map((p) => {
        const extras = [p.seed && `seed ${p.seed}`, p.rating && `rating ${p.rating}`].filter(Boolean)
        return `${p.name}${extras.length ? ` (${extras.join(', ')})` : ''}`
      }).join('; '))
    }
    if (singlesDraw?.matches.length) {
      parts.push('Singles draw: ' + formatDraw(singlesDraw))
    }
    if (DOUBLES_ENABLED && doublesDraw?.matches.length) {
      parts.push('Doubles draw: ' + formatDraw(doublesDraw))
    }
    if (waitingListNote) {
      parts.push(waitingListNote)
    }
    return parts.length ? parts.join('\n') : 'No participants or draw yet.'
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    const userMsg: Message = { role: 'user', content: text }
    setMessages((m) => [...m, userMsg])
    setLoading(true)

    try {
      const systemContent = `You are a helpful tennis tournament assistant for SF Tennis Open. Answer questions about the draw, matchups, scheduling, and participants. Be concise and friendly.
${!DOUBLES_ENABLED ? '\nThis event is singles-only. Do not suggest signing up for doubles.\n' : ''}
The main draw is the first 16 people to sign up (by signup time); later sign-ups are on a waiting list. Bracket seeds are still by NTRP within those 16.
Current tournament state:
${buildContext()}`

      const apiMessages = [
        { role: 'system' as const, content: systemContent },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text },
      ]

      const content = await chat(apiMessages)
      setMessages((m) => [...m, { role: 'assistant', content }])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 sm:right-6 w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-pink-primary text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center touch-manipulation z-40"
        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
        title="Tournament Assistant"
      >
        💬
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-0 sm:p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-[85vh] sm:h-[70vh] max-h-[500px] rounded-t-2xl sm:rounded-2xl border border-pink-soft bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-pink-soft">
              <h3 className="font-display text-lg tracking-wider text-pink-text">
                TOURNAMENT ASSISTANT
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-pink-text-muted hover:text-pink-text touch-manipulation"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-pink-soft/20">
              {messages.length === 0 && (
                <p className="text-pink-text-muted text-sm">
                  Ask about the draw, matchups, scheduling, or participants. Try: &quot;Who plays in the first round?&quot; or &quot;Summarize the bracket.&quot;
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2 ${
                      m.role === 'user'
                        ? 'bg-pink-primary text-white'
                        : 'bg-white border border-pink-soft text-pink-text shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-xl px-4 py-2 border border-pink-soft text-pink-text-muted text-sm">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-pink-soft bg-white pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend() }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about the draw..."
                  disabled={loading}
                  className="flex-1 min-h-[44px] px-4 py-3 rounded-xl bg-pink-soft/60 border-0 text-pink-text placeholder-pink-text-muted focus:outline-none focus:ring-2 focus:ring-pink-primary/40 disabled:opacity-50 touch-manipulation"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="min-h-[44px] px-4 py-3 rounded-xl bg-pink-primary text-white font-semibold hover:bg-pink-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation shrink-0"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
