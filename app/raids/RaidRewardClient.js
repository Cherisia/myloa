'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import { RAIDS } from '@/lib/raidData'

// ── 재료 아이콘 매핑 (키 = 실제 게임 아이템명) ────────────────────────────────
const MATERIAL_ICON = {
  '운명의 파괴석':                '/materials/파괴석.png',
  '운명의 수호석':                '/materials/수호석.png',
  '운명의 파편':                  '/materials/파편.png',
  '운명의 돌파석':                '/materials/돌파석.png',
  '운명의 돌':                    '/materials/운명의돌.png',
  '고귀한 구원자의 팔찌':          '/materials/고귀한팔찌.png',
  '찬란한 구원자의 팔찌':          '/materials/찬란한팔찌.png',
  '위대한 비상의 돌':              '/materials/비상의돌.png',
  '순환 돌파석':                  '/materials/순환돌파석.png',
  '은총의 파편':                  '/materials/은총의파편.png',
  '담금질 : 낙뢰의 뿔':           '/materials/낙뢰의뿔.png',
  '손길-담금질 : 낙뢰의 뿔':      '/materials/낙뢰의뿔.png',
  '클리어 메달':                  '/materials/클리어메달.png',
  '카르마의 잔영':                '/materials/카르마잔영.png',
  '손길-카르마의 잔영':           '/materials/카르마잔영.png',
  '업화의 쐐기돌':                '/materials/업화쐐기돌.png',
  '손길-업화의 쐐기돌':           '/materials/업화쐐기돌.png',
  '불과 얼음의 주화':             '/materials/불얼음주화.png',
  // 상위 티어 재료
  '운명의 파괴석 결정':           '/materials/파괴석결정.png',
  '운명의 수호석 결정':           '/materials/수호석결정.png',
  '위대한 운명의 돌파석':         '/materials/위대한돌파석.png',
  '전이 돌파석':                  '/materials/전이돌파석.png',
  '고통의 가시':                  '/materials/고통의가시.png',
  '담금질 : 우레의 뇌옥':         '/materials/우레의뇌옥.png',
  '손길-담금질 : 우레의 뇌옥':    '/materials/우레의뇌옥.png',
}

// ── 재료 표시명 ───────────────────────────────────────────────────────────────
const MATERIAL_DISPLAY_NAME = {
  '운명의 파괴석':                '운명의 파괴석',
  '운명의 수호석':                '운명의 수호석',
  '운명의 파편':                  '운명의 파편',
  '운명의 돌파석':                '운명의 돌파석',
  '운명의 돌':                    '운명의 돌',
  '고귀한 구원자의 팔찌':          '고귀한 팔찌',
  '찬란한 구원자의 팔찌':          '찬란한 팔찌',
  '위대한 비상의 돌':              '위대한 비상의 돌',
  '순환 돌파석':                  '순환 돌파석',
  '은총의 파편':                  '은총의 파편',
  '담금질 : 낙뢰의 뿔':           '낙뢰의 뿔',
  '손길-담금질 : 낙뢰의 뿔':      '낙뢰의 뿔',
  '클리어 메달':                  '클리어 메달',
  '카르마의 잔영':                '카르마의 잔영',
  '손길-카르마의 잔영':           '카르마의 잔영',
  '업화의 쐐기돌':                '업화의 쐐기돌',
  '손길-업화의 쐐기돌':           '업화의 쐐기돌',
  '불과 얼음의 주화':             '불과 얼음의 주화',
  '운명의 파괴석 결정':           '파괴석 결정',
  '운명의 수호석 결정':           '수호석 결정',
  '위대한 운명의 돌파석':         '위대한 돌파석',
  '전이 돌파석':                  '전이 돌파석',
  '고통의 가시':                  '고통의 가시',
  '담금질 : 우레의 뇌옥':         '우레의 뇌옥',
  '손길-담금질 : 우레의 뇌옥':    '우레의 뇌옥',
}

// ── 레이드 이미지 매핑 ────────────────────────────────────────────────────────
const RAID_IMAGE = {
  'abrel-ex':      '/raids/abrelshud.webp',
  'serca':         '/raids/serca.webp',
  'cathedral':     '/raids/cathedral.webp',
  'kazeros-final': '/raids/kazeros.webp',
  'armocha':       '/raids/armocha.webp',
  'mordum':        '/raids/mordum.webp',
  'abrelshud-2':   '/raids/abrelshud.webp',
  'egir-1':        '/raids/egir.webp',
  'behemoth':      '/raids/behemoth.webp',
  'echidna':       '/raids/echidna.webp',
  'kamen':         '/raids/kamen.webp',
  'ivory-tower':   '/raids/ivory-tower.webp',
  'illiakan':      '/raids/illiakan.webp',
  'kayangel':      '/raids/kayangel.webp',
}

// object-position: 인물 얼굴이 상단에 위치한 이미지를 가로 배너로 크롭할 때 조정
const RAID_IMAGE_POSITION = {
  'abrel-ex':      '50% 15%',
  'serca':         '50% 30%',
  'cathedral':     '50% 12%',
  'kazeros-final': '50% 10%',
  'armocha':       '50% 12%',
  'mordum':        '50% 18%',
  'abrelshud-2':   '50% 15%',
  'egir-1':        '50% 8%',
  'behemoth':      '50% 15%',
  'echidna':       '50% 12%',
  'kamen':         '50% 10%',
  'ivory-tower':   '50% 15%',
  'illiakan':      '50% 15%',
  'kayangel':      '50% 15%',
}

