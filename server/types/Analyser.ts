import { Round } from '@/board/Round'
import type { MjaiAction, MjaiActionList } from '@/types/Mjai'

export interface AnalyseResult {
  choice: MjaiAction
  info?: string
  /** 与传入的 mjaiActionList 等长；无评分时省略或填 null */
  scores?: Array<number | null>
}

export abstract class BaseAnalyser {
  init?: (...args: any) => Promise<boolean>

  end?: (...args: any) => Promise<void>

  abstract analyseActions (mjaiActionList: MjaiActionList, round: Round): Promise<AnalyseResult>
}
