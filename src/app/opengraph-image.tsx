import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Wasiyati — Personal messages, thoughtfully scheduled'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 88, background: '#fdf8f0', color: '#32291e', border: '20px solid #e8dcc7' }}>
      <div style={{ fontSize: 24, letterSpacing: 8, color: '#906219', marginBottom: 38 }}>WASIYATI</div>
      <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.2 }}>Write today.</div>
      <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.2, color: '#906219' }}>Reach them later.</div>
      <div style={{ fontSize: 26, marginTop: 38 }}>Personal messages, thoughtfully scheduled.</div>
    </div>, size,
  )
}
