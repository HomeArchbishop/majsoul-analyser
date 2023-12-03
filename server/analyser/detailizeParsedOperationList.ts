import findLastIndex from 'lodash.findlastindex'
import { Round } from '../gameRecords/Round'
import { ParsedOperationList, ParsedRoughOperationList } from '../types/ParsedOperation'
import { MsgDahai } from '../types/ParsedMsg'
import { Tile } from '../types/General'

function detailizeParsedOperationList (parsedRoughOperationList: ParsedRoughOperationList, round: Round): ParsedOperationList {
  if (parsedRoughOperationList.length === 0) { return [] }

  const parsedOperationList: ParsedOperationList = []

  const latestMeTileStepIndex = findLastIndex(round.steps, step => {
    return (
      step.type === 'chi' || step.type === 'pon' || step.type === 'daiminkan' ||
      step.type === 'ankan' || step.type === 'kakan' || step.type === 'tsumo'
    ) &&
      step.actor === round.meSeat
  })
  const latestMeTile = latestMeTileStepIndex !== -1 ? (round.steps[latestMeTileStepIndex] as { pai: Tile }).pai : undefined

  const latestDiscardTileStepIndex = findLastIndex(round.steps, step => {
    return step.type === 'dahai' && step.actor !== round.meSeat
  })
  const latestDiscardTileStep = latestDiscardTileStepIndex !== -1 ? round.steps[latestDiscardTileStepIndex] as MsgDahai : undefined

  for (const parsedRoughOperation of parsedRoughOperationList) {
    if (parsedRoughOperation.type === 'dahai') { /* 舍张 */
      if (latestMeTile === undefined) { continue }
      let isLatestTileFound = false
      for (const tile of round.players[round.meSeat].hand) {
        if (tile === '?') { break }
        parsedOperationList.push({
          type: 'dahai',
          pai: tile,
          tsumogiri: !isLatestTileFound && tile === latestMeTile
        })
        isLatestTileFound = tile === latestMeTile
      }
    }
    if (parsedRoughOperation.type === 'pon') { /* 碰 */
      if (latestDiscardTileStep === undefined) { continue }
      for (const consumed of parsedRoughOperation.consumedList) {
        parsedOperationList.push({
          type: 'pon',
          pai: latestDiscardTileStep.pai,
          target: latestDiscardTileStep.actor,
          consumed
        })
      }
    }
    if (parsedRoughOperation.type === 'chi') { /* 吃 */
      if (latestDiscardTileStep === undefined) { continue }
      for (const consumed of parsedRoughOperation.consumedList) {
        parsedOperationList.push({
          type: 'chi',
          pai: latestDiscardTileStep.pai,
          target: latestDiscardTileStep.actor,
          consumed
        })
      }
    }
    if (parsedRoughOperation.type === 'kakan') { /* 加杠 */
      if (latestMeTile === undefined) { continue }
      for (const consumed of parsedRoughOperation.consumedList) {
        parsedOperationList.push({
          type: 'kakan',
          pai: latestMeTile,
          consumed
        })
      }
    }
    if (parsedRoughOperation.type === 'daiminkan') { /* 杠 */
      if (latestDiscardTileStep === undefined) { continue }
      for (const consumed of parsedRoughOperation.consumedList) {
        parsedOperationList.push({
          type: 'daiminkan',
          pai: latestDiscardTileStep.pai,
          target: latestDiscardTileStep.actor,
          consumed
        })
      }
    }
    if (parsedRoughOperation.type === 'ankan') { /* 暗杠 */
      if (latestMeTile === undefined) { continue }
      for (const consumed of parsedRoughOperation.consumedList) {
        parsedOperationList.push({
          type: 'ankan',
          pai: latestMeTile,
          consumed
        })
      }
    }
    if (parsedRoughOperation.type === 'reach') { /* 立直 */
      for (const pai of parsedRoughOperation.pais) {
        parsedOperationList.push({
          type: 'reach',
          pai
        })
      }
    }
    if (parsedRoughOperation.type === 'babei') { /* 拔北 */
      parsedOperationList.push({
        type: 'babei'
      })
    }
    if (parsedRoughOperation.type === 'horaron') { /* 荣和 */
      if (latestDiscardTileStep === undefined) { continue }
      parsedOperationList.push({
        type: 'horaron',
        target: latestDiscardTileStep.actor
      })
    }
    if (parsedRoughOperation.type === 'horatsumo') { /* 自摸 */
      parsedOperationList.push({
        type: 'horatsumo'
      })
    }
    if (parsedRoughOperation.type === 'ryukyoku') { /* 九种九牌 */
      parsedOperationList.push({
        type: 'ryukyoku'
      })
    }
  }

  if (!parsedRoughOperationList.some(op => op.type === 'dahai')) { /* 没有要求舍张，则添加 OperationSkip */
    parsedOperationList.push({
      type: 'skip'
    })
  }

  return parsedOperationList
}

export {
  detailizeParsedOperationList
}
