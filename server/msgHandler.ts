import structuredClone from '@ungap/structured-clone'
import UI from './UI'
import { analyserModule } from './analyser/analyserModule'
import { Game } from './gameRecords/Game'
import logger from './logger'
import { parseReqBufferMsg } from './majsoul/parseReqBufferMsg'
import { parseResBufferMsg } from './majsoul/parseResBufferMsg'
import { type Bot } from './bot'
import type { BaseAnalyser } from './types/Analyser'
import type { GameNameString } from './types/General'
import { record } from './gameRecords/record'

function printIDerror (): void {
  UI.print('未获取玩家的ID或ID错误, 请重启游戏')
  UI.print('牌局记录创建失败, 本场游戏不会进行分析')
}

/**
 * - 解密并格式化二进制消息
 * - 按流程控制分发给相应的构造器
 * - 调用相应的分析模型分析
 */
class MsgHandler {
  reqQueue: Record<GameNameString, Record<number, { resName: string }>> = {
    majsoul: {}
  }

  async handleReq (bufferMsg: Buffer, gameName: GameNameString): Promise<void> {
    if (!Object.keys(this.reqQueue).includes(gameName)) { return } // 不支持的游戏平台
    const _rand = ~~(Math.random() * 10000)
    logger.info(`<req-handler> Begin to handle ReqMsg(${gameName}${_rand}): ${JSON.stringify(bufferMsg.toJSON().data)}`)
    const msgList = parseReqBufferMsg(bufferMsg)
    logger.info(`<req-handler> Parsed ReqMsg(${gameName}${_rand}) ${JSON.stringify(structuredClone(msgList))}`)
    for (let i = 0; i < msgList.length; i++) {
      const msg = msgList[i]
      const { resName, index } = msg
      this.reqQueue[gameName][index] = { resName }
    }
  }

  async handleRes (
    bufferMsg: Buffer, meID: string = '', gameName: GameNameString,
    botOptions?: { bot: Bot, canvasW: number, canvasH: number, canvasScreenX: number, canvasScreenY: number, dpi: number, autoGame: boolean, jian: number, chang: number }
  ): Promise<void> {
    if (!Object.keys(this.reqQueue).includes(gameName)) { return } // 不支持的游戏平台
    if (this.analyser === undefined) { return } /* analyser 未初始化 */
    if (this.bot === undefined && botOptions !== undefined) { this.bot = botOptions.bot } /* 有自动化机器人传入, 就说明需要自动化启用 */
    if (this.bot !== undefined && botOptions === undefined) { this.bot = undefined } /* 没有自动化机器人传入, 就说明关闭自动化 */
    if (this.bot !== undefined && botOptions !== undefined) { this.bot.updateDPI(botOptions.dpi) } /* 记录更新模版放大比 */
    if (this.bot !== undefined && botOptions !== undefined) { this.bot.updateCanvasWH(botOptions.canvasW, botOptions.canvasH) } /* 记录更新模版放大比 */
    if (this.bot !== undefined && botOptions !== undefined) { this.bot.updateCanvasXY(botOptions.canvasScreenX, botOptions.canvasScreenY) } /* 记录canvas屏幕位置 */

    /* ------------------------------ */
    /*      Majsoul 转译模块 START     */
    /* ------------------------------ */
    const _rand = ~~(Math.random() * 10000)
    logger.info(`<res-handler> Begin to handle ResMsg(${gameName}${_rand}): ${JSON.stringify(bufferMsg.toJSON().data)}`)
    const [parsedMsgList, parsedRoughOperationList] = parseResBufferMsg(bufferMsg, this.reqQueue[gameName], { meID, meSeat: this.game?.meSeat })
    logger.info(`<res-handler> Parsed ResMsg(${gameName}${_rand}) ${JSON.stringify(structuredClone(parsedMsgList))}`)
    /* ----------------------------- */
    /*      Majsoul 转译模块 END      */
    /* ----------------------------- */

    if (parsedMsgList.length === 0) { return }

    /* ------------------------------ */
    /*    GameRecorder 模块 START     */
    /* ----------------------------- */
    logger.info('<res-handler> GameRecorder start')
    for (const parsedMsg of parsedMsgList) {
      /* ======================== */
      /*        Game进程通知       */
      /* ======================== */
      if (parsedMsg.type === 'start_game') { /* 整场游戏开始, 创建新游戏记录实例 */
        if (meID.length < 1) { return printIDerror() }
        const meSeat = parsedMsg.id
        if (meSeat === -1) { return printIDerror() }
        this.game = new Game({ meSeat })
        continue
      }
      if (parsedMsg.type === 'end_game') { /* 整场游戏结束, 销毁游戏记录实例 */
        /* ================================== */
        /*   对局结束消息 Bot 模块 hook START  */
        /* ================================== */
        if (botOptions?.autoGame === true) { this.bot?.startNewGameFromEnd(botOptions.jian, botOptions.chang) }
        /* =============================== */
        /*  对局结束消息 Bot 模块 hook END  */
        /* =============================== */
        delete this.game
        continue
      }
      if (this.game === undefined) { break } /* 如果没有创建Game实例, 说明ID等有问题, 不进行下面的分析 */
      /* ======================== */
      /*        记录牌桌状态       */
      /* ======================== */
      const recordedStepNum = record(this.game, parsedMsg)
      UI.print(`new msg... ${recordedStepNum}`, parsedMsg)
    }
    logger.info('<res-handler> GameRecorder end')
    /* ---------------------------- */
    /*    GameRecorder 模块 END     */
    /* --------------------------- */

    if (this.game?.rounds[this.game.roundPointer] === undefined) { return } /* 如果没有创建Game实例或无即时Round, 不进行下面的分析 */
    if (this.analyser === undefined) { return } /* 如果没有analyser, 不进行下面的分析 */
    if (parsedRoughOperationList.length === 0) { return } /* 如果没有备选操作, 不进行下面的分析 */

    /* ---------------------------- */
    /*     Analyser 模块 START      */
    /*       处理 operations        */
    /* ---------------------------- */
    logger.info('<res-handler> Analyser start')
    UI.print('get rough operations', parsedRoughOperationList)
    const round = this.game.rounds[this.game.roundPointer]
    const parsedOperationList = analyserModule.detailizeParsedOperationList(parsedRoughOperationList, round) /* 细分 operations */
    UI.print('analysing, type:', parsedOperationList)
    const { choice: operationChoice, info } = await this.analyser.analyseOperations(parsedOperationList, round)
    UI.print('choice: ', JSON.stringify(structuredClone(operationChoice)), ' | ', info)
    logger.info('<res-handler> Analyser end')
    /* -------------------------- */
    /*     Analyser 模块 END      */
    /*      处理 operations       */
    /* -------------------------- */

    if (this.bot === undefined) { return }

    /* ----------------------- */
    /*      Bot 模块 START      */
    /*      处理 operations     */
    /* ----------------------- */
    logger.info('<res-handler> Bot start')
    this.bot.updateRound(round)
    this.bot.handleOperationChoice(operationChoice)
    logger.info('<res-handler> Bot end')
    /* ----------------------- */
    /*       Bot 模块 END      */
    /*      处理 operations    */
    /* ----------------------- */

    logger.info(`<res-handler> handled ResMsg${_rand}`)
  }

  game?: Game

  analyser?: BaseAnalyser
  setAnalyser (analyser: BaseAnalyser): void { this.analyser = analyser }

  bot?: Bot
}

export { MsgHandler }
