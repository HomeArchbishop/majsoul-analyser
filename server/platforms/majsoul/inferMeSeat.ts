import type { ResAuthGame } from '../../types/ParsedMajsoulJSON'
import {
  ActionDealTile,
  ActionNewRound,
  ActionPrototype,
  OptionalOperationList,
} from '../../types/ParsedMajsoulJSON'

/** 从 ResAuthGame 推断己方座位；-1 表示未知（如段位场）。 */
export function resolveMeSeatFromAuth (data: ResAuthGame['data']): number {
  const { seat_list: seatList, players } = data

  if (players.length === 1) {
    const accountId = String(players[0].account_id)
    const seat = seatList.findIndex(id => String(id) === accountId)
    if (seat !== -1) { return seat }
  }

  const humanSeats = seatList
    .map((id, seat) => ({ id, seat }))
    .filter(({ id }) => id !== 0)

  if (humanSeats.length === 1) {
    return humanSeats[0].seat
  }

  return -1
}

/** 从仅本客户端可见的 action 推断己方座位。 */
export function inferMeSeatFromAction (wire: ActionPrototype): number | undefined {
  const { name, data } = wire.data

  if (name === 'ActionNewRound') {
    const newRound = data as ActionNewRound
    if (newRound.tiles.length >= 14) {
      return newRound.ju % newRound.scores.length
    }
    if (newRound.operation !== null && newRound.operation !== undefined) {
      return newRound.operation.seat
    }
  }

  if (name === 'ActionDealTile') {
    const deal = data as ActionDealTile
    if (deal.tile !== '') { return deal.seat }
  }

  const withOperation = data as { operation?: OptionalOperationList | null }
  if (withOperation.operation !== null && withOperation.operation !== undefined) {
    return withOperation.operation.seat
  }

  return undefined
}
