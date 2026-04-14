'use client'

import { createContext, useContext, useEffect, useReducer, useCallback, type ReactNode } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { ADMIN_NAME } from '@/lib/utils'
import type { RoomState, Tx } from '@/lib/types'

interface RoomContextValue {
  st: RoomState
  myName: string
  isAdmin: boolean
  roomCode: string
  pin: string
  dispatch: (action: RoomAction) => void
  syncToServer: (newState: RoomState) => Promise<void>
}

type RoomAction =
  | { type: 'SET_STATE'; payload: RoomState }
  | { type: 'ADD_TX'; payload: Tx }
  | { type: 'UPDATE_TX'; payload: Tx }
  | { type: 'DELETE_TX'; payload: string }

function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload
    case 'ADD_TX':
      return { ...state, txs: [...(state.txs || []), action.payload] }
    case 'UPDATE_TX':
      return { ...state, txs: state.txs.map(t => t.id === action.payload.id ? action.payload : t) }
    case 'DELETE_TX':
      return { ...state, txs: state.txs.filter(t => t.id !== action.payload) }
    default:
      return state
  }
}

const RoomContext = createContext<RoomContextValue | null>(null)

export function useRoom() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used within RoomProvider')
  return ctx
}

interface RoomProviderProps {
  children: ReactNode
  initialState: RoomState
  roomCode: string
  myName: string
  pin: string
}

export default function RoomProvider({ children, initialState, roomCode, myName, pin }: RoomProviderProps) {
  const [st, dispatch] = useReducer(roomReducer, initialState)
  const isAdmin = myName === ADMIN_NAME

  const syncToServer = useCallback(async (newState: RoomState) => {
    await fetch(`/api/rooms/${roomCode}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newState, memberName: myName, pin }),
    })
  }, [roomCode, myName, pin])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on('broadcast', { event: 'room_updated' }, (msg: { payload?: { data?: RoomState } }) => {
        if (msg.payload?.data) {
          dispatch({ type: 'SET_STATE', payload: msg.payload.data })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomCode])

  return (
    <RoomContext.Provider value={{ st, myName, isAdmin, roomCode, pin, dispatch, syncToServer }}>
      {children}
    </RoomContext.Provider>
  )
}
