import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const KEY  = Buffer.from(process.env.ENCRYPTION_KEY || 'fallback-key-32-chars-minimum!!', 'utf8').slice(0, 32)

export function encrypt(text) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, KEY, iv)
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decrypt(data) {
  const [ivHex, tagHex, encHex] = data.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
