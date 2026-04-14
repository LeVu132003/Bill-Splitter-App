/**
 * Session management utilities for guest users
 * Handles cookie-based session storage for room access
 */

import { cookies } from 'next/headers'
import { hashPin } from './utils'

export interface GuestSession {
  memberName: string
  pinHash: string
  isAdmin: boolean
}

/**
 * Get cookie name for member name
 */
export function getMemberCookieName(roomCode: string): string {
  return `room_${roomCode}_member`
}

/**
 * Get cookie name for PIN hash
 */
export function getPinCookieName(roomCode: string): string {
  return `room_${roomCode}_pin`
}

/**
 * Get cookie name for admin status
 */
export function getAdminCookieName(roomCode: string): string {
  return `room_${roomCode}_admin`
}

/**
 * Set guest session cookies (client-side)
 */
export function setGuestSessionClient(
  roomCode: string,
  memberName: string,
  pin: string,
  isAdmin: boolean = false
): void {
  const pinHash = hashPin(pin)
  const maxAge = 2592000 // 30 days
  
  document.cookie = `${getMemberCookieName(roomCode)}=${encodeURIComponent(memberName)}; path=/; max-age=${maxAge}; SameSite=Lax`
  document.cookie = `${getPinCookieName(roomCode)}=${pinHash}; path=/; max-age=${maxAge}; SameSite=Lax`
  
  if (isAdmin) {
    document.cookie = `${getAdminCookieName(roomCode)}=true; path=/; max-age=${maxAge}; SameSite=Lax`
  }
}

/**
 * Get guest session from cookies (server-side)
 */
export async function getGuestSession(roomCode: string): Promise<GuestSession | null> {
  const cookieStore = await cookies()
  
  const memberName = cookieStore.get(getMemberCookieName(roomCode))?.value
  const pinHash = cookieStore.get(getPinCookieName(roomCode))?.value
  const isAdmin = cookieStore.get(getAdminCookieName(roomCode))?.value === 'true'
  
  if (!memberName || !pinHash) {
    return null
  }
  
  return {
    memberName: decodeURIComponent(memberName),
    pinHash,
    isAdmin,
  }
}

/**
 * Clear guest session cookies (client-side)
 */
export function clearGuestSessionClient(roomCode: string): void {
  document.cookie = `${getMemberCookieName(roomCode)}=; path=/; max-age=0`
  document.cookie = `${getPinCookieName(roomCode)}=; path=/; max-age=0`
  document.cookie = `${getAdminCookieName(roomCode)}=; path=/; max-age=0`
}

/**
 * Verify guest session against room data
 */
export function verifyGuestSession(
  session: GuestSession,
  members: Array<{ name: string; pin: string }>
): boolean {
  const member = members.find(m => m.name === session.memberName)
  
  if (!member) {
    return false
  }
  
  // If member has no PIN set, session is invalid
  if (!member.pin) {
    return false
  }
  
  // Verify PIN hash matches
  return member.pin === session.pinHash
}
