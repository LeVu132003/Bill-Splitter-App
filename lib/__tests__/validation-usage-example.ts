/**
 * Usage examples for validation utilities
 * 
 * This file demonstrates how to use validatePercentSplit and validateFixedSplit
 * in the context of AddTxForm and EditForm components.
 */

import { validatePercentSplit, validateFixedSplit } from '../validation'

// Example 1: Validating percent split in AddTxForm
function examplePercentValidation() {
  // User enters percent values for each member
  const splits = {
    'Alice': 50,
    'Bob': 30,
    'Charlie': 20
  }
  
  const result = validatePercentSplit(splits)
  
  if (result.valid) {
    console.log('✓ Split is valid:', result.message)
    // Proceed with transaction creation
  } else {
    console.log('⚠ Split is invalid:', result.message)
    // Show error to user
  }
}

// Example 2: Validating fixed split in AddTxForm
function exampleFixedValidation() {
  // Transaction amount is 150k
  const amount = 150
  
  // User enters fixed amounts for each member
  const splits = {
    'Alice': 60,
    'Bob': 45,
    'Charlie': 45
  }
  
  const result = validateFixedSplit(splits, amount)
  
  if (result.valid) {
    console.log('✓ Split is valid:', result.message)
    // Proceed with transaction creation
  } else {
    console.log('⚠ Split is invalid:', result.message)
    // Show error to user
  }
}

// Example 3: Real-time validation feedback in form
function exampleRealTimeValidation() {
  const amount = 100
  const splits = {
    'Alice': 50,
    'Bob': 30
    // Charlie not yet entered
  }
  
  const result = validateFixedSplit(splits, amount)
  
  // Display validation status in UI
  console.log(`Total: ${result.total}k / ${amount}k`)
  console.log(`Status: ${result.message}`)
  console.log(`Can submit: ${result.valid}`)
}

// Example 4: Integration with AddTxForm component
function exampleFormIntegration() {
  // In AddTxForm component:
  
  // For percent mode:
  const percentSplits = { 'Alice': 33.3, 'Bob': 33.3, 'Charlie': 33.4 }
  const percentResult = validatePercentSplit(percentSplits)
  
  if (!percentResult.valid) {
    // Show error: "Tổng tỉ lệ phải = 100% (hiện: 99.9%)"
    console.error(`Validation failed: ${percentResult.message}`)
    return
  }
  
  // For fixed mode:
  const transactionAmount = 150
  const fixedSplits = { 'Alice': 50, 'Bob': 50, 'Charlie': 50 }
  const fixedResult = validateFixedSplit(fixedSplits, transactionAmount)
  
  if (!fixedResult.valid) {
    // Show error: "Tổng phải = 150k (hiện: 150k)"
    console.error(`Validation failed: ${fixedResult.message}`)
    return
  }
  
  // Both validations passed, proceed with transaction creation
  console.log('✓ All validations passed, creating transaction...')
}

// Example 5: Custom tolerance for special cases
function exampleCustomTolerance() {
  // Sometimes you might want a stricter or looser tolerance
  
  // Stricter tolerance (0.1% instead of default 0.5%)
  const strictResult = validatePercentSplit(
    { 'Alice': 50.2, 'Bob': 49.8 },
    0.1
  )
  console.log('Strict validation:', strictResult.valid) // false
  
  // Looser tolerance (1.0% instead of default 0.5%)
  const looseResult = validatePercentSplit(
    { 'Alice': 50.6, 'Bob': 49.4 },
    1.0
  )
  console.log('Loose validation:', looseResult.valid) // true
}

// Run examples
console.log('=== Example 1: Percent Validation ===')
examplePercentValidation()

console.log('\n=== Example 2: Fixed Validation ===')
exampleFixedValidation()

console.log('\n=== Example 3: Real-time Validation ===')
exampleRealTimeValidation()

console.log('\n=== Example 4: Form Integration ===')
exampleFormIntegration()

console.log('\n=== Example 5: Custom Tolerance ===')
exampleCustomTolerance()
