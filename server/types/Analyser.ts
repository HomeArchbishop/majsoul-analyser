import { Round } from '../gameRecords/Round'
import { ParsedOperation, ParsedOperationList } from './ParsedOperation'

export abstract class BaseAnalyser {
  abstract analyseOperations (parsedOperationList: ParsedOperationList, round: Round): { choice: ParsedOperation, info?: string }
}
