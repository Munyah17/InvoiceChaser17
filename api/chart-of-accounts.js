import { createClient } from '@supabase/supabase-js'
import { verifyUser } from './_lib/verify-jwt.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceRoleKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const auth = await verifyUser(req, supabaseUrl, serviceRoleKey)
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error })
    }

    const userId = auth.user.id

    // GET: List all accounts for user
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('type, account_number')

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      return res.status(200).json({ accounts: data })
    }

    // POST: Create new account
    if (req.method === 'POST') {
      const { account_number, name, type, subtype, currency, description } = req.body

      if (!name || !type) {
        return res.status(400).json({ error: 'Missing required fields: name, type' })
      }

      const { data, error } = await supabase
        .from('accounts')
        .insert([{
          user_id: userId,
          account_number,
          name,
          type,
          subtype,
          currency: currency || 'USD',
          description,
        }])
        .select()

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      return res.status(201).json({ account: data[0] })
    }

    // PUT: Update account
    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Missing account ID' })
      }

      const { data, error } = await supabase
        .from('accounts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      return res.status(200).json({ account: data[0] })
    }

    // DELETE: Delete account (only if no transactions)
    if (req.method === 'DELETE') {
      const { id } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Missing account ID' })
      }

      // Check if account has transactions
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', id)

      if (countError) {
        return res.status(400).json({ error: countError.message })
      }

      if (count > 0) {
        return res.status(400).json({ error: 'Cannot delete account with existing transactions' })
      }

      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('❌ Chart of Accounts error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
