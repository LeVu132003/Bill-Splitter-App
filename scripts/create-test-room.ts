/**
 * Script to create a test room for checkpoint 2 verification
 * Run with: npx tsx scripts/create-test-room.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestRoom() {
  const roomCode = 'TEST01'
  const roomData = {
    name: 'Test Room - Checkpoint 2',
    members: [
      { name: 'Alice', pin: '' },
      { name: 'Bob', pin: '' },
      { name: 'Charlie', pin: '' },
    ],
    txs: [],
    created: Date.now(),
    settled: {},
  }

  console.log('🔧 Creating test room...')
  console.log(`   Code: ${roomCode}`)
  console.log(`   Name: ${roomData.name}`)
  console.log(`   Members: ${roomData.members.map(m => m.name).join(', ')}`)

  // Check if room already exists
  const { data: existing } = await supabase
    .from('rooms')
    .select('code')
    .eq('code', roomCode)
    .single()

  if (existing) {
    console.log('⚠️  Room already exists, updating...')
    const { error } = await supabase
      .from('rooms')
      .update({ data: roomData, updated_at: new Date().toISOString() })
      .eq('code', roomCode)

    if (error) {
      console.error('❌ Failed to update room:', error)
      process.exit(1)
    }
  } else {
    const { error } = await supabase
      .from('rooms')
      .insert({
        code: roomCode,
        data: roomData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('❌ Failed to create room:', error)
      process.exit(1)
    }
  }

  console.log('✅ Test room created successfully!')
  console.log('')
  console.log('📋 Test URLs:')
  console.log(`   Guest entry: http://localhost:3001/guest`)
  console.log(`   Deep link:   http://localhost:3001/guest?r=${roomCode}`)
  console.log(`   Room page:   http://localhost:3001/room/${roomCode}`)
  console.log('')
  console.log('🧪 Test credentials:')
  console.log('   Members: Alice, Bob, Charlie (no PIN set yet)')
  console.log('   Admin: name="admin", PIN="132003"')
}

createTestRoom().catch(console.error)
