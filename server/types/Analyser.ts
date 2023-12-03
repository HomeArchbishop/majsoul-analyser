import { Round } from '../gameRecords/Round'
import { ParsedOperation, ParsedOperationList } from './ParsedOperation'

export abstract class BaseAnalyser {
  abstract analyseOperations (parsedOperationList: ParsedOperationList, round: Round): Promise<{ choice: ParsedOperation, info?: string }>
}
