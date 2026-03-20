import { useState, useRef, useEffect } from 'react'
import { Participant } from '../lib/tournament'
import { TournamentDraw } from '../lib/tournament'
import { chat } from '../lib/minimaxApi'
import { getRoundName } from '../lib/tournament'

interface TournamentAssistantProps {
  participants: Participant[]
  draw: TournamentDraw | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function TournamentAssistant({ participants, draw }: TournamentAssistantProps) {
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
    if (draw && draw.matches.length > 0) {
      const byRound = draw.matches.reduce<Record<number, typeof draw.matches>>((acc, m) => {
        if (!acc[m.round]) acc[m.round] = []
        acc[m.round].push(m)
        return acc
      }, {})
      const roundLines = Object.keys(byRound).sort((a, b) => +a - +b).map((r) => {
        const ms = byRound[+r]
        return `${getRoundName(+r)}: ${ms.map((m) => {
          const p1 = m.player1?.name ?? 'TBD'
          const p2 = m.player2?.name ?? 'TBD'
          return `${p1} vs ${p2}`
        }).join('; ')}`
      })
      parts.push('Draw: ' + roundLines.join('. '))
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
      const systemContent = `You are a helpful tennis tournament assistant for the SF Tennis Matchmaker. Answer questions about the draw, matchups, scheduling, and participants. Be concise and friendly.

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
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-court-accent text-court-green font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        title="Tournament Assistant"
      >
        💬
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-[70vh] max-h-[500px] rounded-xl border border-court-line/20 bg-court-green/95 backdrop-blur flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-court-line/20">
              <h3 className="font-display text-lg tracking-wider text-court-line">
                TOURNAMENT ASSISTANT
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-court-line/70 hover:text-court-line"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <p className="text-court-line/60 text-sm">
                  Ask about the draw, matchups, scheduling, or participants. Try: &quot;Who plays in the first round?&quot; or &quot;Summarize the bracket.&quot;
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
                      m.role === 'user'
                        ? 'bg-court-accent text-court-green'
                        : 'bg-black/30 text-court-line border border-court-line/20'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-black/30 rounded-lg px-4 py-2 text-court-line/60 text-sm">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-court-line/20">
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
                  className="flex-1 px-4 py-2.5 rounded-lg bg-black/30 border border-court-line/20 text-court-line placeholder-court-line/50 focus:outline-none focus:ring-2 focus:ring-court-accent/50 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-4 py-2.5 rounded-lg bg-court-accent text-court-green font-semibold hover:bg-court-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
