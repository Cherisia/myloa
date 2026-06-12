import { randomBytes } from 'crypto'

export function generateInviteCode() {
  return randomBytes(4).toString('hex').toUpperCase()
}
