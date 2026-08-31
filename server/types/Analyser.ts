import { Round } from '../gameRecords/Round'
import type { MjaiAction, MjaiActionList } from './Mjai'

export abstract class BaseAnalyser {
  init?: (...args: any) => Promise<boolean>

  end?: (...args: any) => Promise<void>

  abstract analyseOperations (mjaiActionList: MjaiActionList, round: Round): Promise<{ choice: MjaiAction, info?: string }>
}
