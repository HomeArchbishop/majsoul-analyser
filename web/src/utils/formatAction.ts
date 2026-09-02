import { Pai } from '../types'
import { formatPaiLabel } from '../utils/paiToTile'

type MjaiAction = Record<string, unknown>

function formatConsumed (consumed: unknown): string {
  if (!Array.isArray(consumed)) { return '' }
  return consumed.map(p => formatPaiLabel(p as Pai)).join('')
}

export function formatAction (action: unknown): string {
  if (action === null || typeof action !== 'object') {
    return String(action)
  }

  const a = action as MjaiAction
  const pai = a.pai !== undefined ? formatPaiLabel(a.pai as Pai) : ''

  switch (a.type) {
    case 'dahai':
      return `打 ${pai}${a.tsumogiri === true ? ' 摸切' : ''}`
    case 'chi':
      return `吃 ${pai} [${formatConsumed(a.consumed)}]`
    case 'pon':
      return `碰 ${pai} [${formatConsumed(a.consumed)}]`
    case 'daiminkan':
      return `大明杠 ${pai}`
    case 'ankan':
      return `暗杠 ${pai}`
    case 'kakan':
      return `加杠 ${pai}`
    case 'reach':
      return a.pai !== undefined ? `立直 ${pai}` : '立直'
    case 'hora':
      if (a.pai !== undefined) { return `荣和 ${pai}` }
      return '自摸'
    case 'ryukyoku':
      return '流局'
    case 'nuki':
      return '拔北'
    case 'none':
      return '跳过'
    default:
      return JSON.stringify(action)
  }
}

function actionKey (action: unknown): string {
  return JSON.stringify(action)
}

export function isSameAction (a: unknown, b: unknown): boolean {
  return actionKey(a) === actionKey(b)
}
