/**
 * Simple JSON file storage for participants
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'participants.json');

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
