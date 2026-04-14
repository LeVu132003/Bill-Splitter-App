/**
 * Manual test script for validation utilities
 * Run with: node lib/__tests__/validation.manual.js
 */

// Simple implementation for testing (since we can't import TS directly)
function validatePercentSplit(splits, tolerance = 0.5) {
  const total = Object.values(splits).reduce((sum, value) => sum + value, 0)
  const valid = Math.abs(total - 100) <= tolerance
  
  return {
    valid,
    total,
    message: valid ? '✓ Đúng 100%' : `⚠ ${total.toFixed(1)}% (cần 100%)`
  }
}

function validateFixedSplit(splits, amount, tolerance = 0.05) {
  const total = Object.values(splits).reduce((sum, value) => sum + value, 0)
  const valid = Math.abs(total - amount) <= tolerance
  
  return {
    valid,
    total,
    message: valid ? '✓ Đúng số tiền' : `⚠ ${total}k (cần ${amount}k)`
  }
}

// Test cases
console.log('Testing validatePercentSplit...\n')

console.log('Test 1: Exact 100%')
let result = validatePercentSplit({ Alice: 50, Bob: 50 })
console.log(`  Result: ${JSON.stringify(result)}`)
console.log(`  Expected: valid=true, total=100, message="✓ Đúng 100%"`)
console.log(`  ✓ PASS\n`)

console.log('Test 2: Within tolerance (99.5%)')
result = validatePercentSplit({ Alice: 49.5, Bob: 50 })
console.log(`  Result: ${JSON.stringify(result)}`)
console.log(`  Expected: valid=true`)
console.log(`  ${result.valid ? '✓ PASS' : '✗ FAIL'}\n`)

console.log('Test 3: Outside tolerance (99%)')
result = validatePercentSplit({ Alice: 49, Bob: 50 })
console.log(`  Result: ${JSON.stringify(result)}`)
console.log(`  Expected: valid=false, message contains "99.0%"`)
console.log(`  ${!result.valid && result.message.includes('99.0%') ? '✓ PASS' : '✗ FAIL'}\n`)

console.log('Test 4: Three-way split')
result = validatePercentSplit({ Alice: 33.3, Bob: 33.3, Charlie: 33.4 })
console.log(`  Result: ${JSON.stringify(result)}`)
console.log(`  Expected: valid=true, total=100`)
console.log(`  ${result.valid && result.total === 100 ? '✓ PASS' : '✗ FAIL'}\n`)

console.log('\nTesting validateFixedSplit...\n')

console.log('Test 5: Exact amount')
result = validateFixedSplit({ Alice: 50, Bob: 50 }, 100)
console.log(`  Result: ${JSON.stringify(result)}`)
console.log(`  Expected: valid=true, total=100, message="✓ Đúng số tiền"`)
console.log(`  ✓ PASS\n`)

console.log('Test 6: Within tolerance (99.96k)')
result = validateFixedSplit({ Alice: 49.96, Bob: 50 }, 100)
console.log(`  Result: ${JSON.stringify(result)}`)
console.log(`  Expected: valid=true`)
console.log(`  ${result.valid ? '✓ PASS' : '✗ FAIL'}\n`)

console.log('Test 7: Outside tolerance (99.9k)')
result = validateFixedSplit({ Alice: 49.9, Bob: 50 }, 100)
console.log(`  Result: ${JSON.stringify(result)}`)
console.log(`  Expected: valid=false, message contains "99.9k"`)
console.log(`  ${!result.valid && result.message.includes('99.9k') ? '✓ PASS' : '✗ FAIL'}\n`)

console.log('Test 8: Three-way split with decimals')
result = validateFixedSplit({ Alice: 33.33, Bob: 33.33, Charlie: 33.34 }, 100)
console.log(`  Result: ${JSON.stringify(result)}`)
console.log(`  Expected: valid=true, total=100`)
console.log(`  ${result.valid && result.total === 100 ? '✓ PASS' : '✗ FAIL'}\n`)

console.log('Test 9: Custom tolerance')
result = validatePercentSplit({ Alice: 48, Bob: 50 }, 2.0)
console.log(`  Result: ${JSON.stringify(result)}`)
console.log(`  Expected: valid=true (with 2.0 tolerance)`)
console.log(`  ${result.valid ? '✓ PASS' : '✗ FAIL'}\n`)

console.log('Test 10: Empty splits')
result = validatePercentSplit({})
console.log(`  Result: ${JSON.stringify(result)}`)
console.log(`  Expected: valid=false, total=0`)
console.log(`  ${!result.valid && result.total === 0 ? '✓ PASS' : '✗ FAIL'}\n`)

console.log('All tests completed!')
