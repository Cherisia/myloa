// API route 공용 헬퍼
import { prisma } from '@/lib/db'

/**
 * 캐릭터가 userId 소유인지 검증
 * @param {string} characterId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function verifyCharacterOwner(characterId, userId) {
  const char = await prisma.character.findFirst({
    where: { id: characterId, expedition: { userId } },
  })
  return !!char
}
