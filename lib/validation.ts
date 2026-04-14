/**
 * Validation utilities for split modes in transaction forms
 * 
 * These functions validate that percent and fixed split modes have correct totals
 * within acceptable tolerance ranges.
 */

export interface ValidationResult {
  valid: boolean
  total: number
  message: string
}

/**
 * Validate percent split mode
 * 
 * Checks that the sum of all percent values equals 100% within tolerance.
 * 
 * @param splits - Record of member names to percent values
 * @param tolerance - Acceptable deviation from 100% (default: 0.5%)
 * @returns Validation result with status, total, and message
 * 
 * @example
 * validatePercentSplit({ Alice: 50, Bob: 50 }) // { valid: true, total: 100, message: '✓ Đúng 100%' }
 * validatePercentSplit({ Alice: 60, Bob: 30 }) // { valid: false, total: 90, message: '⚠ 90.0% (cần 100%)' }
 */
export function validatePercentSplit(
  splits: Record<string, number>,
  tolerance: number = 0.5
): ValidationResult {
  const total = Object.values(splits).reduce((sum, value) => sum + value, 0)
  const valid = Math.abs(total - 100) <= tolerance
  
  return {
    valid,
    total,
    message: valid ? '✓ Đúng 100%' : `⚠ ${total.toFixed(1)}% (cần 100%)`
  }
}

/**
 * Validate fixed split mode
 * 
 * Checks that the sum of all fixed amounts equals the transaction amount within tolerance.
 * 
 * @param splits - Record of member names to fixed amounts (in thousands)
 * @param amount - Expected total amount (in thousands)
 * @param tolerance - Acceptable deviation from amount (default: 0.05k)
 * @returns Validation result with status, total, and message
 * 
 * @example
 * validateFixedSplit({ Alice: 50, Bob: 50 }, 100) // { valid: true, total: 100, message: '✓ Đúng số tiền' }
 * validateFixedSplit({ Alice: 60, Bob: 30 }, 100) // { valid: false, total: 90, message: '⚠ 90k (cần 100k)' }
 */
export function validateFixedSplit(
  splits: Record<string, number>,
  amount: number,
  tolerance: number = 0.05
): ValidationResult {
  const total = Object.values(splits).reduce((sum, value) => sum + value, 0)
  const valid = Math.abs(total - amount) <= tolerance
  
  return {
    valid,
    total,
    message: valid ? '✓ Đúng số tiền' : `⚠ ${total}k (cần ${amount}k)`
  }
}
