// Generates the digital-rain scenes (idle and working), the working spinner strip and the
// band above the prompt (idle and working).
// usage: node gen-scene.mjs <scene.js out> [preview folder]
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [, , jsOut, previewDir] = process.argv

const W = 1600
const H = 1000
const BIN = ['0', '1']
const HEX = '0123456789ABCDEF'.split('')
const SYM = ['{', '}', '[', ']', '<', '>', '/', ';', ':', '=', '+', '*', '#', '$', '%', '&', '|', '~', '^', 'λ', 'Σ', 'Δ', 'Ω', 'π', '≡', '≠', '→', 'ƒ', '∴', '∞']
const esc = s => s.replace(/[<>&]/g, c => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;'))
const f1 = n => n.toFixed(1)
const f2 = n => n.toFixed(2)

function rng(s) {
  let seed = s
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function scene(mode) {
  const work = mode === 'work'
  const rnd = rng(0x5eed1337)
  const pick = a => a[Math.floor(rnd() * a.length)]
  // mostly binary and hex, a few quiet symbols; no arrows or math signs that read as noise
  const QUIET = ['{', '}', '[', ']', '<', '>', '/', ':', '=', '+', '*', 'λ', 'Σ', 'Δ', 'Ω', 'π']
  const glyph = () => {
    const r = rnd()
    return r < 0.5 ? pick(BIN) : r < 0.85 ? pick(HEX) : pick(QUIET)
  }
  const run = k => esc(Array.from({ length: k }, glyph).join(''))
  let css = ''

  // column patterns of varied length: a long tail fading in six steps, two bright glyphs and a white head
  // (a gradient fill does not reach vertical text, so the fade is stepped fill-opacity)
  const COLS = 24
  const columns = []
  for (let c = 0; c < COLS; c++) {
    const len = 12 + Math.floor(rnd() * 20)
    const seg = Math.max(1, Math.floor((len - 3) / 6))
    let t = ''
    for (let s = 1; s <= 6; s++) t += `<tspan class="t${s}">${run(s === 6 ? len - 3 - seg * 5 : seg)}</tspan>`
    columns.push({ len, body: `${t}<tspan class="h2">${run(2)}</tspan><tspan class="hd">${run(1)}</tspan>` })
  }

  // three depth layers, sparse in front: [class, font px, spacing, duration range s]
  const speed = work ? 0.5 : 1
  const LAYERS = [
    ['L1', 12, 30, [18, 26]],
    ['L2', 17, 64, [11, 16]],
    ['L3', 24, 150, [7, 10]],
  ]
  let rain = ''
  let n = 0
  for (const [cls, fs, gap, [dmin, dmax]] of LAYERS) {
    rain += `<g class="${cls}">`
    for (let x = gap * (0.3 + rnd() * 0.6); x < W; x += gap * (0.7 + rnd() * 0.6)) {
      const col = columns[Math.floor(rnd() * COLS)]
      const span = col.len * fs * 1.15
      const from = -span - 40
      const to = H + 40
      const dur = (dmin + rnd() * (dmax - dmin)) * speed
      const phase = rnd()
      // smooth fall; the resting place is the column's phase, so a still frame keeps the rain scattered
      css += `.r${n}{transform:translateY(${f1(from + (to - from) * phase)}px);animation:fall${n} ${f2(dur)}s linear ${f2(-phase * dur)}s infinite}@keyframes fall${n}{from{transform:translateY(${f1(from)}px)}to{transform:translateY(${f1(to)}px)}}`
      rain += `<text x="${f1(x)}" y="0" class="col r${n}">${col.body}</text>`
      n++
    }
    rain += '</g>'
  }

  // working only: a small status tag top right with a thin progress line
  const hud = work
    ? '<g class="hud" transform="translate(1340 64)"><circle cx="0" cy="-5" r="4" class="pdot"/><text x="14" y="0" class="tag">PROCESSING</text><rect x="0" y="14" width="160" height="2" class="barbg"/><rect x="0" y="14" width="160" height="2" class="barfill"/></g>'
    : ''

  const STYLE = [
    'text{font-family:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace}',
    '.bg{fill:url(#bgD)}',
    '.col{fill:#19d466;writing-mode:vertical-lr;text-orientation:upright;letter-spacing:.15em}',
    '.t1{fill-opacity:.05}.t2{fill-opacity:.1}.t3{fill-opacity:.18}.t4{fill-opacity:.3}.t5{fill-opacity:.46}.t6{fill-opacity:.66}',
    '.h2{fill:#a8ffc8}',
    '.hd{fill:#f4fff8;stroke:#4dff92;stroke-width:5px;stroke-opacity:.35;paint-order:stroke}',
    work ? '.L1{font-size:12px;opacity:.42}.L2{font-size:17px;opacity:.75}.L3{font-size:24px}' : '.L1{font-size:12px;opacity:.32}.L2{font-size:17px;opacity:.62}.L3{font-size:24px;opacity:.95}',
    '@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}',
    '@keyframes load{0%{transform:scaleX(0)}80%,100%{transform:scaleX(1)}}',
    '.tag{fill:#a8ffc8;font-size:13px;letter-spacing:3px}',
    '.pdot{fill:#4dff92;animation:pulse 1.2s ease-in-out infinite}',
    '.barbg{fill:#4dff92;fill-opacity:.15}',
    '.barfill{fill:#4dff92;transform-box:fill-box;transform-origin:left center;animation:load 2.4s ease-in-out infinite}',
    '.scan{fill:url(#scanD)}',
    '.dim{fill:url(#dimD)}',
    '@media (prefers-color-scheme:light){',
    '.bg{fill:url(#bgL)}.col{fill:#0f8a3c}.h2{fill:#0b5a2a}.hd{fill:#03361a;stroke:#0f8a3c;stroke-opacity:.2}',
    '.scan{fill:url(#scanL)}.dim{fill:url(#dimL)}.tag{fill:#0b4d24}.pdot,.barfill{fill:#0b4d24}.barbg{fill:#0f8a3c}',
    '.L1{opacity:.22}.L2{opacity:.4}.L3{opacity:.6}',
    '}',
    '@media (max-aspect-ratio:13/10){.hud{display:none}}',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}}',
  ].join('')

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">` +
    `<style>${STYLE}${css}</style>` +
    '<defs>' +
    `<linearGradient id="bgD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#010402"/><stop offset=".65" stop-color="${work ? '#031209' : '#020c06'}"/><stop offset="1" stop-color="${work ? '#06200f' : '#04160b'}"/></linearGradient>` +
    '<linearGradient id="bgL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef4ea"/><stop offset="1" stop-color="#dce8d6"/></linearGradient>' +
    '<pattern id="scanD" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#000" fill-opacity=".22"/></pattern>' +
    '<pattern id="scanL" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#0f8a3c" fill-opacity=".04"/></pattern>' +
    '<radialGradient id="dimD" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#010402" stop-opacity=".55"/><stop offset=".55" stop-color="#010402" stop-opacity=".2"/><stop offset="1" stop-color="#010402" stop-opacity=".5"/></radialGradient>' +
    '<radialGradient id="dimL" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#eef4ea" stop-opacity=".6"/><stop offset="1" stop-color="#eef4ea" stop-opacity="0"/></radialGradient>' +
    '</defs>' +
    `<rect class="bg" width="${W}" height="${H}"/>` +
    rain +
    `<rect class="dim" width="${W}" height="${H}"/>` +
    hud +
    `<rect class="scan" width="${W}" height="${H}"/>` +
    '</svg>'
  return { svg, columns: n }
}

