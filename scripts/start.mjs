// Production entrypoint: run `next start`, then warm the image-optimizer cache.
// Amvera wipes .next/cache/images on every deploy, so without this the first guests
// after a deploy wait 0.3–1.5s per photo while sharp resizes it.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PORT = process.env.PORT || '3000'
const BASE = `http://127.0.0.1:${PORT}`
const PAGES = ['/menu']
const WARM_WIDTHS = new Set([640, 750, 828, 1080, 1200])
const CONCURRENCY = 4

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next')
const server = spawn(process.execPath, [nextBin, 'start', '-p', PORT], { stdio: 'inherit' })

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.kill(sig))
}
server.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(BASE + PAGES[0])
      if (res.ok) return await res.text()
    } catch {}
    await sleep(1000)
  }
  throw new Error('server did not come up in 120s')
}

function imageUrls(html) {
  const urls = new Set()
  const decoded = html.replaceAll('&amp;', '&')
  for (const m of decoded.matchAll(/\/_next\/image\?url=[^"'\s,)]+/g)) {
    const w = Number(new URL(m[0], BASE).searchParams.get('w'))
    if (WARM_WIDTHS.has(w)) urls.add(m[0])
  }
  return [...urls]
}

async function warm() {
  const started = Date.now()
  const htmls = [await waitForServer()]
  for (const p of PAGES.slice(1)) htmls.push(await (await fetch(BASE + p)).text())
  const queue = [...new Set(htmls.flatMap(imageUrls))]
  const total = queue.length
  let ok = 0
  let failed = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const u = queue.shift()
        try {
          const res = await fetch(BASE + u, { headers: { accept: 'image/avif,image/webp,image/*,*/*;q=0.8' } })
          await res.arrayBuffer()
          res.ok ? ok++ : failed++
        } catch {
          failed++
        }
      }
    }),
  )
  console.log(`[warm] ${ok}/${total} images cached, ${failed} failed, ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

warm().catch((e) => console.error('[warm] skipped:', e.message))
