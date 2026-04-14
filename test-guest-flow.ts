/**
 * Checkpoint 2: Guest Flow End-to-End Test
 * 
 * This script tests the complete guest flow:
 * 1. Room code validation
 * 2. Member selection
 * 3. PIN entry and authentication
 * 4. Session management
 */

const BASE_URL = 'http://localhost:3000'

interface TestResult {
  scenario: string
  passed: boolean
  error?: string
  details?: string
}

const results: TestResult[] = []

function logResult(scenario: string, passed: boolean, error?: string, details?: string) {
  results.push({ scenario, passed, error, details })
  const icon = passed ? '✓' : '✗'
  console.log(`${icon} ${scenario}`)
  if (error) console.log(`  Error: ${error}`)
  if (details) console.log(`  Details: ${details}`)
}

async function testRoomValidation() {
  console.log('\n=== Testing Room Validation API ===')
  
  // Test 1: Valid room code
  try {
    const response = await fetch(`${BASE_URL}/api/rooms/validate?code=TEST01`)
    if (response.ok) {
      const data = await response.json()
      if (data.exists && data.name && data.members) {
        logResult('Valid room code returns room data', true, undefined, `Room: ${data.name}, Members: ${data.members.length}`)
      } else {
        logResult('Valid room code returns room data', false, 'Missing expected fields in response')
      }
    } else {
      logResult('Valid room code returns room data', false, `HTTP ${response.status}`)
    }
  } catch (err) {
    logResult('Valid room code returns room data', false, err instanceof Error ? err.message : 'Unknown error')
  }

  // Test 2: Invalid room code
  try {
    const response = await fetch(`${BASE_URL}/api/rooms/validate?code=INVALID`)
    if (response.status === 404) {
      logResult('Invalid room code returns 404', true)
    } else {
      logResult('Invalid room code returns 404', false, `Expected 404, got ${response.status}`)
    }
  } catch (err) {
    logResult('Invalid room code returns 404', false, err instanceof Error ? err.message : 'Unknown error')
  }

  // Test 3: Missing room code
  try {
    const response = await fetch(`${BASE_URL}/api/rooms/validate`)
    if (response.status === 400) {
      logResult('Missing room code returns 400', true)
    } else {
      logResult('Missing room code returns 400', false, `Expected 400, got ${response.status}`)
    }
  } catch (err) {
    logResult('Missing room code returns 400', false, err instanceof Error ? err.message : 'Unknown error')
  }
}

async function testAddMember() {
  console.log('\n=== Testing Add Member API ===')
  
  const testMemberName = `TestUser_${Date.now()}`
  
  // Test 1: Add new member
  try {
    const response = await fetch(`${BASE_URL}/api/rooms/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: 'TEST01',
        memberName: testMemberName,
      }),
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.members) {
        const memberExists = data.members.some((m: any) => m.name === testMemberName)
        if (memberExists) {
          logResult('Add new member succeeds', true, undefined, `Added: ${testMemberName}`)
        } else {
          logResult('Add new member succeeds', false, 'Member not found in returned list')
        }
      } else {
        logResult('Add new member succeeds', false, 'Missing expected fields in response')
      }
    } else {
      const error = await response.json()
      logResult('Add new member succeeds', false, `HTTP ${response.status}: ${error.error}`)
    }
  } catch (err) {
    logResult('Add new member succeeds', false, err instanceof Error ? err.message : 'Unknown error')
  }

  // Test 2: Add duplicate member
  try {
    const response = await fetch(`${BASE_URL}/api/rooms/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: 'TEST01',
        memberName: testMemberName,
      }),
    })
    
    if (response.status === 400) {
      const error = await response.json()
      if (error.error.includes('đã có trong phòng')) {
        logResult('Duplicate member returns error', true)
      } else {
        logResult('Duplicate member returns error', false, 'Wrong error message')
      }
    } else {
      logResult('Duplicate member returns error', false, `Expected 400, got ${response.status}`)
    }
  } catch (err) {
    logResult('Duplicate member returns error', false, err instanceof Error ? err.message : 'Unknown error')
  }
}

