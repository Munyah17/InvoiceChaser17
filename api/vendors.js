import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from './_lib/verify-jwt.js'

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
    const auth = await verifyAdmin(req, supabase, supabaseUrl, serviceRoleKey)
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error })
    }

    const userId = auth.user.id

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name')

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ vendors: data })
    }

    if (req.method === 'POST') {
      const { name, email, phone, address, city, country, tax_id, currency, payment_terms } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Vendor name is required' })
      }

      const { data, error } = await supabase
        .from('vendors')
        .insert([{
          user_id: userId,
          name,
          email,
          phone,
          address,
          city,
          country,
          tax_id,
          currency: currency || 'USD',
          payment_terms,
        }])
        .select()

      if (error) return res.status(400).json({ error: error.message })
      return res.status(201).json({ vendor: data[0] })
    }

    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body

      if (!id) return res.status(400).json({ error: 'Missing vendor ID' })

      const { data, error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ vendor: data[0] })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body

      if (!id) return res.status(400).json({ error: 'Missing vendor ID' })

      // Soft delete
      const { error } = await supabase
        .from('vendors')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', userId)

      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('❌ Vendors error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
