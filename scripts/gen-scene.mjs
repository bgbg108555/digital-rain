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
const esc = c => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c)
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
  const glyph = () => {
    const r = rnd()
    return r < 0.42 ? pick(BIN) : r < 0.74 ? pick(HEX) : pick(SYM)
  }
  const hexWord = () => Array.from({ length: 4 }, () => pick(HEX)).join('')
  let css = ''

  // column patterns: dim tail, two bright glyphs, glowing head
  const COLS = 20
  const LEN = 24
  let defs = ''
  for (let c = 0; c < COLS; c++) {
    let t = `<text id="k${c}" class="col">`
    for (let i = 0; i < LEN; i++) {
      const cls = i === LEN - 1 ? ' class="hd"' : i >= LEN - 3 ? ' class="h2"' : ''
      t += `<tspan x="0" dy="1.15em"${cls}>${esc(glyph())}</tspan>`
    }
    defs += t + '</text>'
  }

  // three depth layers: [class, font px, spacing, duration range s]
  const speed = work ? 0.42 : 1
  const LAYERS = [
    ['L1', 12, 20, [14, 22]],
    ['L2', 17, 30, [8, 13]],
    ['L3', 26, 62, [4.8, 7.5]],
  ]
  let rain = ''
  let n = 0
  for (const [cls, fs, gap, [dmin, dmax]] of LAYERS) {
    rain += `<g class="${cls}">`
    for (let x = gap / 2 + rnd() * gap * 0.5; x < W; x += gap * (0.8 + rnd() * 0.4)) {
      const dur = (dmin + rnd() * (dmax - dmin)) * speed
      const steps = Math.round(2000 / (fs * 1.15))
      const phase = rnd()
      // the resting place is the column's phase, so a frame with animation off still scatters the rain
      css += `.r${n}{transform:translateY(${f1(-900 + 2000 * phase)}px);animation:fall ${f2(dur)}s steps(${steps}) ${f2(-phase * dur)}s infinite}`
      rain += `<use href="#k${Math.floor(rnd() * COLS)}" x="${f1(x)}" y="0" class="r${n}"/>`
      n++
    }
    rain += '</g>'
  }

  // horizontal data streams that fly across now and then
  let streams = ''
  const NS = work ? 12 : 6
  for (let i = 0; i < NS; i++) {
    const y = 60 + rnd() * (H - 120)
    const words = Array.from({ length: 14 }, () => `0x${hexWord()}`).join('  ')
    const d = (work ? 3.5 : 9) + rnd() * (work ? 3 : 6)
    css += `.s${i}{animation:stream ${f2(d)}s linear ${f2(-rnd() * d)}s infinite}`
    streams += `<text x="0" y="${f1(y)}" class="st s${i}">${words}</text>`
  }

  // glitch slices: thin bright bands that flash and jump
  let glitch = ''
  const NG = work ? 10 : 5
  for (let i = 0; i < NG; i++) {
    const y = rnd() * H
    const h = 4 + rnd() * 26
    const d = (work ? 1.6 : 4.5) + rnd() * (work ? 2 : 5)
    css += `.g${i}{animation:glitch ${f2(d)}s steps(1) ${f2(-rnd() * d)}s infinite}`
    glitch += `<rect x="0" y="${f1(y)}" width="${W}" height="${f1(h)}" class="gl g${i}"/>`
  }

  // flickering stray glyphs
  let flick = ''
  for (let i = 0; i < 46; i++) {
    const d = (work ? 0.8 : 1.6) + rnd() * (work ? 1.5 : 4)
    css += `.f${i}{animation:blink ${f2(d)}s steps(1) ${f2(-rnd() * 5)}s infinite}`
    flick += `<text x="${(rnd() * W).toFixed(0)}" y="${(rnd() * H).toFixed(0)}" class="fl f${i}">${esc(glyph())}</text>`
  }

  // HUD, top right, with rotating rings behind it
  const NB = ' '
  const label = s => s.replace(/ /g, NB).replace(/>/g, '&gt;')
  const lines = work
    ? [['> exec.thread[07] .. ', 'RUN', 'ok'], ['> stream  tokens ▲▲▲', '', ''], ['> load  ', '', 'barw'], ['> trace ', '', 'hx']]
    : [['> boot.seq ......... ', 'OK', 'ok'], ['> uplink 0x7F3A::C0DE', '', ''], ['> heap  ', '██████▒▒░░', 'bar'], ['> trace ', '', 'hx']]
  let hud = '<g class="hud"><g transform="translate(1120 215)">'
  hud += '<g transform="translate(142 45)" class="rings">'
  hud += '<g class="ring1"><circle r="150" class="rg" stroke-dasharray="2 10"/><path d="M0 -168 A168 168 0 0 1 119 -119" class="arc"/><path d="M0 168 A168 168 0 0 1 -119 119" class="arc"/></g>'
  hud += '<g class="ring2"><circle r="186" class="rg" stroke-dasharray="40 14 4 14"/></g>'
  hud += '<g class="ring3"><circle r="124" class="rg" stroke-dasharray="1 5"/></g>'
  hud += '</g>'
  hud += '<rect x="-16" y="-30" width="316" height="150" class="hudbox"/>'
  hud += '<path d="M-16 -18 V-30 H-4 M300 -18 V-30 H288 M-16 108 V120 H-4 M300 108 V120 H288" class="hudcorner"/>'
  if (work) {
    hud += `<text x="0" y="-38" class="tag">◉${NB}PROCESSING</text>`
  }
  lines.forEach(([a, b, kind], i) => {
    const y = i * 24
    if (kind === 'hx') {
      hud += `<text x="0" y="${y}" class="hl">${label(a)}</text>`
      ;['0x00FF41', '0x3A9F2C', '0xC0FFEE', '0x1BADB0', '0xDEC0DE', '0x7E57AB'].forEach((v, j) => {
        const cyc = work ? 1.2 : 3.6
        css += `.h${j}{animation:cycle ${cyc}s steps(1) ${f2((-j * cyc) / 6)}s infinite}`
        hud += `<text x="78" y="${y}" class="hl hv h${j}">${v}</text>`
      })
    } else if (kind === 'barw') {
      hud += `<text x="0" y="${y}" class="hl">${label(a)}</text>`
      hud += `<rect x="64" y="${y - 11}" width="128" height="12" class="barbg"/>`
      hud += `<rect x="64" y="${y - 11}" width="128" height="12" class="barfill"/>`
    } else {
      hud += `<text x="0" y="${y}" class="hl">${label(a)}<tspan class="${kind || 'x'}">${b}</tspan></text>`
    }
  })
  hud += `<text x="0" y="96" class="hl">&gt;<tspan class="cur">${NB}█</tspan></text>`
  hud += '</g></g>'

  // working only: edge glow pulse and a scan beam
  const workFx = work
    ? `<rect class="edge" width="${W}" height="${H}"/><rect class="beam" x="-60" y="0" width="60" height="${H}"/>`
    : ''

  const STYLE = [
    'text{font-family:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;text-anchor:middle}',
    '.bg{fill:url(#bgD)}',
    '.col{fill:url(#fadeD)}',
    '.h2{fill:#9dffc0}',
    '.hd{fill:#f2fff6;stroke:#3dff86;stroke-width:4px;stroke-opacity:.5;paint-order:stroke}',
    work ? '.L1{font-size:12px;opacity:.5}.L2{font-size:17px;opacity:.85}.L3{font-size:26px}' : '.L1{font-size:12px;opacity:.38}.L2{font-size:17px;opacity:.7}.L3{font-size:26px}',
    '@keyframes fall{from{transform:translateY(-900px)}to{transform:translateY(1100px)}}',
    '@keyframes blink{0%{opacity:0}62%{opacity:.85}70%{opacity:0}}',
    '@keyframes cycle{0%{opacity:1}16.66%{opacity:0}100%{opacity:0}}',
    '@keyframes sweep{from{transform:translateY(-260px)}to{transform:translateY(1260px)}}',
    '@keyframes caret{0%{opacity:1}50%{opacity:0}}',
    `@keyframes stream{0%{transform:translateX(${W + 60}px);opacity:0}3%{opacity:.85}${work ? 55 : 32}%{transform:translateX(-1900px);opacity:.85}${work ? 56 : 33}%,100%{transform:translateX(-1900px);opacity:0}}`,
    '@keyframes glitch{0%{opacity:0;transform:translateX(0)}88%{opacity:.22;transform:translateX(-24px)}91%{opacity:0}94%{opacity:.14;transform:translateX(18px)}97%{opacity:0}}',
    '@keyframes spin{to{transform:rotate(360deg)}}',
    '@keyframes spinr{to{transform:rotate(-360deg)}}',
    '@keyframes pulse{0%,100%{opacity:.25}50%{opacity:.7}}',
    '@keyframes beam{from{transform:translateX(0)}to{transform:translateX(1720px)}}',
    '@keyframes load{0%{transform:scaleX(.05)}70%{transform:scaleX(1)}100%{transform:scaleX(1)}}',
    '.fl{font-size:15px;fill:#6dffa3}',
    '.st{font-size:13px;text-anchor:start;fill:#7dffd0;letter-spacing:1px;opacity:0}',
    '.gl{fill:#2bff7a;opacity:0}',
    `.sweep{transform:translateY(-260px);animation:sweep ${work ? 4 : 11}s linear infinite}`,
    '.scan{fill:url(#scanD)}',
    '.dim{fill:url(#dimD)}',
    '.rg{fill:none;stroke:#2bff7a;stroke-opacity:.35;stroke-width:1.5}',
    '.arc{fill:none;stroke:#7dffd0;stroke-opacity:.6;stroke-width:2.5}',
    `.ring1{animation:spin ${work ? 6 : 26}s linear infinite}`,
    `.ring2{animation:spinr ${work ? 9 : 40}s linear infinite}`,
    `.ring3{animation:spin ${work ? 3 : 14}s linear infinite}`,
    '.hud{font-size:14px}',
    '.hl{text-anchor:start;fill:#6bf09a}',
    '.tag{text-anchor:start;fill:#ffcf4a;font-size:13px;letter-spacing:2px;animation:caret .8s steps(1) infinite}',
    '.hudbox{fill:#020a05;fill-opacity:.78;stroke:#2bff7a;stroke-opacity:.25}',
    '.hudcorner{fill:none;stroke:#2bff7a;stroke-opacity:.8;stroke-width:1.5}',
    '.ok{fill:#c8ffd8}',
    '.bar{fill:#2bff7a}',
    '.barbg{fill:#2bff7a;fill-opacity:.12}',
    '.barfill{fill:#2bff7a;transform-box:fill-box;transform-origin:left center;animation:load 1.6s ease-in-out infinite}',
    '.hv{opacity:0}.hv.h0{opacity:1}',
    `.cur{animation:caret ${work ? 0.5 : 1.1}s steps(1) infinite;fill:#c8ffd8}`,
    '.edge{fill:url(#edgeG);animation:pulse 1.4s ease-in-out infinite}',
    '.beam{fill:url(#beamG);animation:beam 2.6s linear infinite}',
    '@media (prefers-color-scheme:light){',
    '.bg{fill:url(#bgL)}.col{fill:url(#fadeL)}.h2{fill:#0b5a2a}.hd{fill:#03361a;stroke:#0f8a3c;stroke-opacity:.25}.fl{fill:#167a3c}',
    '.st{fill:#0b6b5a}.gl{fill:#0f8a3c}.scan{fill:url(#scanL)}.dim{fill:url(#dimL)}.hl{fill:#145c2f}.rg,.arc{stroke:#0f8a3c}',
    '.hudbox{fill:#f2f7ef;stroke:#0f8a3c}.hudcorner{stroke:#0f8a3c}.bar,.ok,.cur,.barfill{fill:#0b4d24}.tag{fill:#a86a00}',
    '.L1{opacity:.25}.L2{opacity:.42}.L3{opacity:.6}',
    '}',
    '@media (max-aspect-ratio:13/10){.hud{display:none}}',
    '@media (min-aspect-ratio:2/1){.hud{transform:translate(40px,40px)}}',
    '@media (min-aspect-ratio:5/2){.hud{transform:translate(60px,150px)}}',
    '@media (min-aspect-ratio:3/1){.hud{transform:translate(80px,175px)}}',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}.hv.h0{opacity:1}}',
  ].join('')

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<style>${STYLE}${css}</style>` +
    '<defs>' +
    `<linearGradient id="bgD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#010603"/><stop offset=".6" stop-color="${work ? '#04140b' : '#03100a'}"/><stop offset="1" stop-color="${work ? '#082414' : '#061a0f'}"/></linearGradient>` +
    '<linearGradient id="bgL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef4ea"/><stop offset="1" stop-color="#dce8d6"/></linearGradient>' +
    `<linearGradient id="fadeD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00ff55" stop-opacity="0"/><stop offset=".45" stop-color="#12d65e" stop-opacity="${work ? '.6' : '.5'}"/><stop offset=".9" stop-color="#45ff8e"/><stop offset="1" stop-color="#8dffb6"/></linearGradient>` +
    '<linearGradient id="fadeL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f8a3c" stop-opacity="0"/><stop offset=".55" stop-color="#0f8a3c" stop-opacity=".45"/><stop offset="1" stop-color="#0a5c28"/></linearGradient>' +
    '<linearGradient id="sweepG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2bff7a" stop-opacity="0"/><stop offset=".85" stop-color="#2bff7a" stop-opacity=".07"/><stop offset="1" stop-color="#9dffbf" stop-opacity=".18"/></linearGradient>' +
    '<linearGradient id="beamG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7dffd0" stop-opacity="0"/><stop offset=".85" stop-color="#7dffd0" stop-opacity=".1"/><stop offset="1" stop-color="#d8fff0" stop-opacity=".35"/></linearGradient>' +
    '<radialGradient id="edgeG" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#2bff7a" stop-opacity="0"/><stop offset="1" stop-color="#2bff7a" stop-opacity=".45"/></radialGradient>' +
    '<pattern id="scanD" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" fill-opacity=".32"/></pattern>' +
    '<pattern id="scanL" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#0f8a3c" fill-opacity=".06"/></pattern>' +
    '<radialGradient id="dimD" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="#010603" stop-opacity=".62"/><stop offset=".6" stop-color="#010603" stop-opacity=".25"/><stop offset="1" stop-color="#010603" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="dimL" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="#eef4ea" stop-opacity=".6"/><stop offset="1" stop-color="#eef4ea" stop-opacity="0"/></radialGradient>' +
    defs +
    '</defs>' +
    `<rect class="bg" width="${W}" height="${H}"/>` +
    rain +
    flick +
    streams +
    `<rect class="sweep" x="0" y="0" width="${W}" height="220" fill="url(#sweepG)"/>` +
    glitch +
    `<rect class="dim" width="${W}" height="${H}"/>` +
    workFx +
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
