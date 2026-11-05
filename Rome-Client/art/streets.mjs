// Source art for the scenes inside the city. Each scene is drawn at 1600 x 900,
// with real openings cut through it so the next scene shows behind it.
import { svg } from './scenes.mjs'

const WIDTH = 1600
const HEIGHT = 900

const STARS = [
  [70, 62], [190, 130], [330, 45], [460, 112], [600, 70], [760, 36], [905, 85], [1040, 40],
  [1160, 118], [1290, 58], [1420, 128], [1540, 52], [560, 165], [1230, 175],
]

const sharedDefs = `
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#151b2c" />
    <stop offset="0.38" stop-color="#2d2c44" />
    <stop offset="0.56" stop-color="#6d4b58" />
    <stop offset="0.68" stop-color="#c58757" />
  </linearGradient>
  <radialGradient id="lantern-glow">
    <stop offset="0" stop-color="#f2b35d" stop-opacity="0.42" />
    <stop offset="1" stop-color="#f2b35d" stop-opacity="0" />
  </radialGradient>
  <radialGradient id="window-glow">
    <stop offset="0" stop-color="#f2b35d" stop-opacity="0.28" />
    <stop offset="1" stop-color="#f2b35d" stop-opacity="0" />
  </radialGradient>
  <linearGradient id="street-shade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0b0b12" stop-opacity="0" />
    <stop offset="1" stop-color="#0b0b12" stop-opacity="0.62" />
  </linearGradient>
  <filter id="grained" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="4" />
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.75 0 0 0 -0.315" result="noise" />
    <feComposite in="noise" in2="SourceAlpha" operator="in" result="speckle" />
    <feComponentTransfer in="speckle" result="soft"><feFuncA type="linear" slope="0.2" /></feComponentTransfer>
    <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="soft" /></feMerge>
  </filter>`

