export interface StockDataPoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume: number;
  // Specific fields for different views
  index?: number;
  bondPrice?: number;
  maShort?: number | null;
  maLong?: number | null;
  maCustom?: number | null;
  hdy?: number;
}

export interface Trade {
  date: string;
  type: 'buy' | 'sell';
  price: number;
  desc: string;
}

export interface BacktestResult {
  trades: Trade[];
  capitalCurve: { date: string; value: number }[];
  benchmarkCurve: { date: string; value: number }[];
  finalNetValue: number;
  returnRate: string;
  benchmarkReturn: string;
  winRate: string;
  tradeCount: number;
}

export enum TabType {
  VOLUME = 'volume',
  BOND = 'bond',
  SIGNAL = 'signal',
  BACKTEST = 'backtest',
  TOPBOTTOM = 'topbottom'
}

export interface ETFOption {
  label: string;
  value: string; // secid
  desc?: string;
}