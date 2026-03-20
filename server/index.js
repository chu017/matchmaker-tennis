/**
 * MiniMax API proxy - keeps API key server-side
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getParticipants, addParticipant } from './store.js';

const app = express();
const PORT = process.env.PORT || 3001;
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;

app.use(cors({ origin: true }));
app.use(express.json());

async function callMiniMax(messages, options = {}) {
  if (!MINIMAX_API_KEY) {
    throw new Error('MINIMAX_API_KEY not set. Add it to .env or environment.');
  }
  const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'M2-her',
      messages,
      max_completion_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
    }),
  });
  const data = await res.json();
  if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
    throw new Error(data.base_resp?.status_msg || `API error: ${data.base_resp?.status_code}`);
  }
  const content = data.choices?.[0]?.message?.content ?? '';
  return content;
}

// Chat completion (for Tournament Assistant)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }
    const content = await callMiniMax(messages);
    res.json({ content });
  } catch (err) {
    console.error('MiniMax chat error:', err);
    res.status(500).json({ error: err.message || 'MiniMax API error' });
  }
});

// Seeding suggestions
app.post('/api/seeding-suggestions', async (req, res) => {
  try {
    const { playerDescriptions } = req.body;
    if (!playerDescriptions || typeof playerDescriptions !== 'string') {
      return res.status(400).json({ error: 'playerDescriptions string required' });
    }

    const systemPrompt = `You are a tennis tournament organizer. Given descriptions of players, suggest seeds (1 = strongest) and Elo ratings (1500 = average, 2400 = top pro level).

Respond ONLY with a valid JSON array, no other text. Format:
[{"name": "Player Name", "seed": 1, "rating": 2400}, ...]

Rules:
- Assign seeds 1, 2, 3... based on described skill level
- Rating: 2400 for elite, 2200 for strong, 2000 for good, 1800 for intermediate, 1500 for unknown/average
- Include every player mentioned in the descriptions
- Use exact names as given`;

    const content = await callMiniMax([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: playerDescriptions },
    ], { temperature: 0.3 });

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
    res.json({ suggestions: parsed });
  } catch (err) {
    console.error('Seeding suggestions error:', err);
    res.status(500).json({ error: err.message || 'Failed to get suggestions' });
  }
});

app.get('/api/health', (_, res) => {
  res.json({ ok: true, hasKey: !!MINIMAX_API_KEY });
});

app.get('/api/participants', (_, res) => {
  try {
    res.json({ participants: getParticipants() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/participants', (req, res) => {
  try {
    const { name, rating, type, partnerName } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const participant = addParticipant({
      name: name.trim(),
      rating: rating != null ? Number(rating) : 1500,
      type: type === 'doubles' ? 'doubles' : 'singles',
      partnerName: type === 'doubles' && partnerName ? String(partnerName).trim() : null,
    });
    res.status(201).json(participant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (!MINIMAX_API_KEY) console.warn('Warning: MINIMAX_API_KEY not set');
});
