import { calculateBalances, calculateTransfers } from './lib/balance'
import type { Member, Tx } from './lib/types'

// Test data
const members: Member[] = [
  { name: 'Alice', pin: '' },
  { name: 'Bob', pin: '' },
  { name: 'Charlie', pin: '' }
]

console.log('=== Testing calculateTransfers ===\n')

// Test 1: Simple scenario
console.log('Test 1: Simple two-person transfer')
const txs1: Tx[] = [
  {
    id: '1',
    desc: 'Dinner',
    amountK: 100,
    payer: 'Alice',
    parts: ['Alice', 'Bob'],
    splits: null,
    splitMode: 'equal',
    by: 'Alice',
    ts: Date.now(),
    comments: []
  }
]

const balances1 = calculateBalances(members, txs1)
console.log('Balances:')
balances1.forEach(row => {
  console.log(`  ${row.name}: spent=${row.spent}k, owed=${row.owed}k, net=${row.net}k`)
})

const transfers1 = calculateTransfers(balances1)
console.log('Transfers:')
transfers1.forEach(t => {
  console.log(`  ${t.from} → ${t.to}: ${t.amountK}k`)
})
console.log()

// Test 2: Three people, one payer
console.log('Test 2: Three people, one payer')
const txs2: Tx[] = [
  {
    id: '1',
    desc: 'Dinner',
    amountK: 300,
    payer: 'Alice',
    parts: ['Alice', 'Bob', 'Charlie'],
    splits: null,
    splitMode: 'equal',
    by: 'Alice',
    ts: Date.now(),
    comments: []
  }
]

const balances2 = calculateBalances(members, txs2)
console.log('Balances:')
balances2.forEach(row => {
  console.log(`  ${row.name}: spent=${row.spent}k, owed=${row.owed}k, net=${row.net}k`)
})

const transfers2 = calculateTransfers(balances2)
console.log('Transfers:')
transfers2.forEach(t => {
  console.log(`  ${t.from} → ${t.to}: ${t.amountK}k`)
})
console.log()

// Test 3: Complex scenario with multiple transactions
console.log('Test 3: Complex scenario with multiple transactions')
const txs3: Tx[] = [
  {
    id: '1',
    desc: 'Dinner',
    amountK: 300,
    payer: 'Alice',
    parts: ['Alice', 'Bob', 'Charlie'],
    splits: null,
    splitMode: 'equal',
    by: 'Alice',
    ts: Date.now(),
    comments: []
  },
  {
    id: '2',
    desc: 'Taxi',
    amountK: 60,
    payer: 'Bob',
    parts: ['Bob', 'Charlie'],
    splits: null,
    splitMode: 'equal',
    by: 'Bob',
    ts: Date.now(),
    comments: []
  },
  {
    id: '3',
    desc: 'Coffee',
    amountK: 45,
    payer: 'Charlie',
    parts: ['Alice', 'Bob', 'Charlie'],
    splits: null,
    splitMode: 'equal',
    by: 'Charlie',
    ts: Date.now(),
    comments: []
  }
]

const balances3 = calculateBalances(members, txs3)
console.log('Balances:')
balances3.forEach(row => {
  console.log(`  ${row.name}: spent=${row.spent}k, owed=${row.owed}k, net=${row.net}k`)
})

const transfers3 = calculateTransfers(balances3)
console.log('Transfers:')
transfers3.forEach(t => {
  console.log(`  ${t.from} → ${t.to}: ${t.amountK}k`)
})
console.log()

// Test 4: All balanced
console.log('Test 4: All balanced (no transfers needed)')
const txs4: Tx[] = [
  {
    id: '1',
    desc: 'Dinner',
    amountK: 300,
    payer: 'Alice',
    parts: ['Alice', 'Bob', 'Charlie'],
    splits: null,
    splitMode: 'equal',
    by: 'Alice',
    ts: Date.now(),
    comments: []
  },
  {
    id: '2',
    desc: 'Lunch',
    amountK: 300,
    payer: 'Bob',
    parts: ['Alice', 'Bob', 'Charlie'],
    splits: null,
    splitMode: 'equal',
    by: 'Bob',
    ts: Date.now(),
    comments: []
  },
  {
    id: '3',
    desc: 'Coffee',
    amountK: 300,
    payer: 'Charlie',
    parts: ['Alice', 'Bob', 'Charlie'],
    splits: null,
    splitMode: 'equal',
    by: 'Charlie',
    ts: Date.now(),
    comments: []
  }
]

const balances4 = calculateBalances(members, txs4)
console.log('Balances:')
balances4.forEach(row => {
  console.log(`  ${row.name}: spent=${row.spent}k, owed=${row.owed}k, net=${row.net}k`)
})

const transfers4 = calculateTransfers(balances4)
console.log('Transfers:')
if (transfers4.length === 0) {
  console.log('  (none - all balanced)')
} else {
  transfers4.forEach(t => {
    console.log(`  ${t.from} → ${t.to}: ${t.amountK}k`)
  })
}
console.log()

// Test 5: Percent split mode
console.log('Test 5: Percent split mode')
const txs5: Tx[] = [
  {
    id: '1',
    desc: 'Dinner',
    amountK: 100,
    payer: 'Alice',
    parts: ['Alice', 'Bob', 'Charlie'],
    splits: { 'Alice': 50, 'Bob': 30, 'Charlie': 20 }, // 50%, 30%, 20%
    splitMode: 'percent',
    by: 'Alice',
    ts: Date.now(),
    comments: []
  }
]

const balances5 = calculateBalances(members, txs5)
console.log('Balances:')
balances5.forEach(row => {
  console.log(`  ${row.name}: spent=${row.spent}k, owed=${row.owed}k, net=${row.net}k`)
})

const transfers5 = calculateTransfers(balances5)
console.log('Transfers:')
transfers5.forEach(t => {
  console.log(`  ${t.from} → ${t.to}: ${t.amountK}k`)
})
console.log()

console.log('=== All tests completed ===')
