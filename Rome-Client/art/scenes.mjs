// Source art for the pre-rendered city scenes. Edit this file, then run
// `npm run build:art` to regenerate the images in src/assets/scenes.
// The gate and its passage are drawn in a 1600 x 900 space.

const WIDTH = 1600
const HEIGHT = 900

export const svg = (body, { width = WIDTH, height = HEIGHT, outputWidth = width, outputHeight = height } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${width} ${height}">
${body}
</svg>`

export const grainFilter = (id, frequency, seed, strength = 0.8) => `
  <filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="3" seed="${seed}" />
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${strength} 0 0 0 ${-strength * 0.42}" />
  </filter>`

// ---------------------------------------------------------------- Gate wall

function merlons(start, end, y, width = 30, gap = 22, height = 28) {
  let blocks = ''
  for (let x = start; x + width <= end; x += width + gap) {
    blocks += `<rect x="${x}" y="${y - height}" width="${width}" height="${height + 2}" />`
  }
  return blocks
}

const ARCH = 'M640 800V430A160 160 0 0 1 960 430V800Z'

const torchGlow = (x) => `<circle cx="${x}" cy="438" r="170" fill="url(#torch-light)" />`

export const gateWall = (output) => svg(`
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#111728" />
      <stop offset="0.55" stop-color="#29293f" />
      <stop offset="0.88" stop-color="#5e4553" />
    </linearGradient>
    <pattern id="stone" width="120" height="56" patternUnits="userSpaceOnUse">
      <rect width="120" height="56" fill="#46424b" />
      <rect x="4" y="3" width="52" height="22" fill="#524d56" />
      <rect x="65" y="31" width="50" height="21" fill="#3f3b44" />
      <path d="M0 0H120M0 28H120M60 0V28M0 28V56M120 28V56" stroke="#2d2a31" stroke-width="2.5" />
    </pattern>
    <radialGradient id="torch-light">
      <stop offset="0" stop-color="#f0a24f" stop-opacity="0.5" />
      <stop offset="1" stop-color="#f0a24f" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="shade" cx="0.5" cy="0.56" r="0.75">
      <stop offset="0.48" stop-color="#090910" stop-opacity="0" />
      <stop offset="1" stop-color="#090910" stop-opacity="0.8" />
    </radialGradient>
    <mask id="opening" maskUnits="userSpaceOnUse" x="0" y="0" width="${WIDTH}" height="${HEIGHT}">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#fff" />
      <path d="${ARCH}" fill="#000" />
    </mask>
    <clipPath id="arch-clip"><path d="${ARCH}" /></clipPath>
    <clipPath id="wall-clip"><path d="M0 430H350V220H1250V430H1600V810H0Z" /></clipPath>
    ${grainFilter('grain', 0.8, 2, 0.85)}
    ${grainFilter('wear', 0.014, 15, 1.2)}
  </defs>

  <g mask="url(#opening)">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)" />
    <circle cx="1310" cy="145" r="46" fill="#dcd5bd" opacity="0.88" />
    <circle cx="1328" cy="134" r="42" fill="#17192b" opacity="0.92" />
    <circle cx="185" cy="115" r="2" fill="#efe7d5" />
    <circle cx="320" cy="65" r="2" fill="#efe7d5" />
    <circle cx="1090" cy="70" r="2" fill="#efe7d5" />
    <circle cx="1460" cy="250" r="2" fill="#efe7d5" />
    <path d="M0 610C210 520 340 575 520 530H1090C1250 575 1410 515 1600 595V820H0Z" fill="#1d2130" />

    <g fill="url(#stone)">
      <rect y="430" width="420" height="380" />
      <rect x="1180" y="430" width="420" height="380" />
      ${merlons(0, 420, 430)}
      ${merlons(1182, 1600, 430)}
      <rect x="350" y="220" width="220" height="590" />
      <rect x="1030" y="220" width="220" height="590" />
      ${merlons(350, 570, 220, 36, 20, 34)}
      ${merlons(1030, 1250, 220, 36, 20, 34)}
      <rect x="560" y="180" width="480" height="630" />
      ${merlons(562, 1040, 180, 36, 20, 34)}
    </g>

    <g clip-path="url(#wall-clip)" opacity="0.36">
      <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#wear)" />
    </g>

    <polygon points="330,186 460,48 590,186" fill="#25212b" />
    <polygon points="1010,186 1140,48 1270,186" fill="#25212b" />
    <path d="M460 48V18M1140 48V18" stroke="#25212b" stroke-width="6" />
    <path d="M460 18L503 31L460 43ZM1140 18L1183 31L1140 43Z" fill="#6b2f30" />

    <rect x="438" y="285" width="44" height="74" rx="22" fill="#14131a" />
    <rect x="1118" y="285" width="44" height="74" rx="22" fill="#14131a" />
    <rect x="451" y="298" width="18" height="50" rx="9" fill="#d89647" />
    <rect x="1131" y="298" width="18" height="50" rx="9" fill="#d89647" />
    <rect x="794" y="196" width="12" height="50" fill="#14131a" />
    <path d="M744 214H856" stroke="#14131a" stroke-width="9" />

    <path d="M622 804V430A178 178 0 0 1 978 430V804" fill="none" stroke="#615b66" stroke-width="36" stroke-dasharray="42 4" />
    <path d="M640 804V430A160 160 0 0 1 960 430V804" fill="none" stroke="#25222a" stroke-width="5" />

    <rect y="800" width="${WIDTH}" height="100" fill="#201e23" />
    <polygon points="620,800 980,800 1240,900 360,900" fill="#4b4442" />
    <path d="M700 820H900M665 844H940M610 872H1000" stroke="#302b2c" stroke-width="5" />

    ${torchGlow(560)}
    ${torchGlow(1040)}
    <path d="M560 498V466M545 490H575M1040 498V466M1025 490H1055" stroke="#1f1e22" stroke-width="8" />

    <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#grain)" opacity="0.2" />
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#shade)" />
  </g>

  <g clip-path="url(#arch-clip)">
    <path d="M660 268V342M700 268V347M740 268V351M780 268V354M820 268V354M860 268V351M900 268V347M940 268V342" stroke="#1d1d22" stroke-width="11" />
    <path d="M640 306H960" stroke="#1d1d22" stroke-width="9" />
  </g>
