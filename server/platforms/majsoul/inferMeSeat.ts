import { ResAuthGame } from '../../types/ParsedMajsoulJSON'
import {
  ActionDealTile, ActionNewRound, ActionPrototype, OptionalOperationList,
} from '../../types/ParsedMajsoulJSON'

function resolveMeSeatFromAuth (
  data: ResAuthGame['data'],
  meID?: string,
): { meSeat: number, meID: string } {
  const seatList = data.seat_list

  if (meID !== undefined && meID.length > 0) {
    const meSeat = seatList.findIndex(id => String(id) === meID)
    if (meSeat !== -1) { return { meSeat, meID } }
  }

  if (data.players.length === 1) {
    const accountId = String(data.players[0].account_id)
    const meSeat = seatList.findIndex(id => String(id) === accountId)
    if (meSeat !== -1) { return { meSeat, meID: accountId } }
  }

  const humanSeats = seatList
    .map((id, idx) => ({ id, idx }))
    .filter(({ id }) => id !== 0)
  if (humanSeats.length === 1) {
    return { meSeat: humanSeats[0].idx, meID: String(humanSeats[0].id) }
  }

  return { meSeat: -1, meID: meID ?? '' }
}

function inferMeSeatFromAction (action: ActionPrototype): number | undefined {
  const { name, data } = action.data

  if (name === 'ActionNewRound') {
    const round = data as ActionNewRound
    if (round.tiles.length >= 14) {
      return round.ju % round.scores.length
    }
    if (round.operation !== null && round.operation !== undefined) {
      return round.operation.seat
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

export {
  inferMeSeatFromAction,
  resolveMeSeatFromAuth,
}
