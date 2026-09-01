import { Round } from '../board/Round'
import type { MjaiAction, MjaiActionList } from './Mjai'

export abstract class BaseAnalyser {
  init?: (...args: any) => Promise<boolean>

  end?: (...args: any) => Promise<void>

  abstract analyseActions (mjaiActionList: MjaiActionList, round: Round): Promise<{ choice: MjaiAction, info?: string }>
}
