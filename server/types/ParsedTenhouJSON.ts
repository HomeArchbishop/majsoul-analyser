// 0-35 m
// 36-71 p
// 72-107 s
// 108- z

export interface TenhouGO {
  tag: 'GO'
}

// Start of hand
// { "tag": "INIT", "seed": "0,0,0,2,2,39", "ten": "250,250,250,250", "oya": "3", "hai": "19,88,52,46,5,130,16,134,93,76,50,83,42" }
export interface TenhouINIT {
  tag: 'INIT'
  seed: number[]
  // [Round number, Number of combo sticks, Number of riichi sticks, First dice minus one, Second dice minus one, Dora indicator]
  ten: number[]
  oya: number
  hai: number[] // len = 13 "19,88,52,46,5,130,16,134,93,76,50,83,42"
}

export interface TenhouDORA {
  tag: 'DORA'
  hai: number
}

export interface TenhouREACH {
  tag: 'REACH'
  step: number // 1:立直宣言, 2:立直成立
  who: number
  ten: number
}

export interface TenhouAGARI {
  tag: 'AGARI' // 一炮双响, AGARI元素出现两次
  who: number
  fromWho: number
}

export interface TenhouN {
  tag: 'N'
  who: number
  m: number
}

export interface TenhouDeal {
  tag: 'T' | 'U' | 'V' | 'W' // (T|U|V|W)(0-135)
  hai?: number
}

export interface TenhouDiscard {
  tag: 'D' | 'E' | 'F' | 'G' // (D|E|F|G)(0~135)
  hai: number
  t: number // next action: 1: pon, 4：chi ...
}

export interface TenhouRYUUKYOKU {
  tag: 'RYUUKYOKU'
  type: 'nm' | 'yao9' | 'kaze4' | 'reach4' | 'ron3' | 'kan4'
}

export type ParsedTenhouJSON = TenhouGO | TenhouINIT | TenhouDORA | TenhouREACH | TenhouAGARI | TenhouN | TenhouDeal | TenhouDiscard | TenhouRYUUKYOKU
