'use client'

// Grid of МОСТ signs using designer PNG, masked with radial gradient.
// Signs at 4 rotations (0 / 90 / 180 / 270) in a deterministic pattern.
// Opacity fades toward edges — brighter in center-left where content is.

const COLS = 10
const ROWS = 7
const CELL_W = 140 // px, spacing between sign centers
const CELL_H = 120

const ROTATIONS = [0, 90, 180, 270]
const BASE_OPACITIES = [
  // Row 0 — top, very dim
  [0.04, 0.03, 0.05, 0.03, 0.04, 0.03, 0.04, 0.03, 0.04, 0.03],
  // Row 1
  [0.05, 0.07, 0.06, 0.08, 0.06, 0.07, 0.06, 0.05, 0.04, 0.03],
  // Row 2 — building toward center
  [0.06, 0.09, 0.10, 0.11, 0.09, 0.08, 0.07, 0.05, 0.04, 0.03],
  // Row 3 — peak row (center vertically)
  [0.07, 0.10, 0.12, 0.13, 0.11, 0.09, 0.07, 0.05, 0.04, 0.03],
  // Row 4
  [0.06, 0.08, 0.09, 0.10, 0.08, 0.07, 0.06, 0.04, 0.03, 0.02],
  // Row 5
  [0.04, 0.06, 0.07, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.02],
  // Row 6 — bottom, very dim
  [0.02, 0.03, 0.04, 0.04, 0.03, 0.03, 0.02, 0.02, 0.02, 0.01],
]

// Deterministic rotation per cell so it looks structured, not random
function getRotation(row: number, col: number) {
  return ROTATIONS[(row * 3 + col * 2) % 4]
}

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
      }}
    >
      {/* Radial mask overlay — fades pattern toward edges, stronger on right */}
      <div
        className="pattern-drift"
        style={{
          position: 'absolute',
          // Center the grid slightly left of center to match content position
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: COLS * CELL_W,
          height: ROWS * CELL_H,
          // Mask: visible center-left, fades at all edges, extra fade on right
          WebkitMaskImage:
            'radial-gradient(ellipse 65% 70% at 38% 50%, black 10%, rgba(0,0,0,0.6) 45%, transparent 80%)',
          maskImage:
            'radial-gradient(ellipse 65% 70% at 38% 50%, black 10%, rgba(0,0,0,0.6) 45%, transparent 80%)',
        }}
      >
        {BASE_OPACITIES.map((rowOpacities, row) =>
          rowOpacities.map((opacity, col) => {
            const rotation = getRotation(row, col)
            return (
              <img
                key={`${row}-${col}`}
                src="/assets/sign.png"
                alt=""
                style={{
                  position: 'absolute',
                  left: col * CELL_W + CELL_W / 2 - 28,
                  top: row * CELL_H + CELL_H / 2 - 32,
                  width: 56,
                  height: 64,
                  opacity,
                  transform: `rotate(${rotation}deg)`,
                  // Invert so sign shows as white on dark bg
                  filter: 'invert(1)',
                  objectFit: 'contain',
                  userSelect: 'none',
                  draggable: false,
                } as React.CSSProperties}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
