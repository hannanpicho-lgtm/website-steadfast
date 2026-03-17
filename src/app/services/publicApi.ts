import { publicAnonKey } from '../../../utils/supabase/info';

export function buildPublicApiHeaders(contentType = false): Record<string, string> {
  return {
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
  };
}