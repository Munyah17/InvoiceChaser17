import { createClient } from '@supabase/supabase-js'

export async function verifyJWT(token, supabaseUrl, serviceRoleKey) {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { user: null, error: error?.message || 'Invalid token' }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      error: null,
    }
  } catch (err) {
    return {
      user: null,
      error: err.message,
    }
  }
}

// Verifies the Bearer token on a request for ANY authenticated user.
// Returns { user } on success, or { status, error } to send back.
// Use this for per-user resources (accounting, recurring invoices, etc.) —
// NOT verifyAdmin, which would wrongly lock regular customers out.
export async function verifyUser(req, supabaseUrl, serviceRoleKey) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return { status: 401, error: 'Missing authorization' }
  }

  const { user, error } = await verifyJWT(auth.slice(7), supabaseUrl, serviceRoleKey)
  if (error || !user) {
    return { status: 401, error: 'Invalid token' }
  }

  return { user }
}

// Verifies the Bearer token on a request and checks the caller is admin/super_admin.
// Returns { user, role } on success, or { status, error } to send back.
export async function verifyAdmin(req, supabase, supabaseUrl, serviceRoleKey) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return { status: 401, error: 'Missing authorization' }
  }

  const { user, error } = await verifyJWT(auth.slice(7), supabaseUrl, serviceRoleKey)
  if (error || !user) {
    return { status: 403, error: 'Invalid token' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { status: 403, error: 'Not authorized' }
  }

  return { user, role: profile.role }
}
