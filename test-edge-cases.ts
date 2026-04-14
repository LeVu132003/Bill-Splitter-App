import { calculateBalances, calculateTransfers, type BalanceRow } from './lib/balance'
import type { Member, Tx } from './lib/types'

console.log('=== Testing Edge Cases for calculateTransfers ===\n')

// Edge Case 1: All balanced (no transfers needed)
console.log('Edge Case 1: All balanced')
const balances1 = new Map<string, BalanceRow>([
  ['Alice', { name: 'Alice', spent: 100, owed: 100, net: 0, breakdown: [] }],
  ['Bob', { name: 'Bob', spent: 100, owed: 100, net: 0, breakdown: [] }],
  ['Charlie', { name: 'Charlie', spent: 100, owed: 100, net: 0, breakdown: [] }]
])
const transfers1 = calculateTransfers(balances1)
console.log(`Result: ${transfers1.length === 0 ? '✓ PASS' : '✗ FAIL'} - Expected 0 transfers, got ${transfers1.length}`)
console.log()

// Edge Case 2: Single debtor, single creditor
console.log('Edge Case 2: Single debtor, single creditor')
const balances2 = new Map<string, BalanceRow>([
  ['Alice', { name: 'Alice', spent: 100, owed: 0, net: 100, breakdown: [] }],
  ['Bob', { name: 'Bob', spent: 0, owed: 100, net: -100, breakdown: [] }]
])
const transfers2 = calculateTransfers(balances2)
console.log(`Result: ${transfers2.length === 1 ? '✓ PASS' : '✗ FAIL'} - Expected 1 transfer, got ${transfers2.length}`)
if (transfers2.length === 1) {
  const t = transfers2[0]
  console.log(`  Transfer: ${t.from} → ${t.to}: ${t.amountK}k`)
  console.log(`  ${t.from === 'Bob' && t.to === 'Alice' && t.amountK === 100 ? '✓ PASS' : '✗ FAIL'} - Correct transfer details`)
}
console.log()

// Edge Case 3: Single creditor, multiple debtors
console.log('Edge Case 3: Single creditor, multiple debtors')
const balances3 = new Map<string, BalanceRow>([
  ['Alice', { name: 'Alice', spent: 300, owed: 0, net: 300, breakdown: [] }],
  ['Bob', { name: 'Bob', spent: 0, owed: 100, net: -100, breakdown: [] }],
  ['Charlie', { name: 'Charlie', spent: 0, owed: 100, net: -100, breakdown: [] }],
  ['David', { name: 'David', spent: 0, owed: 100, net: -100, breakdown: [] }]
])
const transfers3 = calculateTransfers(balances3)
console.log(`Result: ${transfers3.length === 3 ? '✓ PASS' : '✗ FAIL'} - Expected 3 transfers, got ${transfers3.length}`)
const totalTransferred3 = transfers3.reduce((sum, t) => sum + t.amountK, 0)
console.log(`  Total transferred: ${totalTransferred3}k`)
console.log(`  ${totalTransferred3 === 300 ? '✓ PASS' : '✗ FAIL'} - Total matches creditor amount`)
console.log()

// Edge Case 4: Multiple creditors, single debtor
console.log('Edge Case 4: Multiple creditors, single debtor')
const balances4 = new Map<string, BalanceRow>([
  ['Alice', { name: 'Alice', spent: 100, owed: 0, net: 100, breakdown: [] }],
  ['Bob', { name: 'Bob', spent: 100, owed: 0, net: 100, breakdown: [] }],
  ['Charlie', { name: 'Charlie', spent: 100, owed: 0, net: 100, breakdown: [] }],
  ['David', { name: 'David', spent: 0, owed: 300, net: -300, breakdown: [] }]
])
const transfers4 = calculateTransfers(balances4)
console.log(`Result: ${transfers4.length === 3 ? '✓ PASS' : '✗ FAIL'} - Expected 3 transfers, got ${transfers4.length}`)
const totalTransferred4 = transfers4.reduce((sum, t) => sum + t.amountK, 0)
console.log(`  Total transferred: ${totalTransferred4}k`)
console.log(`  ${totalTransferred4 === 300 ? '✓ PASS' : '✗ FAIL'} - Total matches debtor amount`)
console.log()

// Edge Case 5: Empty balances map
console.log('Edge Case 5: Empty balances map')
const balances5 = new Map<string, BalanceRow>()
const transfers5 = calculateTransfers(balances5)
console.log(`Result: ${transfers5.length === 0 ? '✓ PASS' : '✗ FAIL'} - Expected 0 transfers, got ${transfers5.length}`)
console.log()

