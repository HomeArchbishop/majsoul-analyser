import findLastIndex from 'lodash.findlastindex'

import { Round } from '../board/Round'
import type { ActionCandidateList, EventDahai, MjaiActionList, Pai } from '../types/Mjai'

export function expandActionCandidates (actionCandidateList: ActionCandidateList, round: Round): MjaiActionList {
  if (actionCandidateList.length === 0) { return [] }

  const mjaiActionList: MjaiActionList = []

  const latestMeTileEventIndex = findLastIndex(round.events, event => {
    return (
      event.type === 'chi' || event.type === 'pon' || event.type === 'daiminkan' ||
      event.type === 'ankan' || event.type === 'kakan' || event.type === 'tsumo'
    ) &&
      event.actor === round.meSeat
  })
  const latestMeTile = latestMeTileEventIndex !== -1 ? (round.events[latestMeTileEventIndex] as { pai: Pai }).pai : undefined

  const latestDiscardEventIndex = findLastIndex(round.events, event => {
    return event.type === 'dahai' && event.actor !== round.meSeat
  })
  const latestDiscardEvent = latestDiscardEventIndex !== -1 ? round.events[latestDiscardEventIndex] as EventDahai : undefined

  for (const candidate of actionCandidateList) {
    if (candidate.type === 'dahai') {
      if (latestMeTile === undefined) { continue }
      let isLatestTileFound = false
      for (const pai of round.players[round.meSeat].tehai) {
        if (pai === '?') { break }
        mjaiActionList.push({
          type: 'dahai',
          pai,
          tsumogiri: !isLatestTileFound && pai === latestMeTile,
        })
        isLatestTileFound = pai === latestMeTile
      }
    }
    if (candidate.type === 'pon') {
      if (latestDiscardEvent === undefined) { continue }
      for (const consumed of candidate.consumedList) {
        mjaiActionList.push({
          type: 'pon',
          pai: latestDiscardEvent.pai,
          target: latestDiscardEvent.actor,
          consumed,
        })
      }
    }
    if (candidate.type === 'chi') {
      if (latestDiscardEvent === undefined) { continue }
      for (const consumed of candidate.consumedList) {
        mjaiActionList.push({
          type: 'chi',
          pai: latestDiscardEvent.pai,
          target: latestDiscardEvent.actor,
          consumed,
        })
      }
    }
    if (candidate.type === 'kakan') {
      if (latestMeTile === undefined) { continue }
      for (const consumed of candidate.consumedList) {
        mjaiActionList.push({ type: 'kakan', pai: latestMeTile, consumed })
      }
    }
    if (candidate.type === 'daiminkan') {
      if (latestDiscardEvent === undefined) { continue }
      for (const consumed of candidate.consumedList) {
        mjaiActionList.push({
          type: 'daiminkan',
          pai: latestDiscardEvent.pai,
          target: latestDiscardEvent.actor,
          consumed,
        })
      }
    }
    if (candidate.type === 'ankan') {
      if (latestMeTile === undefined) { continue }
      for (const consumed of candidate.consumedList) {
        mjaiActionList.push({ type: 'ankan', pai: latestMeTile, consumed })
      }
    }
    if (candidate.type === 'reach') {
      for (const pai of candidate.pais) {
        mjaiActionList.push({ type: 'reach', pai })
      }
    }
    if (candidate.type === 'nuki') {
      mjaiActionList.push({ type: 'nuki' })
    }
    if (candidate.type === 'hora') {
      if (candidate.tsumo === true) {
        mjaiActionList.push({ type: 'hora' })
      } else if (latestDiscardEvent !== undefined) {
        mjaiActionList.push({
          type: 'hora',
          target: latestDiscardEvent.actor,
          pai: latestDiscardEvent.pai,
        })
      }
    }
    if (candidate.type === 'ryukyoku') {
      mjaiActionList.push({ type: 'ryukyoku' })
    }
  }

  if (!actionCandidateList.some(op => op.type === 'dahai')) {
    mjaiActionList.push({ type: 'none' })
  }

  return mjaiActionList
}
