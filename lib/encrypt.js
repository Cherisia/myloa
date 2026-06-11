import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
if (!process.env.ENCRYPTION_KEY) throw new Error('[encrypt] ENCRYPTION_KEY 환경변수가 설정되지 않았습니다')
const KEY  = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8').slice(0, 32)

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
