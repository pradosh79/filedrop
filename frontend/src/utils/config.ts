/**
 * Get the API base URL.
 * Priority:
 *  1. window.FILEDROP_CONFIG.apiUrl (set in public/config.js - runtime, no rebuild needed)
 *  2. VITE_API_URL environment variable (baked in at build time)
 *  3. Fallback to localhost for local development
 */
export function getApiUrl(): string {
  const win = window as any;
  return (
    win?.FILEDROP_CONFIG?.apiUrl ||
    (import.meta as any).env?.VITE_API_URL ||
    'http://localhost:3000/api/v1'
  );
}
