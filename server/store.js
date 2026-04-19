/**
 * Data store: Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, else JSON files.
 *
 * Loads `.env` from the project root (parent of `server/`) so the backend works even when
 * `process.cwd()` is not the repo root. Store backend is chosen lazily on each call so it
 * matches current env after dotenv runs.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import * as jsonStore from './store-json.js';
import * as supabaseStore from './store-supabase.js';

const __storeDir = path.dirname(fileURLToPath(import.meta.url));
const ROOT_ENV = path.join(__storeDir, '..', '.env');

let envLoaded = false;

function ensureEnv() {
  if (envLoaded) return;
  envLoaded = true;
  if (existsSync(ROOT_ENV)) {
    dotenv.config({ path: ROOT_ENV });
  } else {
    dotenv.config();
  }
}

function useSupabase() {
  ensureEnv();
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

function getImpl() {
  ensureEnv();
  return useSupabase() ? supabaseStore : jsonStore;
}

export const getParticipants = (...args) => getImpl().getParticipants(...args);
export const addParticipant = (...args) => getImpl().addParticipant(...args);
export const updateParticipant = (...args) => getImpl().updateParticipant(...args);
export const deleteParticipant = (...args) => getImpl().deleteParticipant(...args);
export const getMatchResults = (...args) => getImpl().getMatchResults(...args);
export const setMatchResult = (...args) => getImpl().setMatchResult(...args);
export const clearMatchResult = (...args) => getImpl().clearMatchResult(...args);
export const clearMatchResults = (...args) => getImpl().clearMatchResults(...args);
export const getEventPlan = (...args) => getImpl().getEventPlan(...args);
export const setEventPlan = (...args) => getImpl().setEventPlan(...args);
export const getBracketAdmin = (...args) => getImpl().getBracketAdmin(...args);
export const setBracketAdmin = (...args) => getImpl().setBracketAdmin(...args);

export function getStoreBackend() {
  return useSupabase() ? 'supabase' : 'json';
}
