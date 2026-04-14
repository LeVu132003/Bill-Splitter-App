/**
 * Setup Test Room for Checkpoint 2
 * Creates a test room with code TEST01 if it doesn't exist
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mfbbpxdxtmpessivfitn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYmJweGR4dG1wZXNzaXZmaXRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjAxNTk2NywiZXhwIjoyMDkxNTkxOTY3fQ.lRiTgBm1COW6VNGHPMzFGM1vDgrOlLuYc4Vm9vgCbxQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupTestRoom() {
  const roomCode = 'TEST01'
  
  console.log('🔧 Setting up test room...')
  
  // Check if room exists
  const { data: existing } = await supabase
    .from('rooms')
    .select('code')
    .eq('code', roomCode)
    .single()
  
  if (existing) {
    console.log(`✓ Test room ${roomCode} already exists`)
    return
  }
  
  // Create test room
  const roomState = {
    name: 'Test Room for Checkpoint 2',
    members: [
      { name: 'Alice', pin: '' },
      { name: 'Bob', pin: '' },
    ],
    txs: [],
    created: Date.now(),
    settled: {},
  }
  
  const { error } = await supabase
    .from('rooms')
    .insert({
      code: roomCode,
      data: roomState,
      updated_at: new Date().toISOString(),
    })
  
  if (error) {
    console.error('❌ Failed to create test room:', error)
    process.exit(1)
  }
  
  console.log(`✓ Created test room ${roomCode}`)
  console.log(`  Name: ${roomState.name}`)
  console.log(`  Members: ${roomState.members.map(m => m.name).join(', ')}`)
}

setupTestRoom().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
