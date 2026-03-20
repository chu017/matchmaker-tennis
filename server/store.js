/**
 * Simple JSON file storage for participants and match results
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'participants.json');
const MATCH_RESULTS_FILE = path.join(__dirname, 'match-results.json');

function read() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { participants: [] };
  }
}

function write(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function readMatchResults() {
  try {
    const data = fs.readFileSync(MATCH_RESULTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { singles: {}, doubles: {} };
  }
}

function writeMatchResults(data) {
  fs.writeFileSync(MATCH_RESULTS_FILE, JSON.stringify(data, null, 2));
}

export function getParticipants() {
  return read().participants;
}

export function addParticipant(participant) {
  const data = read();
  const id = crypto.randomUUID();
  const entry = {
    id,
    name: participant.name.trim(),
    rating: participant.rating ?? 3.0,
    type: participant.type || 'singles',
    partnerName: participant.partnerName?.trim() || null,
    createdAt: new Date().toISOString(),
  };
  data.participants.push(entry);
  write(data);
  return entry;
}

export function deleteParticipant(id) {
  const data = read();
  const idx = data.participants.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const [removed] = data.participants.splice(idx, 1);
  write(data);
  return removed;
}

export function getMatchResults() {
  return readMatchResults();
}

export function setMatchResult(type, matchId, winnerId, score = null) {
  const data = readMatchResults();
  const key = type === 'doubles' ? 'doubles' : 'singles';
  data[key][matchId] = { winnerId, score: score?.trim() || null };
  writeMatchResults(data);
  return data;
}

export function clearMatchResult(type, matchId) {
  const data = readMatchResults();
  const key = type === 'doubles' ? 'doubles' : 'singles';
  delete data[key][matchId];
  writeMatchResults(data);
  return data;
}