`, output)

// ---------------------------------------------------------------- Door leaf

const PLANKS = [
  { x: 0, fill: '#4b3020' },
  { x: 32, fill: '#55371f' },
  { x: 64, fill: '#47301f' },
  { x: 96, fill: '#523522' },
  { x: 128, fill: '#452c1d' },
]
const BANDS = [150, 320, 470]
const STUD_XS = [18, 58, 98, 138]

// Drawn as the left leaf. The export script mirrors it for the right one.
export const door = (output) => svg(`
  <defs>
    <linearGradient id="door-shadow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0d0805" stop-opacity="0.32" />
      <stop offset="0.45" stop-color="#0d0805" stop-opacity="0" />
    </linearGradient>
    <filter id="wood" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.09 0.006" numOctaves="4" seed="7" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.06  0 0 0 0 0.03  0 0 0 0 0.01  1.3 0 0 0 -0.45" />
    </filter>
  </defs>
  ${PLANKS.map(({ x, fill }) => `
    <rect x="${x}" width="32" height="530" fill="${fill}" />
    <path d="M${x + 32} 0V530" stroke="#1a0f09" stroke-width="3" />`).join('')}
  <rect width="160" height="530" filter="url(#wood)" opacity="0.8" />
  ${BANDS.map((y) => `
    <rect y="${y}" width="160" height="22" fill="#25252a" />
    <rect y="${y}" width="160" height="3" fill="#44454c" />
    ${STUD_XS.map((x) => `<circle cx="${x}" cy="${y + 11}" r="5" fill="#55565d" />`).join('')}`).join('')}
  <circle cx="122" cy="280" r="20" fill="none" stroke="#2a2a30" stroke-width="7" />
  <circle cx="122" cy="258" r="7" fill="#55565d" />
  <rect width="160" height="530" fill="url(#door-shadow)" />
`, { width: 160, height: 530, ...output })

// ---------------------------------------------------------------- Torch flame

export const flame = (output) => svg(`
  <defs>
    <radialGradient id="halo">
      <stop offset="0" stop-color="#f6a955" stop-opacity="0.5" />
      <stop offset="1" stop-color="#f6a955" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="75" cy="98" r="72" fill="url(#halo)" />
  <path d="M75 72C99 97 93 130 75 130C57 130 51 97 75 72Z" fill="#e7913f" />
  <path d="M75 94C86 108 84 126 75 126C66 126 64 108 75 94Z" fill="#ffdb8a" />
`, { width: 150, height: 170, ...output })

// ------------------------------------------------------------- Gate passage

// The tunnel through the gatehouse, with the Market lit up at the far end. Each ring
// is the far opening scaled out from the vanishing point, so the vault stays true.
const VANISH = { x: 800, y: 560 }
const FAR = { half: 112, spring: -38, bottom: 92 }
const RING_SCALES = [1, 1.09, 1.2, 1.33, 1.5, 1.72, 2, 2.4, 3, 4, 6, 9]

function ringPath(scale) {
  const half = FAR.half * scale
  const left = VANISH.x - half
  const right = VANISH.x + half
  const spring = VANISH.y + FAR.spring * scale
  const bottom = VANISH.y + FAR.bottom * scale
  return `M${left} ${bottom}V${spring}A${half} ${half} 0 0 1 ${right} ${spring}V${bottom}Z`
}

const mix = (from, to, amount) => {
  const parse = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
  const a = parse(from)
  const b = parse(to)
  return `#${a.map((value, index) => Math.round(value + (b[index] - value) * amount).toString(16).padStart(2, '0')).join('')}`
}

