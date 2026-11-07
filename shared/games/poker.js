export const STARTING_CHIPS = 1000
export const SMALL_BLIND = 10
export const HANDS_PER_LEVEL = 8

const RANKS = '23456789TJQKA'
const SUITS = 'shdc'
const RANK_NAMES = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'jack', 12: 'queen', 13: 'king', 14: 'ace' }
const PLURAL = { six: 'sixes' }
const plural = (value) => PLURAL[RANK_NAMES[value]] || `${RANK_NAMES[value]}s`
const capital = (text) => text[0].toUpperCase() + text.slice(1)

export const rankValue = (card) => RANKS.indexOf(card[0]) + 2

export function freshDeck() {
  return [...SUITS].flatMap((suit) => [...RANKS].map((rank) => `${rank}${suit}`))
}

function shuffle(cards, random) {
  const deck = [...cards]
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1)) % (index + 1)
    ;[deck[index], deck[swap]] = [deck[swap], deck[index]]
  }
  return deck
}

function scoreFive(cards) {
  const values = cards.map(rankValue).sort((a, b) => b - a)
  const flush = cards.every((card) => card[1] === cards[0][1])
  const unique = [...new Set(values)]
  let straightHigh = 0
  if (unique.length === 5 && values[0] - values[4] === 4) straightHigh = values[0]
  if (unique.length === 5 && values[0] === 14 && values[1] === 5) straightHigh = 5

  const groups = [...values.reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new Map())]
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const shape = groups.map(([, count]) => count).join('')
  const ordered = groups.map(([value]) => value)

  if (straightHigh && flush) return [8, straightHigh]
  if (shape === '41') return [7, ...ordered]
  if (shape === '32') return [6, ...ordered]
  if (flush) return [5, ...values]
  if (straightHigh) return [4, straightHigh]
  if (shape === '311') return [3, ...ordered]
  if (shape === '221') return [2, ...ordered]
  if (shape === '2111') return [1, ...ordered]
  return [0, ...values]
}

export function compareScores(a, b) {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0)
    if (difference) return difference
  }
  return 0
}

function describe(score) {
  const [kind, first, second] = score
  switch (kind) {
    case 8: return first === 14 ? 'Royal flush' : `Straight flush, ${RANK_NAMES[first]} high`
    case 7: return `Four ${plural(first)}`
    case 6: return `Full house, ${plural(first)} over ${plural(second)}`
    case 5: return `Flush, ${RANK_NAMES[first]} high`
    case 4: return `Straight, ${RANK_NAMES[first]} high`
    case 3: return `Three ${plural(first)}`
    case 2: return `Two pair, ${plural(first)} and ${plural(second)}`
    case 1: return `Pair of ${plural(first)}`
    default: return `${capital(RANK_NAMES[first])} high`
  }
}

// The best five-card hand out of any number of cards.
export function bestHand(cards) {
  let best = null
  let bestCards = null
  const pick = (start, chosen) => {
    if (chosen.length === 5) {
      const score = scoreFive(chosen)
      if (!best || compareScores(score, best) > 0) {
        best = score
        bestCards = chosen
      }
      return
    }
    for (let index = start; index <= cards.length - (5 - chosen.length); index += 1) pick(index + 1, [...chosen, cards[index]])
  }
  pick(0, [])
  return { score: best, cards: bestCards, name: describe(best) }
}

export const blindsFor = (hand) => {
  const small = SMALL_BLIND * 2 ** Math.floor((hand - 1) / HANDS_PER_LEVEL)
  return { small, big: small * 2 }
}

const inHand = (player) => !player.out && !player.folded
const canAct = (player) => inHand(player) && !player.allIn

function seatsAfter(state, index) {
  const order = []
  for (let step = 1; step <= state.players.length; step += 1) order.push((index + step) % state.players.length)
  return order
}

const nextWhere = (state, index, test) => seatsAfter(state, index).find((seat) => test(state.players[seat]))

function put(player, amount) {
  const paid = Math.min(amount, player.chips)
  return { ...player, chips: player.chips - paid, bet: player.bet + paid, total: player.total + paid, allIn: player.chips - paid === 0 }
}