const sky = `
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)" />
  ${STARS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#efe7d5" opacity="0.72" />`).join('')}`

const shade = `<rect y="760" width="${WIDTH}" height="140" fill="url(#street-shade)" />`

// A cutout shaped like an arch, centered on x, with its top at `top`.
const archPath = (x, halfWidth, spring, bottom) => (
  `M${x - halfWidth} ${bottom}V${spring}A${halfWidth} ${halfWidth} 0 0 1 ${x + halfWidth} ${spring}V${bottom}Z`
)

const openingMask = (path) => `
  <mask id="opening" maskUnits="userSpaceOnUse" x="0" y="0" width="${WIDTH}" height="${HEIGHT}">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#fff" />
    <path d="${path}" fill="#000" />
  </mask>`

function house({ x, w, h, base, roof, wall }, index) {
  const top = base - h
  const columns = Math.max(2, Math.floor(w / 48))
  const rows = Math.max(2, Math.floor((h - 60) / 58))
  const size = w / (columns * 2.4)
  let windows = ''

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const lit = (index * 3 + row * 5 + column * 7) % 3 !== 0
      const windowX = x + ((column + 0.5) * w) / columns - size / 2
      const windowY = top + 22 + row * 56
      const windowHeight = size * 1.35

      if (lit) {
        windows += `<ellipse cx="${windowX + size / 2}" cy="${windowY + windowHeight / 2}" rx="${size * 1.25}" ry="${size * 1.45}" fill="url(#window-glow)" />`
      }
      windows += `<rect x="${windowX}" y="${windowY}" width="${size}" height="${windowHeight}" rx="2" fill="${lit ? '#e6a94f' : '#211c1f'}" opacity="${lit ? 0.92 : 1}" />`
      windows += `<path d="M${windowX + size / 2} ${windowY}V${windowY + windowHeight}M${windowX} ${windowY + windowHeight / 2}H${windowX + size}" stroke="#2c2422" stroke-width="1.6" />`
    }
  }

  return `
    <polygon points="${x - 12},${top} ${x + w / 2},${top - roof} ${x + w + 12},${top}" fill="#241f24" />
    <rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${wall}" />
    <path d="M${x} ${top + 3}H${x + w}M${x} ${base - 42}H${x + w}M${x + 3} ${top}V${base}M${x + w - 3} ${top}V${base}" stroke="#231c1c" stroke-width="6" fill="none" />
    ${windows}
    <path d="M${x + w / 2 - 15} ${base}V${base - 36}A15 15 0 0 1 ${x + w / 2 + 15} ${base - 36}V${base}Z" fill="#1d1718" />`
}

const lantern = (x, y = 548) => `
  <circle cx="${x}" cy="${y}" r="120" fill="url(#lantern-glow)" />
  <rect x="${x - 4}" y="${y + 7}" width="8" height="150" fill="#1b1719" />
  <path d="M${x - 15} ${y - 18}H${x + 15}L${x + 10} ${y + 14}H${x - 10}Z" fill="#f0b45c" stroke="#1b1719" stroke-width="5" />
  <path d="M${x - 20} ${y - 18}L${x} ${y - 36}L${x + 20} ${y - 18}Z" fill="#1b1719" />`

// A house in the row with a passage through it, so the street carries on behind.
function passageHouse({ left, width, top, base, roof, center, halfWidth, spring }) {
  const right = left + width
  const floorLine = spring - halfWidth - 26
  const windows = [left + width * 0.2, left + width * 0.5, left + width * 0.8].map((x, index) => {
    const lit = index !== 1
    const size = 30
    const y = top + 26
    return `
      ${lit ? `<ellipse cx="${x}" cy="${y + 20}" rx="38" ry="44" fill="url(#window-glow)" />` : ''}
      <rect x="${x - size / 2}" y="${y}" width="${size}" height="40" rx="2" fill="${lit ? '#e6a94f' : '#211c1f'}" opacity="${lit ? 0.92 : 1}" />
      <path d="M${x} ${y}V${y + 40}M${x - size / 2} ${y + 20}H${x + size / 2}" stroke="#2c2422" stroke-width="1.6" />`
  }).join('')

  return `
    <polygon points="${left - 14},${top} ${(left + right) / 2},${top - roof} ${right + 14},${top}" fill="#241f24" />
    <rect x="${left}" y="${top}" width="${width}" height="${base - top}" fill="#4a3d3a" />
    <path d="M${left} ${top + 3}H${right}M${left} ${floorLine}H${right}M${left + 3} ${top}V${base}M${right - 3} ${top}V${base}" stroke="#231c1c" stroke-width="6" fill="none" />
    ${windows}
    <path d="M${center - halfWidth - 11} ${base}V${spring}A${halfWidth + 11} ${halfWidth + 11} 0 0 1 ${center + halfWidth + 11} ${spring}V${base}" fill="none" stroke="#5f5855" stroke-width="20" stroke-dasharray="24 3" />`
}

const citadel = (x, y, scale = 1) => `
  <g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M-330 240C-210 120 -120 96 -40 86H70C160 104 240 140 340 240Z" fill="#242439" />
    <path d="M-110 90V-20H-70V-48H-48V-20H-10V-92H-30V-124H-10V-104H12V-124H34V-104H56V-124H78V-92H58V-20H100V-46H122V-20H150V90Z" fill="#1c1d30" />
    <polygon points="-70,-48 -59,-90 -48,-48" fill="#171827" />
    <polygon points="100,-46 111,-90 122,-46" fill="#171827" />
    <rect x="12" y="-58" width="12" height="26" rx="6" fill="#d89647" />
    <rect x="-40" y="16" width="10" height="20" rx="5" fill="#d89647" />
    <rect x="90" y="30" width="10" height="20" rx="5" fill="#d89647" />
    <rect x="130" y="4" width="8" height="18" rx="4" fill="#b67c3a" />
  </g>`

const cobbleDefs = (x, cobbleA, cobbleB) => `
  <radialGradient id="ground-light" gradientUnits="userSpaceOnUse" cx="${x}" cy="650" r="980">
    <stop offset="0" stop-color="#8a7263" stop-opacity="0.65" />
    <stop offset="1" stop-color="#7a6459" stop-opacity="0.08" />
  </radialGradient>
  <pattern id="cobbles" width="64" height="36" patternUnits="userSpaceOnUse">
    <ellipse cx="16" cy="9" rx="14" ry="7" fill="${cobbleA}" />
    <ellipse cx="48" cy="9" rx="14" ry="7" fill="${cobbleB}" />
    <ellipse cx="0" cy="27" rx="14" ry="7" fill="${cobbleB}" />
    <ellipse cx="32" cy="27" rx="14" ry="7" fill="${cobbleA}" />
    <ellipse cx="64" cy="27" rx="14" ry="7" fill="${cobbleB}" />
  </pattern>`

const ground = (base) => `
  <rect y="585" width="${WIDTH}" height="315" fill="${base}" />
  <rect y="585" width="${WIDTH}" height="315" fill="url(#cobbles)" />
  <rect y="585" width="${WIDTH}" height="315" fill="url(#ground-light)" />`

const sceneSize = { width: WIDTH, height: HEIGHT, outputWidth: 1920, outputHeight: 1080 }

// --------------------------------------------------------------------- Forum

const FORUM_BACK = [
  { x: 150, w: 130, h: 150, roof: 70, wall: '#4a3d3a' },
  { x: 285, w: 110, h: 185, roof: 60, wall: '#3f3634' },
  { x: 548, w: 120, h: 170, roof: 65, wall: '#443936' },
  { x: 932, w: 125, h: 165, roof: 65, wall: '#4a3d3a' },
  { x: 1065, w: 135, h: 140, roof: 80, wall: '#3f3634' },
  { x: 1205, w: 110, h: 190, roof: 60, wall: '#51423c' },
  { x: 1320, w: 135, h: 150, roof: 70, wall: '#443936' },
].map((item) => ({ ...item, base: 590 }))

const FORUM_NEAR = [
  { x: -60, w: 180, h: 290, base: 730, roof: 110, wall: '#332b2c' },
  { x: 1478, w: 170, h: 280, base: 735, roof: 105, wall: '#332b2c' },
]

const church = `
  <rect x="700" y="420" width="200" height="170" fill="#3b3338" />
  <rect x="755" y="285" width="90" height="135" fill="#352e33" />
  <polygon points="745,285 800,135 855,285" fill="#211d22" />
  <rect x="796" y="100" width="8" height="42" fill="#211d22" />
  <rect x="782" y="112" width="36" height="7" fill="#211d22" />
  <circle cx="800" cy="456" r="56" fill="url(#window-glow)" />
  <circle cx="800" cy="456" r="28" fill="#e6a94f" opacity="0.92" />
  <path d="M800 428V484M772 456H828M780 436L820 476M820 436L780 476" stroke="#2a2428" stroke-width="4" />
  <rect x="785" y="330" width="30" height="58" rx="15" fill="#e6a94f" opacity="0.65" />`

const well = `
  <g transform="translate(0 34)">
    <ellipse cx="800" cy="636" rx="86" ry="20" fill="#171315" opacity="0.5" />
    <path d="M736 565V610A64 18 0 0 0 864 610V565Z" fill="#5a5356" />
    <path d="M736 582A64 18 0 0 0 864 582M736 598A64 18 0 0 0 864 598" fill="none" stroke="#363134" stroke-width="3" />
    <ellipse cx="800" cy="565" rx="64" ry="18" fill="#6a6265" />
    <ellipse cx="800" cy="566" rx="48" ry="11" fill="#1d2935" />
    <path d="M746 565V492M854 565V492" stroke="#2a2022" stroke-width="8" />
    <polygon points="724,498 800,448 876,498" fill="#2d2024" />
    <path d="M800 495V548" stroke="#17120f" stroke-width="2" />
    <rect x="790" y="546" width="20" height="17" rx="2" fill="#5a3c28" />
  </g>`

const school = (x) => `
  <g transform="translate(${x} 0)">
    <ellipse cx="130" cy="735" rx="165" ry="18" fill="#171315" opacity="0.45" />
    <rect x="0" y="430" width="260" height="300" fill="#6a5d57" />
    <path d="M0 490H260M0 550H260M0 610H260M0 670H260" stroke="#50464a" stroke-width="3" />
    <polygon points="-26,430 130,312 286,430" fill="#352b2e" />
    <polygon points="20,430 130,348 240,430" fill="#5d4f4b" />
    <circle cx="130" cy="402" r="20" fill="#e6a94f" />
    <path d="M130 382V422M110 402H150" stroke="#3a3030" stroke-width="3" />
    <rect x="-26" y="430" width="312" height="16" fill="#3e3438" />
    ${[30, 92, 168, 230].map((column) => `<rect x="${column - 11}" y="446" width="22" height="284" fill="#85796f" /><rect x="${column - 15}" y="446" width="30" height="12" fill="#9b8f84" /><rect x="${column - 15}" y="718" width="30" height="12" fill="#9b8f84" />`).join('')}
    <path d="M102 730V620A28 28 0 0 1 158 620V730Z" fill="#20191a" />
    <path d="M52 490H72V566H52ZM188 490H208V566H188Z" fill="#e6a94f" />
    <path d="M62 490V566M198 490V566" stroke="#3a3030" stroke-width="2" />
    <path d="M2 462H16V560L9 550L2 560ZM244 462H258V560L251 550L244 560Z" fill="#6b2f30" />
    <rect x="-10" y="730" width="280" height="10" fill="#7b7069" />
  </g>`

const noticeBoard = (x) => `
  <g transform="translate(${x} 0)">
    <ellipse cx="95" cy="722" rx="94" ry="13" fill="#171315" opacity="0.5" />
    <path d="M22 720V540M168 720V540" stroke="#2c1d13" stroke-width="13" />
    <polygon points="-2,548 95,492 192,548" fill="#372619" />
    <rect x="10" y="552" width="170" height="122" fill="#5a3b24" stroke="#2c1d13" stroke-width="6" />
    <path d="M28 568H66V612H28Z" fill="#dacaa6" />
    <path d="M76 562H122V598H76Z" fill="#ece1c7" />
    <path d="M130 572H164V620H130Z" fill="#cfbe9a" />
    <path d="M44 620H96V664H44Z" fill="#e1d4b4" />
    <path d="M106 608H126V652H106Z" fill="#d6c6a3" />
    <path d="M34 578H58M34 588H60M34 598H52M84 572H114M84 582H110M52 632H88M52 644H82M136 584H158M136 596H154" stroke="#5a4b3a" stroke-width="2" />
    <circle cx="47" cy="566" r="3" fill="#7f2d2c" /><circle cx="99" cy="560" r="3" fill="#7f2d2c" /><circle cx="147" cy="570" r="3" fill="#7f2d2c" /><circle cx="70" cy="618" r="3" fill="#7f2d2c" />
  </g>`

const FORUM_ARCH = { center: 800, halfWidth: 90, spring: 540, bottom: 640 }

export const forumScene = () => svg(`
  <defs>
    ${sharedDefs}
    ${cobbleDefs(800, '#4c423d', '#433a37')}
    ${openingMask(archPath(FORUM_ARCH.center, FORUM_ARCH.halfWidth, FORUM_ARCH.spring, FORUM_ARCH.bottom))}
  </defs>
  <g mask="url(#opening)">
    <g filter="url(#grained)">
      ${sky}
      ${citadel(1200, 300, 0.82)}
      <g transform="translate(-280 0)">${church}</g>
      ${FORUM_BACK.map(house).join('')}
      ${ground('#2d2728')}
      ${passageHouse({ left: 668, width: 264, top: 340, base: 640, roof: 92, ...FORUM_ARCH })}
      ${FORUM_NEAR.map((item, index) => house(item, index + 8)).join('')}
      ${school(125)}
      <g transform="translate(-280 0)">${well}</g>
      ${noticeBoard(1090)}
      ${lantern(624)}
      ${lantern(1030)}
      ${shade}
    </g>
  </g>
