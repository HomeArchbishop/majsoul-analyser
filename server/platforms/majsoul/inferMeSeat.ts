import { ResAuthGame } from '../../types/ParsedMajsoulJSON'
import {
  ActionDealTile, ActionNewRound, ActionPrototype, OptionalOperationList,
} from '../../types/ParsedMajsoulJSON'

/** Resolve 己方座位 from ResAuthGame heuristics; -1 if unknown (ranked). */
export function resolveMeSeatFromAuth (data: ResAuthGame['data']): number {
  const seatList = data.seat_list

  if (data.players.length === 1) {
    const accountId = String(data.players[0].account_id)
    const seat = seatList.findIndex(id => String(id) === accountId)
    if (seat !== -1) { return seat }
  }

  const humanSeats = seatList
    .map((id, idx) => ({ id, idx }))
    .filter(({ id }) => id !== 0)
  if (humanSeats.length === 1) {
    return humanSeats[0].idx
  }

  return -1
}

/** Infer 己方座位 from a private action visible only to this client. */
export function inferMeSeatFromAction (action: ActionPrototype): number | undefined {
  const { name, data } = action.data

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

  const withOp = data as { operation?: OptionalOperationList | null }
  if (withOp.operation !== null && withOp.operation !== undefined) {
    return withOp.operation.seat
  }

  return undefined
}