function dealHand(state, random) {
  const players = state.players.map((player) => ({
    ...player,
    cards: [],
    bet: 0,
    total: 0,
    folded: false,
    allIn: false,
    out: player.out || player.chips <= 0,
  }))
  const live = players.filter((player) => !player.out)
  if (live.length < 2) return finishGame({ ...state, players })

  const hand = state.hand + 1
  const blinds = blindsFor(hand)
  let next = { ...state, players, hand, blinds, board: [], street: 'preflop', showdown: null, payouts: [], handOver: false }
  const dealer = state.hand === 0 && !players[state.dealer].out ? state.dealer : nextWhere(next, state.dealer, (player) => !player.out)
  next.dealer = dealer

  let deck = shuffle(freshDeck(), random)
  next.players = next.players.map((player) => {
    if (player.out) return player
    const cards = deck.slice(0, 2)
    deck = deck.slice(2)
    return { ...player, cards }
  })
  next.deck = deck

  const headsUp = live.length === 2
  const small = headsUp ? dealer : nextWhere(next, dealer, (player) => !player.out)
  const big = nextWhere(next, small, (player) => !player.out)
  next.players = next.players.map((player, seat) => {
    if (seat === small) return put(player, blinds.small)
    if (seat === big) return put(player, blinds.big)
    return player
  })
  next.smallBlindSeat = small
  next.bigBlindSeat = big
  next.currentBet = Math.max(...next.players.map((player) => player.bet))
  next.minRaise = blinds.big
  next.needs = next.players.filter(canAct).map((player) => player.id)
  next.toAct = nextWhere(next, big, canAct) ?? null
  next.last = { kind: 'deal', hand }
  if (next.needs.length <= 1 && next.players.filter(canAct).every((player) => player.bet >= next.currentBet)) return endStreet(next)
  if (next.toAct === null) return endStreet(next)
  return next
}

function potsFor(players) {
  const contenders = players.filter(inHand)
  const levels = [...new Set(contenders.map((player) => player.total))].sort((a, b) => a - b)
  const pots = []
  let floor = 0
  levels.forEach((level, index) => {
    let amount = players.reduce((sum, player) => sum + Math.max(0, Math.min(player.total, level) - floor), 0)
    if (index === levels.length - 1) amount += players.reduce((sum, player) => sum + Math.max(0, player.total - level), 0)
    const eligible = contenders.filter((player) => player.total >= level).map((player) => player.id)
    if (amount > 0) pots.push({ amount, eligible })
    floor = level
  })
  return pots
}

export const potTotal = (players) => players.reduce((sum, player) => sum + player.total, 0)

function award(state, winnersByPot) {
  const won = new Map()
  const order = seatsAfter(state, state.dealer).map((seat) => state.players[seat].id)
  for (const { amount, winners } of winnersByPot) {
    const share = Math.floor(amount / winners.length)
    let leftover = amount - share * winners.length
    for (const id of order.filter((item) => winners.includes(item))) {
      won.set(id, (won.get(id) || 0) + share + (leftover > 0 ? 1 : 0))
      leftover -= 1
    }
  }
  const players = state.players.map((player) => ({ ...player, chips: player.chips + (won.get(player.id) || 0), bet: 0 }))
  const payouts = [...won].map(([id, amount]) => ({ id, amount }))
  const next = { ...state, players, payouts, handOver: true, toAct: null, needs: [], currentBet: 0 }
  const standing = players.filter((player) => !player.left && player.chips > 0)
  return standing.length < 2 ? finishGame(next) : next
}

function finishGame(state) {
  const top = Math.max(...state.players.map((player) => (player.left ? 0 : player.chips)))
  const winners = state.players.filter((player) => !player.left && player.chips === top && top > 0).map((player) => player.id)
  return { ...state, over: true, handOver: true, toAct: null, needs: [], winners }
}

function showdown(state) {
  const contenders = state.players.filter(inHand)
  const hands = new Map(contenders.map((player) => [player.id, bestHand([...player.cards, ...state.board])]))
  const winnersByPot = potsFor(state.players).map(({ amount, eligible }) => {
    let best = null
    let winners = []
    for (const id of eligible) {
      const compared = best ? compareScores(hands.get(id).score, best) : 1
      if (compared > 0) {
        best = hands.get(id).score
        winners = [id]
      } else if (compared === 0) {
        winners.push(id)
      }
    }
    return { amount, winners }
  })
  const reveal = contenders.map((player) => ({ id: player.id, cards: player.cards, hand: hands.get(player.id).name, best: hands.get(player.id).cards }))
  const next = { ...state, street: 'showdown', showdown: reveal, last: { kind: 'showdown' } }
  return award(next, winnersByPot)
}

function dealStreet(state) {
  const count = state.street === 'preflop' ? 3 : 1
  const street = { preflop: 'flop', flop: 'turn', turn: 'river' }[state.street]
  return { ...state, street, board: [...state.board, ...state.deck.slice(1, 1 + count)], deck: state.deck.slice(1 + count) }
}

function endStreet(state) {
  let next = { ...state, players: state.players.map((player) => ({ ...player, bet: 0 })), currentBet: 0, minRaise: state.blinds.big }
  while (true) {
    if (next.street === 'river') return showdown(next)
    next = dealStreet(next)
    const actors = next.players.filter(canAct)
    if (actors.length >= 2) {
      return { ...next, needs: actors.map((player) => player.id), toAct: nextWhere(next, next.dealer, canAct), last: { kind: next.street } }
    }
  }
}

function afterAction(state, actorSeat) {
  const remaining = state.players.filter(inHand)
  if (remaining.length === 1) {
    const total = potTotal(state.players)
    return award({ ...state, showdown: null, last: { kind: 'fold-win', playerId: remaining[0].id } }, [{ amount: total, winners: [remaining[0].id] }])
  }
  const needs = state.needs.filter((id) => state.players.some((player) => player.id === id && canAct(player)))
  if (needs.length === 0) return endStreet({ ...state, needs })
  const toAct = seatsAfter(state, actorSeat).find((seat) => needs.includes(state.players[seat].id))
  return { ...state, needs, toAct }
}