function floorPoint(scale, side) {
  return `${VANISH.x + side * FAR.half * scale},${VANISH.y + FAR.bottom * scale}`
}

export const gatePassage = (output) => {
  const rings = [...RING_SCALES].reverse()
  const nearest = rings[0]
  const wallRings = rings.map((scale, index) => {
    const light = 1 - Math.log(scale) / Math.log(nearest)
    const base = mix('#141219', '#7a6252', light ** 1.6)
    const fill = index % 2 ? base : mix(base, '#0d0c11', 0.18)
    return `<path d="${ringPath(scale)}" fill="${fill}" />`
  }).join('')

  const floorBands = rings.slice(0, -1).map((scale, index) => {
    const next = rings[index + 1]
    const light = 1 - Math.log(next) / Math.log(nearest)
    const fill = mix('#1c1a1e', '#9a8466', light ** 1.5)
    return `<polygon points="${floorPoint(scale, -1)} ${floorPoint(scale, 1)} ${floorPoint(next, 1)} ${floorPoint(next, -1)}" fill="${fill}" />`
  }).join('')

  const courses = [-0.95, -0.7, -0.45, -0.2, 0.05, 0.3, 0.55, 0.8].map((height) => {
    const y = VANISH.y + FAR.bottom * nearest - (FAR.bottom - FAR.spring) * nearest * (height + 1) / 2.2
    return `<path d="M${VANISH.x - FAR.half * nearest} ${y}L${VANISH.x} ${VANISH.y}L${VANISH.x + FAR.half * nearest} ${y}" />`
  }).join('')

  const ribs = [1.2, 1.5, 2, 3, 6].map((scale) => (
    `<path d="${ringPath(scale)}" fill="none" stroke-width="${3 + scale * 2.2}" />`
  )).join('')

  const seams = [-0.6, -0.2, 0.2, 0.6].map((offset) => (
    `<path d="M${VANISH.x + offset * FAR.half} ${VANISH.y + FAR.bottom}L${VANISH.x + offset * FAR.half * nearest} ${VANISH.y + FAR.bottom * nearest}" />`
  )).join('')

  return svg(`
  <defs>
    <linearGradient id="market-light" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6e2b0" />
      <stop offset="0.62" stop-color="#f0cf8c" />
      <stop offset="0.63" stop-color="#c9ad7d" />
      <stop offset="1" stop-color="#b39771" />
    </linearGradient>
    <radialGradient id="spill" cx="${VANISH.x}" cy="${VANISH.y + 40}" r="520" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffd28a" stop-opacity="0.55" />
      <stop offset="0.45" stop-color="#e9a861" stop-opacity="0.18" />
      <stop offset="1" stop-color="#e9a861" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="near-dark" cx="${VANISH.x}" cy="${VANISH.y}" r="1000" gradientUnits="userSpaceOnUse">
      <stop offset="0.35" stop-color="#07070c" stop-opacity="0" />
      <stop offset="1" stop-color="#07070c" stop-opacity="0.85" />
    </radialGradient>
    <clipPath id="far-opening"><path d="${ringPath(1)}" /></clipPath>
    <clipPath id="tunnel"><path d="${ringPath(nearest)}" /></clipPath>
    ${grainFilter('passage-grain', 0.75, 9, 0.9)}
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0b0b12" />
  ${wallRings}
  <g clip-path="url(#tunnel)">
    <g stroke="#0d0c11" stroke-width="3" opacity="0.4" fill="none">${courses}</g>
    <g stroke="#0d0c11" opacity="0.55">${ribs}</g>
    ${floorBands}
    <g stroke="#141217" stroke-width="3" opacity="0.35">${seams}</g>
  </g>

  <g clip-path="url(#far-opening)">
    <rect x="${VANISH.x - FAR.half}" y="${VANISH.y + FAR.spring - FAR.half}" width="${FAR.half * 2}" height="${FAR.bottom - FAR.spring + FAR.half}" fill="url(#market-light)" />
    <path d="M${VANISH.x - 104} ${VANISH.y + 2}h46v-34h-46zM${VANISH.x + 52} ${VANISH.y + 6}h54v-40h-54z" fill="#c58a5a" opacity="0.55" />
    <path d="M${VANISH.x - 110} ${VANISH.y - 32}l26 -16l26 16zM${VANISH.x + 46} ${VANISH.y - 34}l30 -18l30 18z" fill="#9b5f45" opacity="0.6" />
    <circle cx="${VANISH.x}" cy="${VANISH.y + 30}" r="16" fill="#8d8f96" opacity="0.5" />
  </g>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#spill)" />
  <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#passage-grain)" opacity="0.22" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#near-dark)" />
`, output)
}
