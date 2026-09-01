import findLastIndex from 'lodash.findlastindex'

import { Round } from '../board/Round'
import type { ActionCandidateList, EventDahai, MjaiActionList, Pai } from '../types/Mjai'

export function expandActionCandidates (actionCandidateList: ActionCandidateList, round: Round): MjaiActionList {
  if (actionCandidateList.length === 0) { return [] }

  const mjaiActionList: MjaiActionList = []

  const latestMeTileStepIndex = findLastIndex(round.steps, step => {
    return (
      step.type === 'chi' || step.type === 'pon' || step.type === 'daiminkan' ||
      step.type === 'ankan' || step.type === 'kakan' || step.type === 'tsumo'
    ) &&
      step.actor === round.meSeat
  })
  const latestMeTile = latestMeTileStepIndex !== -1 ? (round.steps[latestMeTileStepIndex] as { pai: Pai }).pai : undefined

  const latestDiscardTileStepIndex = findLastIndex(round.steps, step => {
    return step.type === 'dahai' && step.actor !== round.meSeat
  })
  const latestDiscardTileStep = latestDiscardTileStepIndex !== -1 ? round.steps[latestDiscardTileStepIndex] as EventDahai : undefined

  for (const candidate of actionCandidateList) {
    if (candidate.type === 'dahai') {
      if (latestMeTile === undefined) { continue }
      let isLatestTileFound = false
      for (const pai of round.players[round.meSeat].hand) {
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
      if (latestDiscardTileStep === undefined) { continue }
      for (const consumed of candidate.consumedList) {
        mjaiActionList.push({
          type: 'pon',
          pai: latestDiscardTileStep.pai,
          target: latestDiscardTileStep.actor,
          consumed,
        })
      }
    }
    if (candidate.type === 'chi') {
      if (latestDiscardTileStep === undefined) { continue }
      for (const consumed of candidate.consumedList) {
        mjaiActionList.push({
          type: 'chi',
          pai: latestDiscardTileStep.pai,
          target: latestDiscardTileStep.actor,
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
      if (latestDiscardTileStep === undefined) { continue }
      for (const consumed of candidate.consumedList) {
        mjaiActionList.push({
          type: 'daiminkan',
          pai: latestDiscardTileStep.pai,
          target: latestDiscardTileStep.actor,
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
      } else if (latestDiscardTileStep !== undefined) {
        mjaiActionList.push({
          type: 'hora',
          target: latestDiscardTileStep.actor,
          pai: latestDiscardTileStep.pai,
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
