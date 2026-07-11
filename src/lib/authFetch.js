import { supabase } from './supabase'

// fetch() wrapper that attaches the current Supabase access token.
// The store's `user` object has no `.token` — the token lives on the session —
// so every authenticated API call must pull it fresh from supabase.auth here.
export async function authFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'

  return fetch(path, { ...options, headers })
}
