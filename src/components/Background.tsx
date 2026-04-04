'use client'

// Background: 5-layer visual stack
//
// 1. Base fill        #050505  — set on container + --bg token
// 2. Grid lines       SVG 36×36px cells, rgba(255,255,255,0.06) stroke
// 3. Decorative tiles sign.png grid at 18% opacity, masked bottom→top+right
// 4. Vignette overlay radial-gradient transparent center → rgba(0,0,0,0.88)
// 5. Grain            feTurbulence fractalNoise at 3% opacity

const COLS = 5
const ROWS = 4
const CELL_W = 300
const CELL_H = 340
const TILE_W = 280
const TILE_H = 328
const TILE_OPACITY = 0.18

const ROTATIONS = [0, 90, 180, 270]

function getRotation(row: number, col: number) {
  return ROTATIONS[(row * 3 + col * 2) % 4]
}

// SVG grid: top and left edges only → forms a continuous grid when tiled
const GRID_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M 36 0 L 0 0 0 36' fill='none' stroke='rgba(255%2C255%2C255%2C0.06)' stroke-width='0.5'/%3E%3C/svg%3E")`

export default function Background() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#050505',
      }}
    >
      {/* Layer 2 — Grid of thin lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: GRID_SVG,
          backgroundSize: '36px 36px',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Layer 3 — Decorative sign.png tiles */}
      {/* Masked: invisible at bottom, grows toward top-right, solid at ~85% height */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          WebkitMaskImage:
            'linear-gradient(to top right, transparent 5%, rgba(0,0,0,0.2) 15%, rgba(0,0,0,0.6) 50%, black 85%)',
          maskImage:
            'linear-gradient(to top right, transparent 5%, rgba(0,0,0,0.2) 15%, rgba(0,0,0,0.6) 50%, black 85%)',
        }}
      >
        <div
          className="pattern-drift"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: COLS * CELL_W,
            height: ROWS * CELL_H,
          }}
        >
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => {
              const rotation = getRotation(row, col)
              return (
                <img
                  key={`${row}-${col}`}
                  src="/assets/sign.png"
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: col * CELL_W + CELL_W / 2 - TILE_W / 2,
                    top: row * CELL_H + CELL_H / 2 - TILE_H / 2,
                    width: TILE_W,
                    height: TILE_H,
                    opacity: TILE_OPACITY,
                    transform: `rotate(${rotation}deg)`,
                    objectFit: 'contain',
                    userSelect: 'none',
                  }}
                />
              )
            })
          )}
        </div>
      </div>

      {/* Layer 4 — Vignette: transparent center, dark edges — makes grid visible in middle */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.88) 100%)',
        }}
      />

      {/* Layer 5 — Grain texture (fractalNoise, baseFrequency 0.9, opacity 3%) */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03 }}>
        <svg width="100%" height="100%">
          <defs>
            <filter id="bg-grain" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves="4"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter="url(#bg-grain)" fill="white" />
        </svg>
      </div>
    </div>
  )
}
