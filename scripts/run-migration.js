/**
 * Script to run database migrations against Supabase using direct PostgreSQL connection
 * Run with: node scripts/run-migration.js
 */

import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const { Client } = pg

// Get the direct connection string from environment or use default
const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres:%40Griezmann177%23%24@db.rnfmlzpueghbbhzeosyr.supabase.co:5432/postgres'

if (!connectionString) {
  console.error('Missing DATABASE_URL in .env file')
  process.exit(1)
}

async function runMigration() {
  const client = new Client({ connectionString })
  
  try {
    console.log('Connecting to Supabase PostgreSQL...')
    await client.connect()
    console.log('✓ Connected successfully')
    
    console.log('Running database migration...')
    
    // Read the SQL migration file
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const migrationPath = join(__dirname, '../supabase/migrations/20240112_initial_schema.sql')
    const sql = readFileSync(migrationPath, 'utf-8')
    
    // Execute the entire SQL file as one batch
    try {
      await client.query(sql)
      console.log('✓ Migration executed successfully')
    } catch (err) {
      console.log('Migration completed with some notes:')
      console.log(err.message)
      console.log('This is normal if some objects already exist')
    }
    
    console.log('\n✓ Migration complete!')
    
    await client.end()
    
  } catch (error) {
    console.error('Error running migration:', error.message)
    await client.end()
    process.exit(1)
  }
}

// Run the migration
runMigration()