// band above the prompt: link status, a hex ticker, a spectrum, a load meter and a
// scrambling address, with a packet running along the rule; faster while a turn runs
function band(mode) {
  const work = mode === 'work'
  const rnd = rng(work ? 0xba2d : 0xba2c)
  const pick = a => a[Math.floor(rnd() * a.length)]
  const BW = 960
  const BH = 30
  const sp = work ? 0.42 : 1
  let css = ''
  let body = ''

  // link status: a pulsing dot and the label
  body += `<circle cx="13" cy="15" r="4" class="dot"/><circle cx="13" cy="15" r="4" class="ring"/>`
  const label = work ? 'DECRYPTING' : 'LINK:SECURE'
  body += `<text x="26" y="19.5" class="lab">${label}</text>`
  // a 13px monospace cell is about 7.8 wide, plus the 1.5 letter spacing
  body += `<rect x="${Math.round(26 + label.length * 9.3 + 4)}" y="9" width="7" height="12" class="cur"/>`

  // hex ticker: two copies forced to one width, slid by exactly that width
  const TX = 160
  const TWIN = 400
  const COPY = 780
  const words = Array.from({ length: 20 }, () =>
    rnd() < 0.12 ? pick(['::', '>>', '##', '//']) + pick(HEX) + pick(HEX) : Array.from({ length: 4 }, () => pick(HEX)).join(''),
  )
  const line = words.map(esc).join(' ')
  const hot = new Set([3, 11, 17])
  const spans = words.map((w, i) => (hot.has(i) ? `<tspan class="tkh">${esc(w)}</tspan>` : esc(w))).join(' ')
  body +=
    `<g clip-path="url(#tc)" mask="url(#tm)"><g class="tk">` +
    `<text x="${TX}" y="19.5" class="tkt" textLength="${COPY}" lengthAdjust="spacing">${spans}</text>` +
    `<text x="${TX + COPY}" y="19.5" class="tkt" textLength="${COPY}" lengthAdjust="spacing">${line}</text>` +
    '</g></g>'
  css += `@keyframes tk{from{transform:translateX(0)}to{transform:translateX(-${COPY}px)}}`
  css += `.tk{animation:tk ${f1(28 * sp)}s linear infinite}`

  // spectrum: bars that jump between random heights
  const BX = 578
  for (let i = 0; i < 14; i++) {
    const hs = Array.from({ length: 6 }, () => f2((work ? 0.35 : 0.15) + rnd() * (work ? 0.65 : 0.7)))
    css += `@keyframes b${i}{` + hs.map((h, k) => `${k * 20}%{transform:scaleY(${h})}`).join('') + `100%{transform:scaleY(${hs[0]})}}`
    css += `.b${i}{animation:b${i} ${f2((0.9 + rnd() * 0.8) * sp)}s steps(1) ${f2(-rnd() * 2)}s infinite}`
    body += `<rect x="${BX + i * 9}" y="7" width="5" height="17" class="bar b${i}"/>`
  }

  // load meter: eight cells, the last ones flicker
  body += `<text x="724" y="19.5" class="lab dim">SYS</text>`
  for (let i = 0; i < 8; i++) {
    const x = 754 + i * 10
    const on = i < (work ? 7 : 5)
    if (on && i < (work ? 5 : 3)) {
      body += `<rect x="${x}" y="9" width="7" height="12" class="cell"/>`
    } else {
      css += `.m${i}{animation:fl ${f2((0.5 + rnd() * 0.9) * sp)}s steps(1) ${f2(-rnd())}s infinite}`
      body += `<rect x="${x}" y="9" width="7" height="12" class="cell m${i}${on ? '' : ' low'}"/>`
    }
  }

  // scrambling address: four slots, four glyphs each, cycling
  body += `<text x="852" y="19.5" class="lab dim">0x</text>`
  for (let i = 0; i < 4; i++) {
    const x = 878 + i * 11
    const d = (0.5 + rnd() * 0.7) * sp
    const base = rnd() * d
    for (let j = 0; j < 4; j++) {
      css += `.s${i}_${j}{animation:cy ${f2(d)}s steps(1) ${f2(-(j * d) / 4 - base)}s infinite}`
      body += `<text x="${x}" y="19.5" class="sl s${i}_${j}${j === 0 ? ' s0' : ''}">${pick(HEX)}</text>`
    }
  }

  // the rule and a packet running along it
  body += `<rect x="0" y="${BH - 2}" width="${BW}" height="1" class="rule"/>`
  body += `<rect x="-60" y="${BH - 3}" width="60" height="3" class="pk"/>`
  css += `@keyframes pk{from{transform:translateX(0)}to{transform:translateX(${BW + 60}px)}}`
  css += `.pk{fill:url(#pg);animation:pk ${f1(3.4 * sp)}s linear infinite}`

  const style = [
    'text{font-family:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;font-size:13px}',
    '@keyframes pu{0%,100%{opacity:1}50%{opacity:.35}}',
    '@keyframes rg{from{transform:scale(1);opacity:.7}to{transform:scale(2.6);opacity:0}}',
    '@keyframes bk{0%{opacity:1}50%{opacity:0}}',
    '@keyframes fl{0%{opacity:1}40%{opacity:.25}70%{opacity:1}85%{opacity:.5}}',
    '@keyframes cy{0%{opacity:1}25%{opacity:0}100%{opacity:0}}',
    '.bg{fill:#020c06;fill-opacity:.55;stroke:#2bff7a;stroke-opacity:.18}',
    `.dot{fill:${work ? '#ffb000' : '#2bff7a'};animation:pu ${work ? 0.5 : 1.6}s ease-in-out infinite}`,
    `.ring{fill:none;stroke:${work ? '#ffb000' : '#2bff7a'};stroke-width:1.5;transform-box:fill-box;transform-origin:center;animation:rg ${work ? 0.9 : 2.2}s ease-out infinite}`,
    '.lab{fill:#9dffc0;font-weight:700;letter-spacing:1.5px}.dim{fill:#5fd88c;font-weight:400}',
    `.cur{fill:#c8ffd8;animation:bk ${work ? 0.45 : 1}s steps(1) infinite}`,
    '.tkt{fill:#3fbf6f}.tkh{fill:#f2fff6}',
    '.bar{fill:#2bff7a;fill-opacity:.85;transform-box:fill-box;transform-origin:bottom}',
    '.cell{fill:#2bff7a}.low{fill-opacity:.25}',
    '.sl{fill:#e6fff0;text-anchor:middle;opacity:0}',
    '.rule{fill:#2bff7a;fill-opacity:.35}',
    '@media (prefers-color-scheme:light){',
    '.bg{fill:#eef4ea;fill-opacity:.7;stroke:#0f8a3c;stroke-opacity:.3}.lab{fill:#0b4d24}.dim{fill:#2f6b43}',
    '.tkt{fill:#2f7a4a}.tkh{fill:#06200f}.bar,.cell,.rule{fill:#0f8a3c}.sl{fill:#06200f}.cur{fill:#0b4d24}',
    `.dot{fill:${work ? '#a86a00' : '#0f8a3c'}}.ring{stroke:${work ? '#a86a00' : '#0f8a3c'}}`,
    '}',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}.s0{opacity:1}.ring{opacity:0}}',
  ].join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BW} ${BH}" width="${BW}" height="${BH}">` +
    `<style>${style}${css}</style>` +
    '<defs>' +
    `<clipPath id="tc"><rect x="${TX}" y="0" width="${TWIN}" height="${BH}"/></clipPath>` +
    `<linearGradient id="tf" x1="${TX}" y1="0" x2="${TX + TWIN}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".12" stop-color="#fff"/><stop offset=".88" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<mask id="tm" maskUnits="userSpaceOnUse" x="0" y="0" width="${BW}" height="${BH}"><rect x="${TX}" y="0" width="${TWIN}" height="${BH}" fill="url(#tf)"/></mask>` +
    '<linearGradient id="pg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2bff7a" stop-opacity="0"/><stop offset="1" stop-color="#d8fff0"/></linearGradient>' +
    '</defs>' +
    `<rect x=".5" y=".5" width="${BW - 1}" height="${BH - 1}" rx="4" class="bg"/>` +
    body +
    '</svg>'
  )
}

