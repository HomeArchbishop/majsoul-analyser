import structuredClone from '@ungap/structured-clone'
import UI from './UI'
import { Analyser } from './analyser/Analyser'
import { Game } from './gameRecords/Game'
import { Round } from './gameRecords/Round'
import logger from './logger'
import { parseReqBufferMsg } from './majsoul/parseReqBufferMsg'
import { parseResBufferMsg } from './majsoul/parseResBufferMsg'
import * as Action from './types/Action'
import { ActionPrototype } from './types/ParsedMsg'
import { type Bot } from './bot'
import { sortTiles } from './utils/sortTiles'

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
  reqQueue: Record<number, { resName: string }> = {}

  handleReq (bufferMsg: Buffer): void {
    const _rand = ~~(Math.random() * 10000)
    logger.info(`<req-handler> Begin to handle ReqMsg(${_rand}): ${JSON.stringify(bufferMsg.toJSON().data)}`)
    const msg = parseReqBufferMsg(bufferMsg)
    logger.info(`<req-handler> Parsed ReqMsg(${_rand}) ${JSON.stringify(structuredClone(msg))}`)
    if (msg === null) { return }
    const { resName, index } = msg
    this.reqQueue[index] = { resName }
  }

  handleRes (bufferMsg: Buffer, meID: string = '', botOptions?: { bot: Bot, canvasW: number, canvasH: number, canvasScreenX: number, canvasScreenY: number, dpi: number }): void {
    if (this.bot === undefined && botOptions !== undefined) { this.bot = botOptions.bot } /* 有自动化机器人传入, 就说明需要自动化启用 */
    if (this.bot !== undefined && botOptions === undefined) { this.bot = undefined } /* 没有自动化机器人传入, 就说明关闭自动化 */
    if (this.bot !== undefined && botOptions !== undefined) { this.bot.updateDPI(botOptions.dpi) } /* 记录更新模版放大比 */
    if (this.bot !== undefined && botOptions !== undefined) { this.bot.updateCanvasWH(botOptions.canvasW, botOptions.canvasH) } /* 记录更新模版放大比 */
    if (this.bot !== undefined && botOptions !== undefined) { this.bot.updateCanvasXY(botOptions.canvasScreenX, botOptions.canvasScreenY) } /* 记录canvas屏幕位置 */
    const _rand = ~~(Math.random() * 10000)
    logger.info(`<res-handler> Begin to handle ResMsg${_rand}: ${JSON.stringify(bufferMsg.toJSON().data)}`)
    const msg = parseResBufferMsg(bufferMsg, this.reqQueue)
    logger.info(`<res-handler> Parsed ResMsg${_rand} ${JSON.stringify(structuredClone(msg))}`)
    if (msg === null) { return }
    /* ======================== */
    /*        Game进程通知       */
    /* ======================== */
    if (msg.name === 'ResAuthGame') { /* 整场游戏开始, 创建新游戏记录实例 */
      if (msg.data.error !== null && msg.data.error !== undefined) { return } /* 对局游戏故障或已结束（from雀魂服务端） */
      if (msg.data.seat_list.length < 1) { return } /* 多余的一次请求（雀魂有时会在有效ResAuthGame请求后再次请求, 得到空resp */
      if (meID.length < 1) { return printIDerror() }
      const meSeat = msg.data.seat_list.findIndex(id => String(id) === meID)
      if (meSeat === -1) { return printIDerror() }
      this.game = new Game({ meSeat })
    }
    if (msg.name === 'NotifyGameTerminate') { /* 整场游戏结束, 销毁游戏记录实例 */
      delete this.game
    }
    if (this.game === undefined) { return } /* 如果没有创建Game实例, 说明ID等有问题, 不进行下面的分析 */
    /* ======================== */
    /*        记录牌桌状态        */
    /* ======================== */
    if (msg.name === 'ActionPrototype') { /* 单个 ActionPrototype msg */
      this.#handleActionPrototypeMsg(msg)
    }
    if (msg.name === 'ResSyncGame' && msg.data.game_restore !== undefined && !msg.data.is_end) { /* 重回牌桌的同步消息, 含 ActionPrototype msg 队列 */
      for (const action of msg.data.game_restore.actions) {
        this.#handleActionPrototypeMsg({ name: 'ActionPrototype', data: action })
      }
    }
    /* =============================== */
    /* 处理一般流程Action消息的operations */
    /* =============================== */
    if (msg.name === 'ActionPrototype') { /* 单个 ActionPrototype msg 才进行分析 */
      this.#handleActionPrototypeOperations(msg, msg.data.step === 0)
    }
    if (msg.name === 'ResSyncGame' && msg.data.game_restore !== undefined && msg.data.game_restore.actions.length > 0 && !msg.data.is_end) { /* 重回牌桌的同步消息, 含 ActionPrototype msg 队列, 处理最后一步的 operation (if any) */
      this.#handleActionPrototypeOperations({ name: 'ActionPrototype', data: msg.data.game_restore.actions.slice(-1)[0] }, true)
    }
    logger.info(`<res-handler> handle ResMsg${_rand}`)
  }

  /**
   * 记录 ActionPrototype 消息指示的牌桌状态
   */
  #handleActionPrototypeMsg (msg: ActionPrototype): void {
    if (this.game === undefined) { return } /* 如果没有创建Game实例, 说明ID等有问题, 不进行下面的分析 */
    /* ========================= */
    /*     ActionNewRound消息    */
    /* ========================= */
    if (msg.data.name === 'ActionNewRound') { /* 新一轮(round)开始 */
      const actionData = msg.data.data as Action.ActionNewRound
      this.game.rounds[0] = new Round({
        chang: actionData.chang,
        ju: actionData.ju,
        ben: actionData.ben,
        al: actionData.al,
        scores: actionData.scores,
        meSeat: this.game.meSeat,
        meTiles: sortTiles(actionData.tiles),
        leftTileCnt: actionData.left_tile_count,
        doras: actionData.doras
      })
      this.game.roundPointer = 0
    }
    const round = this.game.rounds[this.game.roundPointer]
    if (round === undefined) { return }
    /* ======================== */
    /*     一般流程Action消息     */
    /* ======================== */
    if (msg.data.name === 'ActionAnGangAddGang') { /* ActionAnGangAddGang */
      const actionData = msg.data.data as Action.ActionAnGangAddGang
      if (actionData.doras?.length > 0) { round.doras = actionData.doras }
      if (actionData.type === 3) { /* 暗杠 */
        round.players[actionData.seat].anGang.push([
          actionData.tiles, actionData.tiles, actionData.tiles, actionData.tiles
        ])
        const hand = round.players[actionData.seat].hand
        if (hand !== undefined) { /* 如果是自己, 取走手牌 */
          for (let i = 0; i < hand.length; i++) {
            if (hand[i] === actionData.tiles) {
              hand.splice(i, 1)
            }
          }
        }
      } else if (actionData.type === 4) { /* 加杠 */
        round.players[actionData.seat].fulu.push([
          actionData.tiles, actionData.tiles, actionData.tiles, actionData.tiles
        ])
        if (round.players[actionData.seat].hand !== undefined) { /* 如果是自己, 取走手牌 */
          const index = round.players[actionData.seat].hand?.findIndex(t => t === actionData.tiles)
          if (index !== undefined && index > -1) {
            round.players[actionData.seat].hand?.splice(index, 1)
          }
        }
      }
    }
    if (msg.data.name === 'ActionChiPengGang') { /* ActionChiPengGang */
      const actionData = msg.data.data as Action.ActionChiPengGang
      if (actionData.doras?.length > 0) { round.doras = actionData.doras }
      round.players[actionData.seat].fulu.push([...actionData.tiles]) /* 放进副露队列 */
      for (let i = 0; i < actionData.froms.length; i++) {
        if (actionData.froms[i] !== actionData.seat) { /* 取走别家的牌河里的牌 */
          round.players[actionData.froms[i]].he.pop()
        } else if (round.players[actionData.froms[i]].hand !== undefined) { /* 如果是自己, 取走手牌 */
          const index = round.players[actionData.froms[i]].hand?.findIndex(t => t === actionData.tiles[i])
          if (index !== undefined && index > -1) {
            round.players[actionData.froms[i]].hand?.splice(index, 1)
          }
        }
      }
    }
    if (msg.data.name === 'ActionBaBei') { /* ActionBaBei */
      const actionData = msg.data.data as Action.ActionDealTile
      if (actionData.doras?.length > 0) { round.doras = actionData.doras }
      round.players[actionData.seat].baBei.push('4z')
      if (round.players[actionData.seat].hand !== undefined) { /* 如果是自己, 取走手牌 */
        const index = round.players[actionData.seat].hand?.findIndex(t => t === '4z')
        if (index !== undefined && index > -1) {
          round.players[actionData.seat].hand?.splice(index, 1)
        }
      }
    }
    if (msg.data.name === 'ActionDealTile') { /* ActionDealTile */
      const actionData = msg.data.data as Action.ActionDealTile
      if (actionData.doras?.length > 0) { round.doras = actionData.doras }
      if (round.players[round.meSeat].hand !== undefined && actionData.tile !== '') { /* 表示我的回合, 我摸牌 */
        round.players[round.meSeat].hand?.push(actionData.tile)
      }
    }
    if (msg.data.name === 'ActionDiscardTile') { /* ActionDiscardTile */
      const actionData = msg.data.data as Action.ActionDiscardTile
      if (actionData.doras?.length > 0) { round.doras = actionData.doras }
      round.players[actionData.seat].isLiqi = actionData.is_liqi
      round.players[actionData.seat].isWLiqi = actionData.is_wliqi
      round.players[actionData.seat].he.push(actionData.tile)
      round.players[actionData.seat].discards.push(actionData.tile)
      if (round.players[actionData.seat].hand !== undefined) { /* 如果是自己, 取走手牌 */
        const index = round.players[actionData.seat].hand?.findIndex(t => t === actionData.tile)
        if (index !== undefined && index > -1) {
          round.players[actionData.seat].hand?.splice(index, 1)
        }
      }
    }
    /* ======================== */
    /*   Round结束类Action消息   */
    /* ======================== */
    /* => USELESS, won't handle it */
    // UI.clear()
    // UI.print(UI.text.roundState(round))
    UI.print('new msg...', msg.data.step)
  }

  /**
   * 处理一般流程Action消息的operations
   */
  #handleActionPrototypeOperations (msg: ActionPrototype, wait: boolean): void {
    if (this.game === undefined) { return } /* 如果没有创建Game实例, 说明ID等有问题, 不进行下面的分析 */
    const round = this.game.rounds[this.game.roundPointer]
    if (round === undefined) { return }
    if (this.bot !== undefined) { this.bot.updateRound(round) } /* 记录当前round */
    /* =============================== */
    /* 处理一般流程Action消息的operations */
    /* =============================== */
    if (
      /Action(NewRound|AnGangAddGang|BaBei|ChiPengGang|DealTile|DiscardTile)/.test(msg.data.name) &&
      (msg.data.data as { operation: Action.OptionalOperationList | null }).operation !== null &&
      (msg.data.data as { operation: Action.OptionalOperationList }).operation.seat === round.meSeat &&
      (msg.data.data as { operation: Action.OptionalOperationList }).operation.operation_list.length > 0
    ) {
      const { operation_list: operationList } = (msg.data.data as Action.ActionNewRound |
      Action.ActionAnGangAddGang |
      Action.ActionBaBei |
      Action.ActionChiPengGang |
      Action.ActionDealTile |
      Action.ActionDiscardTile).operation as Action.OptionalOperationList
      const priority = [8, 9, 2, 3, 4, 5, 7, 11, 1]
      operationList.sort(({ type: t1 }, { type: t2 }) => priority.findIndex(n => n === t1) - priority.findIndex(n => n === t2))
      for (const optionalOperation of operationList) { /* 遍历每一个可选操作 */
        if (optionalOperation.type === 8) { /* 自摸 */
          const { choice, info } = this.analyser.analyseHule(round)
          console.log({ choice, info })
          if (this.bot !== undefined) {
            logger.info(`<bot> bot click ${choice ? 'zimo' : 'tiaoguo'}`)
            this.bot.ensureClick(choice ? 'zimo' : 'tiaoguo', wait)
            break
          }
        }
        if (optionalOperation.type === 9) { /* 荣和 */
          const { choice, info } = this.analyser.analyseHule(round)
          console.log({ choice, info })
          if (this.bot !== undefined) {
            logger.info(`<bot> bot click ${choice ? 'hule' : 'tiaoguo'}`)
            this.bot.ensureClick(choice ? 'hu' : 'tiaoguo', wait)
            break
          }
        }
        if (optionalOperation.type === 2) { /* 吃 */
          const { choice, info } = this.analyser.analyseChi(round, (msg.data.data as Action.ActionDiscardTile).tile)
          console.log({ choice, info })
          if (this.bot !== undefined) {
            logger.info(`<bot> bot click ${choice ? 'chi' : 'tiaoguo'}`)
            this.bot.ensureClick(choice ? 'chi' : 'tiaoguo', wait)
            break
          }
        }
        if (optionalOperation.type === 3) { /* 碰 */
          const { choice, info } = this.analyser.analysePeng(round, (msg.data.data as Action.ActionDiscardTile).tile)
          console.log({ choice, info })
          if (this.bot !== undefined) {
            logger.info(`<bot> bot click ${choice ? 'peng' : 'tiaoguo'}`)
            this.bot.ensureClick(choice ? 'peng' : 'tiaoguo', wait)
            break
          }
        }
        if (optionalOperation.type === 4) { /* 暗杠 */
          const { choice, info, discard } = this.analyser.analyseAnGang(round, (msg.data.data as Action.ActionDiscardTile).tile)
          console.log({ choice, info })
          if (this.bot !== undefined) {
            logger.info(`<bot> bot click ${choice ? 'AnGang' : 'tiaoguo'}`)
            if (choice) {
              this.bot.ensureClick('gang', wait)
            } else {
              this.bot.ensureClick(discard, wait)
            }
            break
          }
        }
        if (optionalOperation.type === 5) { /* 杠 */
          const { choice, info } = this.analyser.analyseGang(round, (msg.data.data as Action.ActionDiscardTile).tile)
          console.log({ choice, info })
          if (this.bot !== undefined) {
            logger.info(`<bot> bot click ${choice ? 'AnGang' : 'tiaoguo'}`)
            this.bot.ensureClick(choice ? 'gang' : 'tiaoguo', wait)
            break
          }
        }
        if (optionalOperation.type === 7) { /* 立直 */
          const { choice, info, discard } = this.analyser.analyseLiqi(round)
          console.log({ choice, info, discard })
          if (this.bot !== undefined) {
            logger.info(`<bot> bot click ${choice ? 'lizhi:' + discard : 'moting:' + discard}`)
            if (choice) {
              this.bot.ensureClick('lizhi', wait)
              this.bot.ensureClick(discard)
            } else {
              this.bot.ensureClick(discard, wait)
            }
            break
          }
        }
        if (optionalOperation.type === 11) { /* 拔北 */
          const { choice, info } = this.analyser.analyseBabei(round)
          console.log({ choice, info })
          if (this.bot !== undefined) {
            logger.info(`<bot> bot click ${choice ? 'babei' : 'tiaoguo'}`)
            this.bot.ensureClick(choice ? 'babei' : 'tiaoguo', wait)
            break
          }
        }
        if (optionalOperation.type === 1) { /* discard 切牌 */
          const { choice, info } = this.analyser.analyseDiscard(round)
          console.log({ choice, info })
          if (this.bot !== undefined) {
            logger.info(`<bot> bot click tile(${choice})`)
            this.bot.ensureClick(choice, wait)
            break
          }
        }
      }
    }
  }

  game?: Game

  analyser: Analyser = new Analyser()

  bot?: Bot
}

export { MsgHandler }