export function startPoker(players, { random = Math.random, chips = STARTING_CHIPS } = {}) {
  const state = {
    game: 'poker',
    players: players.map(({ id, name }) => ({ id, name, chips, cards: [], bet: 0, total: 0, folded: false, allIn: false, out: false, left: false })),
    dealer: Math.floor(random() * players.length) % players.length,
    hand: 0,
    blinds: blindsFor(1),
    deck: [],
    board: [],
    street: 'preflop',
    currentBet: 0,
    minRaise: 0,
    needs: [],
    toAct: null,
    showdown: null,
    payouts: [],
    handOver: false,
    over: false,
    winners: [],
    last: null,
  }
  return dealHand(state, random)
}

export function actPoker(state, playerId, action, { random = Math.random } = {}) {
  if (state.over) return { ok: false, reason: 'over' }
  const seat = state.players.findIndex((player) => player.id === playerId && !player.left)
  if (seat === -1) return { ok: false, reason: 'not-playing' }

  if (action?.type === 'next-hand') {
    if (!state.handOver) return { ok: false, reason: 'hand-running' }
    return { ok: true, state: dealHand(state, random) }
  }
  if (state.handOver) return { ok: false, reason: 'hand-over' }
  if (state.toAct !== seat) return { ok: false, reason: 'not-your-turn' }

  const player = state.players[seat]
  const owed = state.currentBet - player.bet
  const replace = (updated) => state.players.map((item, index) => (index === seat ? updated : item))
  const without = state.needs.filter((id) => id !== playerId)

  switch (action?.type) {
    case 'fold':
      return { ok: true, state: afterAction({ ...state, players: replace({ ...player, folded: true }), needs: without, last: { kind: 'fold', playerId } }, seat) }
    case 'check':
      if (owed > 0) return { ok: false, reason: 'must-call' }
      return { ok: true, state: afterAction({ ...state, needs: without, last: { kind: 'check', playerId } }, seat) }
    case 'call': {
      if (owed <= 0) return { ok: false, reason: 'nothing-to-call' }
      const paid = put(player, owed)
      return { ok: true, state: afterAction({ ...state, players: replace(paid), needs: without, last: { kind: 'call', playerId, amount: paid.bet, allIn: paid.allIn } }, seat) }
    }
    case 'raise': {
      const to = Number(action.to)
      const allInTo = player.bet + player.chips
      if (!Number.isInteger(to) || to <= state.currentBet || to > allInTo) return { ok: false, reason: 'bad-amount' }
      const minimum = state.currentBet + state.minRaise
      if (to < minimum && to !== allInTo) return { ok: false, reason: 'raise-too-small' }
      const paid = put(player, to - player.bet)
      const players = replace(paid)
      const raised = to - state.currentBet
      const needs = players.filter((item) => canAct(item) && item.id !== playerId).map((item) => item.id)
      const kind = state.currentBet === 0 ? 'bet' : 'raise'
      return {
        ok: true,
        state: afterAction({
          ...state,
          players,
          currentBet: to,
          minRaise: Math.max(state.minRaise, raised),
          needs,
          last: { kind, playerId, amount: to, allIn: paid.allIn },
        }, seat),
      }
    }
    default:
      return { ok: false, reason: 'bad-action' }
  }
}

export function leavePoker(state, playerId) {
  const seat = state.players.findIndex((player) => player.id === playerId)
  if (seat === -1 || state.over || state.players[seat].left) return state
  const player = state.players[seat]
  const players = state.players.map((item, index) => (index === seat ? { ...item, folded: true, left: true, out: true, chips: 0 } : item))
  const next = { ...state, players, needs: state.needs.filter((id) => id !== playerId), last: { kind: 'left', playerId, name: player.name } }
  if (state.handOver) {
    const standing = players.filter((item) => !item.left && item.chips > 0)
    return standing.length < 2 ? finishGame(next) : next
  }
  const resumeAfter = state.toAct === seat || state.toAct === null ? seat : (state.toAct + players.length - 1) % players.length
  return afterAction(next, resumeAfter)
}

// What one person may see: their own cards, and everyone's cards once they're shown down.
export function viewPoker(state, viewerId) {
  const shown = new Set((state.showdown || []).map((entry) => entry.id))
  return {
    ...state,
    deck: undefined,
    players: state.players.map((player) => ({
      ...player,
      cards: player.id === viewerId || shown.has(player.id) ? player.cards : player.cards.map(() => null),
    })),
  }
}

export const POKER = {
  id: 'poker',
  name: "Texas Hold'em",
  minPlayers: 2,
  maxPlayers: 4,
  start: startPoker,
  act: actPoker,
  leave: leavePoker,
  view: viewPoker,
}
