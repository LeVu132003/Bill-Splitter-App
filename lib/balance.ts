import type { Tx, Member, Transfer } from './types'
import { ADMIN_NAME } from './utils'

export interface BreakdownItem {
  txId: string
  desc: string
  payer: string
  role: 'paid' | 'owed' | 'even'
  amount: number
  amountColor: string
}

export interface BalanceRow {
  name: string
  spent: number    // total paid by this member
  owed: number     // total share this member owes
  net: number      // spent - owed
  breakdown: BreakdownItem[]
}

/**
 * Calculate balances for all members with detailed breakdown
 * @param members - Array of members (admin will be filtered out)
 * @param txs - Array of transactions
 * @returns Map of member name to BalanceRow
 */
export function calculateBalances(
  members: Member[],
  txs: Tx[]
): Map<string, BalanceRow> {
  const balances = new Map<string, BalanceRow>()
  
  // Filter out admin account
  const memberNames = members
    .map(m => m.name)
    .filter(name => name !== ADMIN_NAME)
  
  // Initialize balance rows for each member
  memberNames.forEach(name => {
    balances.set(name, {
      name,
      spent: 0,
      owed: 0,
      net: 0,
      breakdown: []
    })
  })
  
  // Process each transaction
  txs.forEach(tx => {
    const amountK = tx.amountK || 0
    
    // Process each member
    memberNames.forEach(memberName => {
      const balanceRow = balances.get(memberName)!
      
      // Calculate share for this member
      let share = 0
      if (tx.splits && tx.splits[memberName] !== undefined) {
        share = tx.splits[memberName]
      } else if (tx.parts.includes(memberName)) {
        share = amountK / tx.parts.length
      }
      
      const isPayer = tx.payer === memberName
      const isInParts = tx.parts.includes(memberName) || (tx.splits && tx.splits[memberName] !== undefined)
      
      // Only add to breakdown if member is involved in this transaction
      if (isPayer || isInParts) {
        let role: 'paid' | 'owed' | 'even'
        let amount: number
        let amountColor: string
        
        if (isPayer && isInParts) {
          // Member both paid and participated
          const net = amountK - share
          role = 'even'
          amount = net
          amountColor = 'var(--blue)'
        } else if (isPayer) {
          // Member only paid
          role = 'paid'
          amount = amountK
          amountColor = 'var(--blue)'
        } else {
          // Member only participated (owes)
          role = 'owed'
          amount = -share
          amountColor = 'var(--red)'
        }
        
        balanceRow.breakdown.push({
          txId: tx.id,
          desc: tx.desc,
          payer: isPayer ? '' : tx.payer, // Only show payer if not self
          role,
          amount,
          amountColor
        })
      }
      
      // Update spent and owed totals
      if (isPayer) {
        balanceRow.spent += amountK
      }
      if (isInParts) {
        balanceRow.owed += share
      }
    })
  })
  
  // Calculate net balance for each member
  balances.forEach(row => {
    row.net = row.spent - row.owed
  })
  
  return balances
}

/**
 * Calculate minimum transfers needed to settle all debts using greedy algorithm
 * @param balances - Map of member name to BalanceRow
 * @returns Array of transfers from debtor to creditor
 */
export function calculateTransfers(
  balances: Map<string, BalanceRow>
): Transfer[] {
  const transfers: Transfer[] = []
  
  // Separate creditors (net > 0) and debtors (net < 0)
  const creditors: { name: string; amount: number }[] = []
  const debtors: { name: string; amount: number }[] = []
  
  balances.forEach(row => {
    // Use small tolerance to handle floating point precision
    if (row.net > 0.01) {
      creditors.push({ name: row.name, amount: row.net })
    } else if (row.net < -0.01) {
      debtors.push({ name: row.name, amount: -row.net }) // Store as positive amount
    }
  })
  
  // Handle edge cases
  if (creditors.length === 0 || debtors.length === 0) {
    return [] // All balanced
  }
  
  // Sort both arrays by amount (descending) for greedy algorithm
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)
  
  // Greedy algorithm: match largest debtor with largest creditor
  let i = 0 // creditor index
  let j = 0 // debtor index
  
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]
    const debtor = debtors[j]
    
    // Transfer the minimum of what debtor owes and what creditor is owed
    const transferAmount = Math.min(creditor.amount, debtor.amount)
    
    // Only add transfer if amount is significant (> 0.01k to avoid rounding errors)
    if (transferAmount > 0.01) {
      transfers.push({
        from: debtor.name,
        to: creditor.name,
        amountK: Math.round(transferAmount * 100) / 100 // Round to 2 decimal places
      })
    }
    
    // Update remaining amounts
    creditor.amount -= transferAmount
    debtor.amount -= transferAmount
    
    // Move to next creditor if current one is settled
    if (creditor.amount < 0.01) {
      i++
    }
    
    // Move to next debtor if current one is settled
    if (debtor.amount < 0.01) {
      j++
    }
  }
  
  return transfers
}
