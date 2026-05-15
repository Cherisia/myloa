import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'myloa - 로스트아크 레이드 숙제 관리 & 공유'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
          <span
            style={{
              fontSize: 180,
              fontWeight: 800,
              color: '#888888',
              letterSpacing: '-4px',
            }}
          >
            my
          </span>
          <span
            style={{
              fontSize: 180,
              fontWeight: 800,
              color: '#C8A03B',
              letterSpacing: '-4px',
            }}
          >
            loa
          </span>
        </div>
        <p
          style={{
            fontSize: 38,
            color: '#999999',
            margin: '12px 0 0 0',
            letterSpacing: '1px',
            fontWeight: 400,
          }}
        >
          로스트아크 레이드 숙제 관리 & 공유
        </p>
      </div>
    ),
    { ...size }
  )
}