// Edge Case 6: Very small balances (< 0.01) should be ignored
console.log('Edge Case 6: Very small balances (< 0.01) should be ignored')
const balances6 = new Map<string, BalanceRow>([
  ['Alice', { name: 'Alice', spent: 100, owed: 99.995, net: 0.005, breakdown: [] }],
  ['Bob', { name: 'Bob', spent: 0, owed: 0.005, net: -0.005, breakdown: [] }]
])
const transfers6 = calculateTransfers(balances6)
console.log(`Result: ${transfers6.length === 0 ? '✓ PASS' : '✗ FAIL'} - Expected 0 transfers (amounts too small), got ${transfers6.length}`)
console.log()

// Edge Case 7: Greedy algorithm minimizes transfers
console.log('Edge Case 7: Greedy algorithm minimizes transfers')
const balances7 = new Map<string, BalanceRow>([
  ['Alice', { name: 'Alice', spent: 150, owed: 50, net: 100, breakdown: [] }],
  ['Bob', { name: 'Bob', spent: 50, owed: 100, net: -50, breakdown: [] }],
  ['Charlie', { name: 'Charlie', spent: 0, owed: 50, net: -50, breakdown: [] }]
])
const transfers7 = calculateTransfers(balances7)
console.log(`Result: ${transfers7.length === 2 ? '✓ PASS' : '✗ FAIL'} - Expected 2 transfers (minimized), got ${transfers7.length}`)
console.log('  Transfers:')
transfers7.forEach(t => console.log(`    ${t.from} → ${t.to}: ${t.amountK}k`))
console.log()

// Edge Case 8: Floating point precision handling
console.log('Edge Case 8: Floating point precision handling')
const balances8 = new Map<string, BalanceRow>([
  ['Alice', { name: 'Alice', spent: 100, owed: 33.333, net: 66.667, breakdown: [] }],
  ['Bob', { name: 'Bob', spent: 0, owed: 33.333, net: -33.333, breakdown: [] }],
  ['Charlie', { name: 'Charlie', spent: 0, owed: 33.334, net: -33.334, breakdown: [] }]
])
const transfers8 = calculateTransfers(balances8)
console.log(`Result: ${transfers8.length === 2 ? '✓ PASS' : '✗ FAIL'} - Expected 2 transfers, got ${transfers8.length}`)
// Check that amounts are rounded to 2 decimal places
const allRounded = transfers8.every(t => {
  const rounded = Math.round(t.amountK * 100) / 100
  return Math.abs(t.amountK - rounded) < 0.001
})
console.log(`  ${allRounded ? '✓ PASS' : '✗ FAIL'} - All amounts rounded to 2 decimal places`)
console.log('  Transfers:')
transfers8.forEach(t => console.log(`    ${t.from} → ${t.to}: ${t.amountK}k`))
console.log()

// Edge Case 9: Complex scenario with multiple creditors and debtors
console.log('Edge Case 9: Complex scenario with multiple creditors and debtors')
const balances9 = new Map<string, BalanceRow>([
  ['Alice', { name: 'Alice', spent: 200, owed: 50, net: 150, breakdown: [] }],
  ['Bob', { name: 'Bob', spent: 100, owed: 50, net: 50, breakdown: [] }],
  ['Charlie', { name: 'Charlie', spent: 0, owed: 100, net: -100, breakdown: [] }],
  ['David', { name: 'David', spent: 0, owed: 100, net: -100, breakdown: [] }]
])
const transfers9 = calculateTransfers(balances9)
console.log(`Result: Transfers count: ${transfers9.length}`)
console.log('  Transfers:')
transfers9.forEach(t => console.log(`    ${t.from} → ${t.to}: ${t.amountK}k`))
// Verify that total debts equal total credits
const totalDebts = Array.from(balances9.values())
  .filter(b => b.net < 0)
  .reduce((sum, b) => sum + Math.abs(b.net), 0)
const totalCredits = Array.from(balances9.values())
  .filter(b => b.net > 0)
  .reduce((sum, b) => sum + b.net, 0)
const totalTransfers = transfers9.reduce((sum, t) => sum + t.amountK, 0)
console.log(`  Total debts: ${totalDebts}k, Total credits: ${totalCredits}k, Total transfers: ${totalTransfers}k`)
console.log(`  ${Math.abs(totalTransfers - totalDebts) < 0.1 ? '✓ PASS' : '✗ FAIL'} - Transfers balance correctly`)
console.log()

console.log('=== All edge case tests completed ===')