async function testGuestJoin() {
  console.log('\n=== Testing Guest Join API ===')
  
  const testMemberName = `JoinTest_${Date.now()}`
  const testPIN = '123456'
  
  // First, add the member
  await fetch(`${BASE_URL}/api/rooms/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomCode: 'TEST01',
      memberName: testMemberName,
    }),
  })
  
  // Test 1: First-time PIN creation
  try {
    const response = await fetch(`${BASE_URL}/api/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'TEST01',
        memberName: testMemberName,
        pin: testPIN,
        isGuest: true,
      }),
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.sessionData) {
        logResult('First-time PIN creation succeeds', true, undefined, `Member: ${data.sessionData.memberName}`)
      } else {
        logResult('First-time PIN creation succeeds', false, 'Missing session data')
      }
    } else {
      const error = await response.json()
      logResult('First-time PIN creation succeeds', false, `HTTP ${response.status}: ${error.error}`)
    }
  } catch (err) {
    logResult('First-time PIN creation succeeds', false, err instanceof Error ? err.message : 'Unknown error')
  }
  
  // Test 2: Correct PIN verification
  try {
    const response = await fetch(`${BASE_URL}/api/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'TEST01',
        memberName: testMemberName,
        pin: testPIN,
        isGuest: true,
      }),
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.sessionData) {
        logResult('Correct PIN verification succeeds', true)
      } else {
        logResult('Correct PIN verification succeeds', false, 'Missing session data')
      }
    } else {
      logResult('Correct PIN verification succeeds', false, `HTTP ${response.status}`)
    }
  } catch (err) {
    logResult('Correct PIN verification succeeds', false, err instanceof Error ? err.message : 'Unknown error')
  }
  
  // Test 3: Incorrect PIN verification
  try {
    const response = await fetch(`${BASE_URL}/api/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'TEST01',
        memberName: testMemberName,
        pin: '999999',
        isGuest: true,
      }),
    })
    
    if (response.status === 401) {
      logResult('Incorrect PIN returns 401', true)
    } else {
      logResult('Incorrect PIN returns 401', false, `Expected 401, got ${response.status}`)
    }
  } catch (err) {
    logResult('Incorrect PIN returns 401', false, err instanceof Error ? err.message : 'Unknown error')
  }
}

async function testAdminAccount() {
  console.log('\n=== Testing Admin Account ===')
  
  // First, add admin member if not exists
  await fetch(`${BASE_URL}/api/rooms/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomCode: 'TEST01',
      memberName: 'admin',
    }),
  }).catch(() => {}) // Ignore error if already exists
  
  // Test admin PIN
  try {
    const response = await fetch(`${BASE_URL}/api/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'TEST01',
        memberName: 'admin',
        pin: '132003',
        isGuest: true,
      }),
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.sessionData && data.sessionData.isAdmin) {
        logResult('Admin account with correct PIN grants admin privileges', true)
      } else {
        logResult('Admin account with correct PIN grants admin privileges', false, 'isAdmin flag not set')
      }
    } else {
      logResult('Admin account with correct PIN grants admin privileges', false, `HTTP ${response.status}`)
    }
  } catch (err) {
    logResult('Admin account with correct PIN grants admin privileges', false, err instanceof Error ? err.message : 'Unknown error')
  }
}

async function runAllTests() {
  console.log('🧪 Starting Checkpoint 2: Guest Flow End-to-End Tests\n')
  console.log(`Testing against: ${BASE_URL}\n`)
  
  await testRoomValidation()
  await testAddMember()
  await testGuestJoin()
  await testAdminAccount()
  
  // Summary
  console.log('\n=== Test Summary ===')
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length
  
  console.log(`Total: ${total}`)
  console.log(`Passed: ${passed} ✓`)
  console.log(`Failed: ${failed} ✗`)
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed. Please review the errors above.')
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!')
    process.exit(0)
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