`, sceneSize)

// ---------------------------------------------------------------- Market row

const MARKET_BACK = [
  { x: -30, w: 140, h: 200, roof: 70, wall: '#5d4537' },
  { x: 115, w: 120, h: 215, roof: 60, wall: '#664a38' },
  { x: 240, w: 140, h: 170, roof: 78, wall: '#584234' },
  { x: 385, w: 125, h: 205, roof: 62, wall: '#6a4e3a' },
  { x: 515, w: 150, h: 175, roof: 76, wall: '#5d4537' },
  { x: 670, w: 125, h: 215, roof: 60, wall: '#664a38' },
  { x: 800, w: 140, h: 165, roof: 78, wall: '#584234' },
  { x: 945, w: 120, h: 200, roof: 62, wall: '#6a4e3a' },
  { x: 1070, w: 150, h: 180, roof: 74, wall: '#5d4537' },
  { x: 1225, w: 130, h: 210, roof: 62, wall: '#664a38' },
  { x: 1360, w: 140, h: 170, roof: 78, wall: '#584234' },
  { x: 1505, w: 125, h: 200, roof: 60, wall: '#6a4e3a' },
].map((item) => ({ ...item, base: 600 }))

function awning(x, width, y, depth, colorA, colorB) {
  const stripes = Math.floor(width / 34)
  const stripe = width / stripes
  let parts = ''
  for (let index = 0; index < stripes; index += 1) {
    const left = x + index * stripe
    parts += `<path d="M${left} ${y}H${left + stripe}L${left + stripe + (index + 1 - stripes / 2) * 2} ${y + depth}A${stripe / 2} 12 0 0 1 ${left + (index - stripes / 2) * 2} ${y + depth}Z" fill="${index % 2 ? colorA : colorB}" />`
  }
  return parts
}

function closedStall(x, width, colorA, colorB) {
  return `
    <ellipse cx="${x + width / 2}" cy="742" rx="${width * 0.58}" ry="13" fill="#171315" opacity="0.4" />
    <path d="M${x + 10} 738V566M${x + width - 10} 738V566" stroke="#2c1d13" stroke-width="10" />
    <rect x="${x + 16}" y="600" width="${width - 32}" height="138" fill="#372619" />
    <path d="M${x + 16} 628H${x + width - 16}M${x + 16} 658H${x + width - 16}M${x + 16} 688H${x + width - 16}M${x + 16} 718H${x + width - 16}" stroke="#241811" stroke-width="3" />
    ${awning(x - 12, width + 24, 548, 64, colorA, colorB)}`
}

const languageStall = `
  <g transform="translate(-330 0)">
    <circle cx="1130" cy="600" r="240" fill="url(#lantern-glow)" />
    <ellipse cx="1130" cy="750" rx="205" ry="15" fill="#171315" opacity="0.45" />
    <path d="M968 748V520M1292 748V520" stroke="#2c1d13" stroke-width="13" />
    <rect x="978" y="560" width="304" height="115" fill="#3b2a20" />
    <path d="M1040 672V600C1040 575 1060 560 1082 560C1102 560 1122 575 1122 600V672Z" fill="#26201f" />
    <circle cx="1081" cy="584" r="24" fill="#6b4e3b" />
    <path d="M1058 575C1060 548 1102 548 1106 575Z" fill="#6b2f30" />
    <rect x="1150" y="586" width="120" height="8" fill="#5a3b24" />
    <path d="M1158 586V552H1172V586ZM1192 586V556H1208V586ZM1212 586V548H1224V586ZM1248 586V546H1260V586Z" fill="#8b4a33" />
    <path d="M1176 586V546H1188V586ZM1228 586V554H1244V586Z" fill="#325d65" />
    <rect x="966" y="672" width="328" height="76" fill="#6b4a2c" />
    <rect x="958" y="664" width="344" height="16" fill="#8a6239" />
    <path d="M1000 664L1022 642H1092L1070 664ZM1104 664L1120 646H1176L1160 664Z" fill="#e8dcc0" />
    <path d="M1190 664V630H1240V664Z" fill="#b98a3c" />
    <path d="M1200 640H1232M1200 650H1232" stroke="#6d4c1f" stroke-width="2" />
    <path d="M968 510H1292" stroke="#2c1d13" stroke-width="8" />
    ${awning(942, 376, 486, 88, '#a33a30', '#dfc9a0')}
    <path d="M1016 576V594M1244 576V594" stroke="#201711" stroke-width="3" />
    <path d="M1006 594H1026L1022 620H1010ZM1234 594H1254L1250 620H1238Z" fill="#f0b45c" stroke="#201711" stroke-width="3" />
  </g>`

const bunting = (from, to, sag) => {
  const flags = []
  const count = Math.floor((to - from) / 58)
  for (let index = 1; index < count; index += 1) {
    const t = index / count
    const x = from + (to - from) * t
    const y = 330 + sag * 4 * t * (1 - t)
    const color = ['#a33a30', '#d3a44a', '#3e6c70', '#dfc9a0'][index % 4]
    flags.push(`<polygon points="${x - 11},${y} ${x + 11},${y} ${x},${y + 25}" fill="${color}" opacity="0.92" />`)
  }
  return `<path d="M${from} 330Q${(from + to) / 2} ${330 + sag * 2} ${to} 330" stroke="#2a1f1a" stroke-width="3" fill="none" />${flags.join('')}`
}

export const marketScene = () => svg(`
  <defs>
    ${sharedDefs}
    ${cobbleDefs(800, '#67503f', '#5a4638')}
  </defs>
  <g filter="url(#grained)">
    ${sky}
    <g transform="translate(0 -45)">
      ${citadel(800, 300, 1.12)}
      <g fill="#1f1e30">
        <polygon points="178,560 195,455 212,560" />
        <rect x="178" y="560" width="34" height="50" />
      </g>
      ${MARKET_BACK.map(house).join('')}
      ${ground('#3a2e28')}
      <rect y="880" width="${WIDTH}" height="80" fill="#3a2e28" />
      <rect y="880" width="${WIDTH}" height="80" fill="url(#cobbles)" />
      ${bunting(-20, 800, 76)}
      ${bunting(800, 1620, 76)}
      ${closedStall(40, 225, '#6a5b46', '#40382f')}
      ${closedStall(320, 225, '#4a5d5f', '#2f3a3b')}
      ${languageStall}
      ${closedStall(1055, 225, '#6a4a46', '#40302d')}
      ${closedStall(1335, 225, '#5c5b45', '#3c3b2f')}
      ${lantern(290, 556)}
      ${lantern(1310, 556)}
    </g>
    ${shade}
  </g>
`, sceneSize)
