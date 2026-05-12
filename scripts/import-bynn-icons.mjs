/**
 * bynn_ark_icons 폴더 → public/bynn-ark-icons 로 복사 (영어 파일명 bynn-01.ext …)
 * 목록은 app/dashboard/_bynnArkIcons.js 에 반영됩니다.
 *
 * npm run import:bynn-icons
 * BYNN_ICONS_SOURCE="D:\\icons" npm run import:bynn-icons
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DEST = path.join(ROOT, 'public', 'bynn-ark-icons')
const CONST_OUT = path.join(ROOT, 'app', 'dashboard', '_bynnArkIcons.js')

const DEFAULT_SOURCES = [
  process.env.BYNN_ICONS_SOURCE,
  path.join(process.env.USERPROFILE || '', 'OneDrive', '바탕 화면', 'bynn_ark_icons'),
  path.join(process.env.USERPROFILE || '', 'OneDrive', 'Desktop', 'bynn_ark_icons'),
  path.join(process.env.USERPROFILE || '', 'Desktop', 'bynn_ark_icons'),
].filter(Boolean)

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'])

function englishLabel(originalName, index) {
  const base = path.parse(originalName).name.trim()
  if (/^[a-zA-Z0-9][a-zA-Z0-9 _-]*$/.test(base) && base.length <= 32) {
    return base.replace(/[-_]+/g, ' ')
  }
  return `Icon ${index}`
}

function findSourceDir() {
  for (const dir of DEFAULT_SOURCES) {
    try {
      if (fs.statSync(dir).isDirectory()) {
        const files = fs.readdirSync(dir).filter(f => {
          const ext = path.extname(f).toLowerCase()
          if (!IMAGE_EXT.has(ext)) return false
          try {
            return fs.statSync(path.join(dir, f)).isFile()
          } catch {
            return false
          }
        })
        if (files.length) return { dir, files }
      }
    } catch {
      /* skip */
    }
  }
  return null
}

function main() {
  const found = findSourceDir()
  if (!found) {
    console.error('[import-bynn-icons] 소스 폴더를 찾지 못했거나 이미지가 없습니다.')
    console.error('  시도한 경로:', DEFAULT_SOURCES.join('\n  '))
    console.error('  BYNN_ICONS_SOURCE 환경변수로 폴더를 지정할 수 있습니다.')
    process.exit(1)
  }

  const { dir: srcDir, files } = found
  files.sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))

  fs.mkdirSync(DEST, { recursive: true })
  for (const old of fs.readdirSync(DEST)) {
    fs.unlinkSync(path.join(DEST, old))
  }

  const exported = []
  let i = 1
  for (const name of files) {
    const ext = path.extname(name).toLowerCase()
    const destName = `bynn-${String(i).padStart(2, '0')}${ext}`
    fs.copyFileSync(path.join(srcDir, name), path.join(DEST, destName))
    exported.push({
      id: `bynn-${String(i).padStart(2, '0')}`,
      src: `/bynn-ark-icons/${destName}`,
      label: englishLabel(name, i),
    })
    console.log(`  ${name} → ${destName} (${exported[exported.length - 1].label})`)
    i++
  }

  const js = `/**
 * Lost Ark 스타일 커스텀 아이콘 — public/bynn-ark-icons
 * 자동 생성: npm run import:bynn-icons
 */
export const BYNN_ARK_ICONS = ${JSON.stringify(exported, null, 2)}
`
  fs.writeFileSync(CONST_OUT, js, 'utf8')
  console.log(`[import-bynn-icons] ${exported.length}개 복사 완료 → public/bynn-ark-icons/, ${path.relative(ROOT, CONST_OUT)}`)
}

main()