// ── 난이도 ────────────────────────────────────────────────────────────────────
const DIFF_LABEL = {
  nightmare: '나이트메어', hard: '하드', normal: '노말',
  stage3: '3단계', stage2: '2단계', stage1: '1단계',
}

// ── 카테고리 ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',        label: '전체' },
  { key: 'extreme',    label: 'EX 레이드' },
  { key: 'shadow',     label: '그림자 레이드' },
  { key: 'abyss',      label: '어비스 던전' },
  { key: 'kazeros',    label: '카제로스 레이드' },
  { key: 'abyss_raid', label: '어비스 레이드' },
  { key: 'legion',     label: '군단장 레이드' },
]

const CAT_LABEL = {
  extreme: 'EX', shadow: '그림자 레이드', abyss: '어비스 던전',
  kazeros: '카제로스 레이드', abyss_raid: '어비스 레이드', legion: '군단장 레이드',
}
const CAT_COLOR = {
  extreme:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  shadow:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  abyss:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  kazeros:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  abyss_raid: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  legion:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

function getRaidCategory(raid) {
  if (raid.tag === 'extreme') return 'extreme'
  if (raid.image === '/schedule/shadow_raid.png')   return 'shadow'
  if (raid.image === '/schedule/abyss_dungeon.png') return 'abyss'
  if (raid.image === '/schedule/abyss_raid.png')    return 'abyss_raid'
  if (raid.image === '/schedule/legion_raid.png')   return 'legion'
  return 'kazeros'
}

// ── 재료 보상 데이터 (lobal.kr 크롤링) ───────────────────────────────────────
const GATE_MATERIALS = {
  'abrel-ex': {
    normal:    [[{ name: '불과 얼음의 주화', count: 150 }]],
    hard:      [[{ name: '불과 얼음의 주화', count: 200 }]],
    nightmare: [[{ name: '불과 얼음의 주화', count: 200 }]],
  },
  'serca': {
    normal: [
      [
        { name: '운명의 파괴석', count: 880 }, { name: '운명의 수호석', count: 1760 },
        { name: '운명의 파편', count: 6200 }, { name: '운명의 돌파석', count: 12 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 8 },
      ],
      [
        { name: '운명의 파괴석', count: 1100 }, { name: '운명의 수호석', count: 2200 },
        { name: '운명의 파편', count: 7900 }, { name: '운명의 돌파석', count: 15 },
        { name: '고귀한 구원자의 팔찌', count: 5 }, { name: '위대한 비상의 돌', count: 9 },
        { name: '순환 돌파석', count: 17 }, { name: '운명의 돌', count: 8 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석 결정', count: 385 }, { name: '운명의 수호석 결정', count: 770 },
        { name: '운명의 파편', count: 8300 }, { name: '위대한 운명의 돌파석', count: 7 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '고통의 가시', count: 10 },
      ],
      [
        { name: '운명의 파괴석 결정', count: 475 }, { name: '운명의 수호석 결정', count: 950 },
        { name: '운명의 파편', count: 10100 }, { name: '위대한 운명의 돌파석', count: 10 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '전이 돌파석', count: 5 }, { name: '운명의 돌', count: 10 },
        { name: '고통의 가시', count: 15 },
      ],
    ],
    nightmare: [
      [
        { name: '운명의 파괴석 결정', count: 405 }, { name: '운명의 수호석 결정', count: 810 },
        { name: '운명의 파편', count: 9100 }, { name: '위대한 운명의 돌파석', count: 8 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '고통의 가시', count: 10 },
      ],
      [
        { name: '운명의 파괴석 결정', count: 500 }, { name: '운명의 수호석 결정', count: 1000 },
        { name: '운명의 파편', count: 11000 }, { name: '위대한 운명의 돌파석', count: 12 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '전이 돌파석', count: 6 }, { name: '운명의 돌', count: 10 },
        { name: '고통의 가시', count: 15 },
      ],
    ],
  },
  'cathedral': {
    stage1: [
      [
        { name: '운명의 파괴석', count: 820 }, { name: '운명의 수호석', count: 1640 },
        { name: '운명의 파편', count: 5400 }, { name: '운명의 돌파석', count: 9 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '은총의 파편', count: 4 },
      ],
      [
        { name: '운명의 파괴석', count: 960 }, { name: '운명의 수호석', count: 1920 },
        { name: '운명의 파편', count: 6800 }, { name: '운명의 돌파석', count: 12 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '순환 돌파석', count: 15 }, { name: '운명의 돌', count: 8 },
        { name: '은총의 파편', count: 6 },
      ],
    ],
    stage2: [
      [
        { name: '운명의 파괴석', count: 980 }, { name: '운명의 수호석', count: 1960 },
        { name: '운명의 파편', count: 6800 }, { name: '운명의 돌파석', count: 11 },
        { name: '고귀한 구원자의 팔찌', count: 1 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '은총의 파편', count: 12 },
      ],
      [
        { name: '운명의 파괴석', count: 1150 }, { name: '운명의 수호석', count: 2300 },
        { name: '운명의 파편', count: 8600 }, { name: '운명의 돌파석', count: 16 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 9 },
        { name: '순환 돌파석', count: 17 }, { name: '운명의 돌', count: 17 },
        { name: '은총의 파편', count: 18 },
      ],
    ],
    stage3: [
      [
        { name: '운명의 파괴석 결정', count: 405 }, { name: '운명의 수호석 결정', count: 810 },
        { name: '운명의 파편', count: 9100 }, { name: '위대한 운명의 돌파석', count: 8 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '은총의 파편', count: 24 },
      ],
      [
        { name: '운명의 파괴석 결정', count: 500 }, { name: '운명의 수호석 결정', count: 1000 },
        { name: '운명의 파편', count: 11000 }, { name: '위대한 운명의 돌파석', count: 12 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '전이 돌파석', count: 6 }, { name: '운명의 돌', count: 6 },
        { name: '은총의 파편', count: 36 },
      ],
    ],
  },
  'kazeros-final': {
    normal: [
      [
        { name: '운명의 파괴석', count: 880 }, { name: '운명의 수호석', count: 1760 },
        { name: '운명의 파편', count: 6200 }, { name: '운명의 돌파석', count: 12 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 8 },
      ],
      [
        { name: '운명의 파괴석', count: 1100 }, { name: '운명의 수호석', count: 2200 },
        { name: '운명의 파편', count: 7900 }, { name: '운명의 돌파석', count: 15 },
        { name: '고귀한 구원자의 팔찌', count: 5 }, { name: '위대한 비상의 돌', count: 9 },
        { name: '순환 돌파석', count: 17 }, { name: '운명의 돌', count: 8 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석 결정', count: 385 }, { name: '운명의 수호석 결정', count: 770 },
        { name: '운명의 파편', count: 8300 }, { name: '위대한 운명의 돌파석', count: 7 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 10 },
      ],
      [
        { name: '운명의 파괴석 결정', count: 475 }, { name: '운명의 수호석 결정', count: 950 },
        { name: '운명의 파편', count: 10100 }, { name: '위대한 운명의 돌파석', count: 10 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '전이 돌파석', count: 5 }, { name: '운명의 돌', count: 10 },
      ],
    ],
  },
  'armocha': {
    normal: [
      [
        { name: '운명의 파괴석', count: 820 }, { name: '운명의 수호석', count: 1640 },
        { name: '운명의 파편', count: 5400 }, { name: '운명의 돌파석', count: 9 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 7 },
      ],
      [
        { name: '운명의 파괴석', count: 960 }, { name: '운명의 수호석', count: 1920 },
        { name: '운명의 파편', count: 6800 }, { name: '운명의 돌파석', count: 12 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '순환 돌파석', count: 15 }, { name: '운명의 돌', count: 7 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석', count: 980 }, { name: '운명의 수호석', count: 1960 },
        { name: '운명의 파편', count: 6800 }, { name: '운명의 돌파석', count: 11 },
        { name: '고귀한 구원자의 팔찌', count: 1 }, { name: '위대한 비상의 돌', count: 8 },
      ],
      [
        { name: '운명의 파괴석', count: 1150 }, { name: '운명의 수호석', count: 2300 },
        { name: '운명의 파편', count: 8600 }, { name: '운명의 돌파석', count: 16 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 9 },
        { name: '순환 돌파석', count: 19 }, { name: '운명의 돌', count: 9 },
      ],
    ],
  },
  'mordum': {
    normal: [
      [
        { name: '운명의 파괴석', count: 320 }, { name: '운명의 수호석', count: 640 },
        { name: '운명의 파편', count: 2600 }, { name: '운명의 돌파석', count: 4 },
        { name: '고귀한 구원자의 팔찌', count: 1 }, { name: '위대한 비상의 돌', count: 4 },
        { name: '담금질 : 낙뢰의 뿔', count: 3 }, { name: '손길-담금질 : 낙뢰의 뿔', count: 3 },
        { name: '클리어 메달', count: 600 },
      ],
      [
        { name: '운명의 파괴석', count: 400 }, { name: '운명의 수호석', count: 800 },
        { name: '운명의 파편', count: 3000 }, { name: '운명의 돌파석', count: 4 },
        { name: '고귀한 구원자의 팔찌', count: 1 }, { name: '위대한 비상의 돌', count: 5 },
        { name: '담금질 : 낙뢰의 뿔', count: 5 }, { name: '손길-담금질 : 낙뢰의 뿔', count: 5 },
        { name: '클리어 메달', count: 700 },
      ],
      [
        { name: '운명의 파괴석', count: 520 }, { name: '운명의 수호석', count: 1040 },
        { name: '운명의 파편', count: 4200 }, { name: '운명의 돌파석', count: 6 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 6 },
        { name: '순환 돌파석', count: 11 }, { name: '운명의 돌', count: 5 },
        { name: '담금질 : 낙뢰의 뿔', count: 10 }, { name: '손길-담금질 : 낙뢰의 뿔', count: 10 },
        { name: '클리어 메달', count: 1400 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석', count: 440 }, { name: '운명의 수호석', count: 880 },
        { name: '운명의 파편', count: 3400 }, { name: '운명의 돌파석', count: 6 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 6 },
        { name: '담금질 : 우레의 뇌옥', count: 3 }, { name: '클리어 메달', count: 600 },
      ],
      [
        { name: '운명의 파괴석', count: 520 }, { name: '운명의 수호석', count: 1040 },
        { name: '운명의 파편', count: 4000 }, { name: '운명의 돌파석', count: 6 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '담금질 : 우레의 뇌옥', count: 5 }, { name: '클리어 메달', count: 700 },
      ],
      [
        { name: '운명의 파괴석', count: 640 }, { name: '운명의 수호석', count: 1280 },
        { name: '운명의 파편', count: 5600 }, { name: '운명의 돌파석', count: 8 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '순환 돌파석', count: 15 }, { name: '운명의 돌', count: 7 },
        { name: '담금질 : 우레의 뇌옥', count: 10 }, { name: '클리어 메달', count: 1400 },
      ],
    ],
  },
  'abrelshud-2': {
    normal: [
      [
        { name: '운명의 파괴석', count: 540 }, { name: '운명의 수호석', count: 1080 },
        { name: '운명의 파편', count: 4000 }, { name: '운명의 돌파석', count: 5 },
        { name: '찬란한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 6 },
        { name: '카르마의 잔영', count: 4 }, { name: '손길-카르마의 잔영', count: 4 },
        { name: '클리어 메달', count: 1000 },
      ],
      [
        { name: '운명의 파괴석', count: 640 }, { name: '운명의 수호석', count: 1280 },
        { name: '운명의 파편', count: 4600 }, { name: '운명의 돌파석', count: 6 },
        { name: '찬란한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '순환 돌파석', count: 11 }, { name: '운명의 돌', count: 4 },
        { name: '카르마의 잔영', count: 6 }, { name: '손길-카르마의 잔영', count: 6 },
        { name: '클리어 메달', count: 1300 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석', count: 640 }, { name: '운명의 수호석', count: 1280 },
        { name: '운명의 파편', count: 4600 }, { name: '운명의 돌파석', count: 7 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '카르마의 잔영', count: 8 }, { name: '클리어 메달', count: 1000 },
      ],
      [
        { name: '운명의 파괴석', count: 700 }, { name: '운명의 수호석', count: 1400 },
        { name: '운명의 파편', count: 6000 }, { name: '운명의 돌파석', count: 8 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '순환 돌파석', count: 13 }, { name: '운명의 돌', count: 6 },
        { name: '카르마의 잔영', count: 12 }, { name: '클리어 메달', count: 1300 },
      ],
    ],
  },
  'egir-1': {
    normal: [
      [
        { name: '운명의 파괴석', count: 480 }, { name: '운명의 수호석', count: 960 },
        { name: '운명의 파편', count: 3600 }, { name: '운명의 돌파석', count: 4 },
        { name: '찬란한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 6 },
        { name: '업화의 쐐기돌', count: 4 }, { name: '손길-업화의 쐐기돌', count: 4 },
        { name: '클리어 메달', count: 800 },
      ],
      [
        { name: '운명의 파괴석', count: 580 }, { name: '운명의 수호석', count: 1160 },
        { name: '운명의 파편', count: 4400 }, { name: '운명의 돌파석', count: 5 },
        { name: '찬란한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '순환 돌파석', count: 9 }, { name: '운명의 돌', count: 4 },
        { name: '업화의 쐐기돌', count: 6 }, { name: '손길-업화의 쐐기돌', count: 6 },
        { name: '클리어 메달', count: 1100 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석', count: 580 }, { name: '운명의 수호석', count: 1160 },
        { name: '운명의 파편', count: 4200 }, { name: '운명의 돌파석', count: 6 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '업화의 쐐기돌', count: 8 }, { name: '클리어 메달', count: 800 },
      ],
      [
        { name: '운명의 파괴석', count: 660 }, { name: '운명의 수호석', count: 1320 },
        { name: '운명의 파편', count: 5400 }, { name: '운명의 돌파석', count: 7 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '순환 돌파석', count: 12 }, { name: '운명의 돌', count: 5 },
        { name: '업화의 쐐기돌', count: 12 }, { name: '클리어 메달', count: 1100 },
      ],
    ],
  },
}

// ── 더보기 추가 재료 데이터 (lobal.kr 크롤링) ──────────────────────────────────
const GATE_MORE_MATERIALS = {
  'serca': {
    normal: [
      [
        { name: '운명의 파괴석', count: 1610 }, { name: '운명의 수호석', count: 3220 },
        { name: '운명의 파편', count: 13650 }, { name: '운명의 돌파석', count: 50 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 8 },
      ],
      [
        { name: '운명의 파괴석', count: 2480 }, { name: '운명의 수호석', count: 4960 },
        { name: '운명의 파편', count: 20880 }, { name: '운명의 돌파석', count: 82 },
        { name: '고귀한 구원자의 팔찌', count: 5 }, { name: '위대한 비상의 돌', count: 9 },
        { name: '순환 돌파석', count: 12 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석 결정', count: 750 }, { name: '운명의 수호석 결정', count: 1500 },
        { name: '운명의 파편', count: 17500 }, { name: '위대한 운명의 돌파석', count: 30 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '고통의 가시', count: 10 },
      ],
      [
        { name: '운명의 파괴석 결정', count: 1130 }, { name: '운명의 수호석 결정', count: 2260 },
        { name: '운명의 파편', count: 26820 }, { name: '위대한 운명의 돌파석', count: 45 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '전이 돌파석', count: 4 }, { name: '고통의 가시', count: 15 },
      ],
    ],
    nightmare: [
      [
        { name: '운명의 파괴석 결정', count: 860 }, { name: '운명의 수호석 결정', count: 1720 },
        { name: '운명의 파편', count: 19000 }, { name: '위대한 운명의 돌파석', count: 36 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '고통의 가시', count: 10 },
      ],
      [
        { name: '운명의 파괴석 결정', count: 1430 }, { name: '운명의 수호석 결정', count: 2860 },
        { name: '운명의 파편', count: 32200 }, { name: '위대한 운명의 돌파석', count: 60 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '전이 돌파석', count: 5 }, { name: '고통의 가시', count: 15 },
      ],
    ],
  },
  'cathedral': {
    stage1: [
      [
        { name: '운명의 파괴석', count: 1400 }, { name: '운명의 수호석', count: 2800 },
        { name: '운명의 파편', count: 11880 }, { name: '운명의 돌파석', count: 44 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '은총의 파편', count: 4 },
      ],
      [
        { name: '운명의 파괴석', count: 2400 }, { name: '운명의 수호석', count: 4800 },
        { name: '운명의 파편', count: 20160 }, { name: '운명의 돌파석', count: 78 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '순환 돌파석', count: 10 }, { name: '은총의 파편', count: 6 },
      ],
    ],
    stage2: [
      [
        { name: '운명의 파괴석', count: 1680 }, { name: '운명의 수호석', count: 3360 },
        { name: '운명의 파편', count: 14250 }, { name: '운명의 돌파석', count: 53 },
        { name: '고귀한 구원자의 팔찌', count: 1 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '은총의 파편', count: 12 },
      ],
      [
        { name: '운명의 파괴석', count: 2880 }, { name: '운명의 수호석', count: 5760 },
        { name: '운명의 파편', count: 24200 }, { name: '운명의 돌파석', count: 94 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 9 },
        { name: '순환 돌파석', count: 13 }, { name: '운명의 돌', count: 13 },
        { name: '은총의 파편', count: 18 },
      ],
    ],
    stage3: [
      [
        { name: '운명의 파괴석 결정', count: 860 }, { name: '운명의 수호석 결정', count: 1720 },
        { name: '운명의 파편', count: 19000 }, { name: '위대한 운명의 돌파석', count: 36 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '은총의 파편', count: 24 },
      ],
      [
        { name: '운명의 파괴석 결정', count: 1430 }, { name: '운명의 수호석 결정', count: 2860 },
        { name: '운명의 파편', count: 32200 }, { name: '위대한 운명의 돌파석', count: 60 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '전이 돌파석', count: 5 }, { name: '운명의 돌', count: 5 },
        { name: '은총의 파편', count: 36 },
      ],
    ],
  },
  'kazeros-final': {
    normal: [
      [
        { name: '운명의 파괴석', count: 1610 }, { name: '운명의 수호석', count: 3220 },
        { name: '운명의 파편', count: 13650 }, { name: '운명의 돌파석', count: 50 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 8 },
      ],
      [
        { name: '운명의 파괴석', count: 2760 }, { name: '운명의 수호석', count: 5520 },
        { name: '운명의 파편', count: 23200 }, { name: '운명의 돌파석', count: 90 },
        { name: '고귀한 구원자의 팔찌', count: 5 }, { name: '위대한 비상의 돌', count: 9 },
        { name: '순환 돌파석', count: 12 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석 결정', count: 750 }, { name: '운명의 수호석 결정', count: 1500 },
        { name: '운명의 파편', count: 17500 }, { name: '위대한 운명의 돌파석', count: 30 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 10 },
      ],
      [
        { name: '운명의 파괴석 결정', count: 1320 }, { name: '운명의 수호석 결정', count: 2640 },
        { name: '운명의 파편', count: 29800 }, { name: '위대한 운명의 돌파석', count: 50 },
        { name: '고귀한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 10 },
        { name: '전이 돌파석', count: 4 },
      ],
    ],
  },
  'armocha': {
    normal: [
      [
        { name: '운명의 파괴석', count: 1400 }, { name: '운명의 수호석', count: 2800 },
        { name: '운명의 파편', count: 11880 }, { name: '운명의 돌파석', count: 44 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 7 },
      ],
      [
        { name: '운명의 파괴석', count: 2400 }, { name: '운명의 수호석', count: 4800 },
        { name: '운명의 파편', count: 20160 }, { name: '운명의 돌파석', count: 78 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '순환 돌파석', count: 10 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석', count: 1680 }, { name: '운명의 수호석', count: 3360 },
        { name: '운명의 파편', count: 14250 }, { name: '운명의 돌파석', count: 53 },
        { name: '고귀한 구원자의 팔찌', count: 1 }, { name: '위대한 비상의 돌', count: 8 },
      ],
      [
        { name: '운명의 파괴석', count: 2880 }, { name: '운명의 수호석', count: 5760 },
        { name: '운명의 파편', count: 24200 }, { name: '운명의 돌파석', count: 94 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 9 },
        { name: '순환 돌파석', count: 13 },
      ],
    ],
  },
  'mordum': {
    normal: [
      [
        { name: '운명의 파괴석', count: 390 }, { name: '운명의 수호석', count: 780 },
        { name: '운명의 파편', count: 3680 }, { name: '운명의 돌파석', count: 12 },
        { name: '고귀한 구원자의 팔찌', count: 1 }, { name: '위대한 비상의 돌', count: 4 },
        { name: '담금질 : 낙뢰의 뿔', count: 3 }, { name: '손길-담금질 : 낙뢰의 뿔', count: 3 },
      ],
      [
        { name: '운명의 파괴석', count: 530 }, { name: '운명의 수호석', count: 1060 },
        { name: '운명의 파편', count: 4750 }, { name: '운명의 돌파석', count: 15 },
        { name: '고귀한 구원자의 팔찌', count: 1 }, { name: '위대한 비상의 돌', count: 5 },
        { name: '담금질 : 낙뢰의 뿔', count: 5 }, { name: '손길-담금질 : 낙뢰의 뿔', count: 5 },
      ],
      [
        { name: '운명의 파괴석', count: 780 }, { name: '운명의 수호석', count: 1560 },
        { name: '운명의 파편', count: 6810 }, { name: '운명의 돌파석', count: 21 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 6 },
        { name: '순환 돌파석', count: 7 },
        { name: '담금질 : 낙뢰의 뿔', count: 10 }, { name: '손길-담금질 : 낙뢰의 뿔', count: 10 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석', count: 600 }, { name: '운명의 수호석', count: 1200 },
        { name: '운명의 파편', count: 5000 }, { name: '운명의 돌파석', count: 23 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 6 },
        { name: '담금질 : 우레의 뇌옥', count: 3 }, { name: '손길-담금질 : 우레의 뇌옥', count: 3 },
      ],
      [
        { name: '운명의 파괴석', count: 830 }, { name: '운명의 수호석', count: 1660 },
        { name: '운명의 파편', count: 7200 }, { name: '운명의 돌파석', count: 27 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '담금질 : 우레의 뇌옥', count: 5 }, { name: '손길-담금질 : 우레의 뇌옥', count: 5 },
      ],
      [
        { name: '운명의 파괴석', count: 1460 }, { name: '운명의 수호석', count: 2920 },
        { name: '운명의 파편', count: 11760 }, { name: '운명의 돌파석', count: 45 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '순환 돌파석', count: 10 },
        { name: '담금질 : 우레의 뇌옥', count: 10 }, { name: '손길-담금질 : 우레의 뇌옥', count: 10 },
      ],
    ],
  },
  'abrelshud-2': {
    normal: [
      [
        { name: '운명의 파괴석', count: 610 }, { name: '운명의 수호석', count: 1220 },
        { name: '운명의 파편', count: 5200 }, { name: '운명의 돌파석', count: 13 },
        { name: '찬란한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 6 },
        { name: '카르마의 잔영', count: 4 }, { name: '손길-카르마의 잔영', count: 4 },
      ],
      [
        { name: '운명의 파괴석', count: 810 }, { name: '운명의 수호석', count: 1620 },
        { name: '운명의 파편', count: 8060 }, { name: '운명의 돌파석', count: 21 },
        { name: '찬란한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '순환 돌파석', count: 7 },
        { name: '카르마의 잔영', count: 6 }, { name: '손길-카르마의 잔영', count: 6 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석', count: 720 }, { name: '운명의 수호석', count: 1440 },
        { name: '운명의 파편', count: 6000 }, { name: '운명의 돌파석', count: 30 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '카르마의 잔영', count: 8 }, { name: '손길-카르마의 잔영', count: 8 },
      ],
      [
        { name: '운명의 파괴석', count: 1320 }, { name: '운명의 수호석', count: 2640 },
        { name: '운명의 파편', count: 10590 }, { name: '운명의 돌파석', count: 50 },
        { name: '고귀한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '순환 돌파석', count: 9 },
        { name: '카르마의 잔영', count: 12 }, { name: '손길-카르마의 잔영', count: 12 },
      ],
    ],
  },
  'egir-1': {
    normal: [
      [
        { name: '운명의 파괴석', count: 310 }, { name: '운명의 수호석', count: 620 },
        { name: '운명의 파편', count: 2800 }, { name: '운명의 돌파석', count: 8 },
        { name: '찬란한 구원자의 팔찌', count: 3 }, { name: '위대한 비상의 돌', count: 6 },
        { name: '업화의 쐐기돌', count: 4 }, { name: '손길-업화의 쐐기돌', count: 4 },
      ],
      [
        { name: '운명의 파괴석', count: 460 }, { name: '운명의 수호석', count: 920 },
        { name: '운명의 파편', count: 4480 }, { name: '운명의 돌파석', count: 15 },
        { name: '찬란한 구원자의 팔찌', count: 4 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '순환 돌파석', count: 7 },
        { name: '업화의 쐐기돌', count: 6 }, { name: '손길-업화의 쐐기돌', count: 6 },
      ],
    ],
    hard: [
      [
        { name: '운명의 파괴석', count: 610 }, { name: '운명의 수호석', count: 1220 },
        { name: '운명의 파편', count: 5280 }, { name: '운명의 돌파석', count: 18 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 7 },
        { name: '업화의 쐐기돌', count: 8 }, { name: '손길-업화의 쐐기돌', count: 8 },
      ],
      [
        { name: '운명의 파괴석', count: 940 }, { name: '운명의 수호석', count: 1880 },
        { name: '운명의 파편', count: 8930 }, { name: '운명의 돌파석', count: 31 },
        { name: '고귀한 구원자의 팔찌', count: 2 }, { name: '위대한 비상의 돌', count: 8 },
        { name: '순환 돌파석', count: 9 },
        { name: '업화의 쐐기돌', count: 12 }, { name: '손길-업화의 쐐기돌', count: 12 },
      ],
    ],
  },
}

function sum(arr) { return arr.reduce((a, b) => a + b, 0) }

function formatGold(g) {
  return g.toLocaleString()
}

// ── 재료 칩 ──────────────────────────────────────────────────────────────────
function MaterialChip({ name, count }) {
  const icon = MATERIAL_ICON[name]
  const displayName = MATERIAL_DISPLAY_NAME[name] ?? name
  return (
    <span className="relative group inline-flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] shadow-border rounded-lg px-2.5 py-1.5 shrink-0">
      {icon && <Image src={icon} alt={name} width={20} height={20} unoptimized className="shrink-0 opacity-90" />}
      <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200 tabular-nums">{count.toLocaleString()}</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
        {displayName}
      </span>
    </span>
  )
}

// ── 레이드 상세 ───────────────────────────────────────────────────────────────
function RaidDetail({ raid, diffKey, onDiffChange }) {
  const cat       = getRaidCategory(raid)
  const activeKey = diffKey ?? raid.difficulties[0].key
  const diff      = raid.difficulties.find(d => d.key === activeKey) ?? raid.difficulties[0]
  const gateCount = diff.gates

  const raidMaterials = GATE_MATERIALS[raid.id]
  const materials     = raidMaterials?.[activeKey]
  const fallbackKey   = raidMaterials ? Object.keys(raidMaterials).at(-1) : null
  const displayMats   = materials ?? raidMaterials?.[fallbackKey]
  const isFallback    = !materials && displayMats

  const moreMats = GATE_MORE_MATERIALS[raid.id]?.[activeKey]

  const totalBound = sum(diff.goldBound)
  const totalTrade = sum(diff.goldTrade)
  const totalGold  = totalBound + totalTrade
  const totalMore  = sum(diff.goldMore)

  const boundPct = totalGold > 0 ? Math.round(totalBound / totalGold * 100) : 0
  const tradePct = 100 - boundPct

  const hasMoreCol = moreMats && moreMats.some(g => g && g.length > 0)

  const [imgVisible, setImgVisible] = useState(false)
  const prevRaidId = useRef(null)
  useEffect(() => {
    if (prevRaidId.current !== raid.id) {
      setImgVisible(false)
      prevRaidId.current = raid.id
    }
  }, [raid.id])

  return (
    <div>
      {/* 레이드명 헤더 */}
      <div className="mb-5">
        {RAID_IMAGE[raid.id] && (
          <div className="relative w-full h-48 sm:h-60 rounded-2xl overflow-hidden mb-4">
            <Image
              src={RAID_IMAGE[raid.id]}
              alt={raid.name}
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover transition-opacity duration-300"
              style={{
                objectPosition: RAID_IMAGE_POSITION[raid.id] ?? '50% 15%',
                opacity: imgVisible ? 1 : 0,
              }}
              onLoad={() => setImgVisible(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 p-4">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${CAT_COLOR[cat]}`}>
                  {CAT_LABEL[cat]}
                </span>
                {raid.maxPlayers === 4 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
                    4인
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight drop-shadow">
                {raid.name}
              </h2>
              <p className="text-xs text-white/70 mt-0.5">
                최소 아이템레벨 {(diff.minItemLevel ?? raid.minItemLevel).toLocaleString()}
              </p>
            </div>
          </div>
        )}
        {!RAID_IMAGE[raid.id] && (
          <>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${CAT_COLOR[cat]}`}>
                {CAT_LABEL[cat]}
              </span>
              {raid.maxPlayers === 4 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-[#333] dark:text-gray-300 font-medium">
                  4인
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-50 tracking-tight">
              {raid.name}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              최소 아이템레벨 {(diff.minItemLevel ?? raid.minItemLevel).toLocaleString()}
            </p>
          </>
        )}
      </div>

      {/* 난이도 탭 + 골드 비율 */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex gap-0">
          {raid.difficulties.map(d => {
            const isActive = activeKey === d.key
            return (
              <button
                key={d.key}
                onClick={() => onDiffChange(d.key)}
                className={`px-4 py-2 text-sm font-bold transition-colors duration-150 whitespace-nowrap
                  border-b-2
                  ${isActive
                    ? 'border-[var(--accent-400)] text-gray-900 dark:text-gray-50'
                    : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
              >
                {DIFF_LABEL[d.key]}
              </button>
            )
          })}
        </div>

        {totalGold > 0 && (
          <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 shrink-0 pb-1">
            {boundPct > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 inline-block" />
                귀속 골드 {boundPct}%
              </span>
            )}
            {tradePct > 0 && (
              <span className="flex items-center gap-1 text-[var(--accent-500)] dark:text-[var(--accent-400)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-400)] inline-block" />
                거래 가능 골드 {tradePct}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* 보상 테이블 */}
      <div className="overflow-x-auto shadow-border rounded-2xl">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-[#2d2d2d] bg-gray-50 dark:bg-[#161616]">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 w-20">관문</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 w-36">골드</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500">클리어 보상</th>
              {hasMoreCol && (
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500">더보기 보상</th>
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: gateCount }, (_, i) => {
              const bound = diff.goldBound[i] || 0
              const trade = diff.goldTrade[i] || 0
              const more  = diff.goldMore[i] || 0
              const total = bound + trade
              return (
                <tr key={i} className="border-b border-gray-200 dark:border-[#2d2d2d] last:border-0">
                  <td className="py-4 px-4 align-top">
                    <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{i + 1}관문</span>
                  </td>
                  <td className="py-4 px-4 align-top">
                    <span className="text-lg font-black text-[var(--accent-600)] dark:text-[var(--accent-400)] tabular-nums">
                      {total.toLocaleString()}G
                    </span>
                    {more > 0 && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                        더보기 -{more.toLocaleString()}G
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-4 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {displayMats?.[i]?.map(item => (
                        <MaterialChip key={item.name} name={item.name} count={item.count} />
                      ))}
                    </div>
                  </td>
                  {hasMoreCol && (
                    <td className="py-4 px-4 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {moreMats?.[i]?.map(item => (
                          <MaterialChip key={item.name} name={item.name} count={item.count} />
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          {gateCount > 1 && (
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#161616]">
                <td className="py-3 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500">합계</td>
                <td colSpan={hasMoreCol ? 3 : 2} className="py-3 px-4">
                  <div className="flex items-center gap-2 flex-wrap text-sm tabular-nums">
                    {totalBound > 0 && totalTrade > 0 ? (
                      <>
                        <span className="text-gray-500 dark:text-gray-400">귀속 {totalBound.toLocaleString()}G</span>
                        <span className="text-gray-300 dark:text-gray-600">+</span>
                        <span className="text-[var(--accent-500)] dark:text-[var(--accent-400)]">거래 가능 {totalTrade.toLocaleString()}G</span>
                        <span className="text-gray-300 dark:text-gray-600">=</span>
                        <span className="font-black text-gray-900 dark:text-gray-50">{totalGold.toLocaleString()}G</span>
                      </>
                    ) : (
                      <span className="font-black text-gray-900 dark:text-gray-50">{totalGold.toLocaleString()}G</span>
                    )}
                    {totalMore > 0 && (
                      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                        (더보기 -{totalMore.toLocaleString()}G)
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {isFallback && (
        <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-600">
          * 재료 정보는 {DIFF_LABEL[fallbackKey]} 기준입니다
        </p>
      )}
    </div>
  )
}

// ── 카테고리 필터 버튼 ────────────────────────────────────────────────────────
function CategoryFilter({ activeCategory, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORIES.map(cat => (
        <button
          key={cat.key}
          onClick={() => onChange(cat.key)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors
            ${activeCategory === cat.key
              ? 'bg-[var(--accent-400)] text-[var(--accent-900)]'
              : 'bg-gray-100 text-gray-500 dark:bg-[#1e1e1e] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#252525]'
            }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function RaidRewardClient() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedRaidId, setSelectedRaidId] = useState(RAIDS[0].id)
  const [selectedDiff, setSelectedDiff]     = useState(RAIDS[0].difficulties[0].key)

  useEffect(() => {
    Object.values(RAID_IMAGE).forEach(src => {
      const img = new window.Image()
      img.src = src
    })
  }, [])

  const filteredRaids = useMemo(() =>
    activeCategory === 'all'
      ? RAIDS
      : RAIDS.filter(r => getRaidCategory(r) === activeCategory)
  , [activeCategory])

  const selectedRaid = useMemo(() =>
    RAIDS.find(r => r.id === selectedRaidId) ?? filteredRaids[0]
  , [selectedRaidId, filteredRaids])

  const currentDiffKey = selectedDiff ?? selectedRaid?.difficulties[0].key

  function handleCategoryChange(catKey) {
    setActiveCategory(catKey)
    const next = catKey === 'all' ? RAIDS : RAIDS.filter(r => getRaidCategory(r) === catKey)
    if (next.length > 0) {
      setSelectedRaidId(next[0].id)
      setSelectedDiff(next[0].difficulties[0].key)
    }
  }

  function handleRaidChange(raidId) {
    setSelectedRaidId(raidId)
    const raid = RAIDS.find(r => r.id === raidId)
    setSelectedDiff(raid?.difficulties[0].key ?? null)
  }

  function getMaxGold(raid) {
    const d = raid.difficulties[0]
    return sum(d.goldBound) + sum(d.goldTrade)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-2 pb-6 sm:pb-10">

      {/* 페이지 헤더 */}
      <div className="mb-5 flex items-baseline gap-3">
        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-50 tracking-tight">레이드 보상</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 shrink-0">관문별 골드 · 재료 보상 정보</p>
      </div>

      {/* ── 모바일 네비게이션 ── */}
      <div className="md:hidden space-y-3 mb-6">
        <CategoryFilter activeCategory={activeCategory} onChange={handleCategoryChange} />
        <select
          value={selectedRaid?.id ?? ''}
          onChange={e => handleRaidChange(e.target.value)}
          className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 appearance-none"
        >
          {filteredRaids.map(raid => (
            <option key={raid.id} value={raid.id}>{raid.name}</option>
          ))}
        </select>
      </div>

      {/* ── 레이아웃 ── */}
      <div className="md:flex gap-8 items-start">

        {/* 사이드바 (데스크탑) */}
        <div className="hidden md:flex flex-col w-52 shrink-0 gap-4">
          <CategoryFilter activeCategory={activeCategory} onChange={handleCategoryChange} />

          {/* 레이드 목록 */}
          <nav
            className="space-y-0.5"
          >
            {filteredRaids.map(raid => {
              const isSelected = selectedRaid?.id === raid.id
              const maxGold    = getMaxGold(raid)
              return (
                <button
                  key={raid.id}
                  onClick={() => handleRaidChange(raid.id)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all
                    ${isSelected
                      ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 text-[var(--accent-800)] dark:text-[var(--accent-300)]'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                >
                  <span className="text-sm font-semibold truncate flex-1">{raid.name}</span>
                  <span className={`text-[11px] font-bold shrink-0 tabular-nums
                    ${isSelected ? 'text-[var(--accent-600)] dark:text-[var(--accent-400)]' : 'text-gray-300 dark:text-gray-600'}`}
                  >
                    {formatGold(maxGold)}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* 구분선 (데스크탑) */}
        <div className="hidden md:block w-px self-stretch bg-gray-200 dark:bg-[#2d2d2d] shrink-0" />

        {/* 상세 패널 */}
        <div className="flex-1 min-w-0">
          {selectedRaid && (
            <RaidDetail
              raid={selectedRaid}
              diffKey={currentDiffKey}
              onDiffChange={setSelectedDiff}
            />
          )}
        </div>
      </div>
    </div>
  )
}
