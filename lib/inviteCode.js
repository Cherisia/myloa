import { randomBytes } from 'crypto'

export function generateInviteCode() {
  return randomBytes(8).toString('hex').toUpperCase()
}
