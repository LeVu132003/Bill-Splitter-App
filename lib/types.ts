export interface Member {
  name: string
  pin: string // djb2 hash hoặc empty string nếu chưa set
}

export interface Comment {
  id: string
  author: string
  text: string
  ts: number
}

export type SplitMode = 'equal' | 'percent' | 'fixed'

export interface Tx {
  id: string
  desc: string
  note?: string
  amountK: number
  payer: string
  parts: string[]           // tên các thành viên tham gia
  splits: Record<string, number> | null // {name: shareK} — null nếu equal
  splitMode: SplitMode
  by: string                // người tạo tx
  ts: number
  edited?: number
  comments: Comment[]
}

export interface RoomState {
  name: string              // tên buổi chơi
  members: Member[]
  txs: Tx[]
  created?: number
  settled?: Record<string, boolean>
}

export interface RoomRow {
  code: string
  data: RoomState
  updated_at: string
}

export interface Transfer {
  from: string
  to: string
  amountK: number
}