// working strip: scrambling hex slots, a scanner and a block cursor
function spinner() {
  const rnd = rng(0xc0de)
  const pick = a => a[Math.floor(rnd() * a.length)]
  const SW = 220
  const SH = 22
  let css = ''
  let body = ''
  const SLOTS = 16
  for (let i = 0; i < SLOTS; i++) {
    const x = 12 + i * 11
    const d = 0.35 + rnd() * 0.6
    const base = rnd() * d
    for (let j = 0; j < 4; j++) {
      const g = rnd() < 0.5 ? pick(HEX) : pick([...BIN, ...SYM.slice(0, 19)])
      const k = `${i}_${j}`
      css += `.q${k}{animation:cy ${f2(d)}s steps(1) ${f2(-(j * d) / 4 - base)}s infinite}`
      body += `<text x="${x}" y="15.5" class="q q${k}${rnd() < 0.15 ? ' qb' : ''}">${esc(g)}</text>`
    }
  }
  const style = [
    'text{font-family:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;font-size:13px;text-anchor:middle}',
    '@keyframes cy{0%{opacity:1}25%{opacity:0}100%{opacity:0}}',
    '@keyframes sc{from{transform:translateX(-40px)}to{transform:translateX(230px)}}',
    '@keyframes bk{0%{opacity:1}50%{opacity:0}}',
    '.q{fill:#3dff86;opacity:0}.qb{fill:#f2fff6}',
    '.fr{fill:#020c06;fill-opacity:.85;stroke:#2bff7a;stroke-opacity:.6}',
    '.sc{fill:url(#sg);animation:sc 1.3s linear infinite}',
    '.bk{fill:#c8ffd8;animation:bk .6s steps(1) infinite}',
  ].join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}">` +
    `<style>${style}${css}</style>` +
    '<defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2bff7a" stop-opacity="0"/><stop offset="1" stop-color="#9dffbf" stop-opacity=".45"/></linearGradient></defs>' +
    `<rect x=".5" y=".5" width="${SW - 1}" height="${SH - 1}" rx="3" class="fr"/>` +
    body +
    `<rect x="0" y="2" width="36" height="${SH - 4}" class="sc"/>` +
    `<rect x="${SW - 18}" y="5" width="8" height="12" class="bk"/>` +
    '</svg>'
  return svg
}

const idle = scene('idle')
const work = scene('work')
const spin = spinner()
const bandIdle = band('idle')
const bandWork = band('work')
const out = [['idle', idle.svg], ['work', work.svg], ['spinner', spin], ['band-idle', bandIdle], ['band-work', bandWork]]
for (const [name, s] of out) {
  console.log(name, s.length, 'chars')
  if (s.length > 131072) throw new Error(`${name} too big`)
}
writeFileSync(
  jsOut,
  `// Generated by scripts/gen-scene.mjs: digital-rain scenes (${idle.columns} columns), the working strip and the band.\n` +
    `export const SCENE_IDLE = ${JSON.stringify(idle.svg)}\n` +
    `export const SCENE_WORK = ${JSON.stringify(work.svg)}\n` +
    `export const SPINNER = ${JSON.stringify(spin)}\n` +
    `export const BAND_IDLE = ${JSON.stringify(bandIdle)}\n` +
    `export const BAND_WORK = ${JSON.stringify(bandWork)}\n`,
)
if (previewDir) {
  for (const [name, s] of out) {
    writeFileSync(join(previewDir, `${name}.svg`), s)
  }
}
