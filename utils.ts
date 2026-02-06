import { StockDataPoint, Trade, BacktestResult } from './types';

// JSONP Utility
export const jsonp = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const script = document.createElement('script');
    
    (window as any)[callbackName] = (data: any) => {
      delete (window as any)[callbackName];
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      resolve(data);
    };

    script.src = `${url}&cb=${callbackName}`;
    script.onerror = () => {
      delete (window as any)[callbackName];
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      reject(new Error('JSONP request failed'));
    };

    document.body.appendChild(script);
  });
};

// Moving Average Calculator
export const calculateMA = (dayCount: number, data: any[], field: string = 'volume'): (number | null)[] => {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < dayCount - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < dayCount; j++) {
      sum += data[i - j][field];
    }
    result.push(parseFloat((sum / dayCount).toFixed(4)));
  }
  return result;
};

// HDY Indicator Calculator
export const calculateHDY = (data: StockDataPoint[]): number[] => {
  const N = 34;
  const M = 3;
  const hdy: number[] = [];
  let lastEMA = 50;

  for (let i = 0; i < data.length; i++) {
    if (i < N) {
      hdy.push(50);
      continue;
    }

    let maxH = -Infinity;
    let minL = Infinity;

    for (let j = i - N + 1; j <= i; j++) {
      if ((data[j].high ?? 0) > maxH) maxH = data[j].high ?? 0;
      if ((data[j].low ?? 0) < minL) minL = data[j].low ?? 0;
    }

    const C = data[i].close;
    let rsv = 50;
    if (maxH !== minL && maxH !== -Infinity) {
      rsv = ((C - minL) / (maxH - minL)) * 100;
    }

    const stdEMA = (2 * rsv + (M - 1) * lastEMA) / (M + 1);
    lastEMA = stdEMA;
    hdy.push(parseFloat(stdEMA.toFixed(2)));
  }
  return hdy;
};

// Backtest Logic
export const runStrategy = (data: StockDataPoint[]): BacktestResult => {
  const ma10 = calculateMA(10, data, 'volume');
  const ma100 = calculateMA(100, data, 'volume');

  let cash = 100000;
  let holdings = 0;
  const initialCapital = 100000;
  const capitalCurve: { date: string; value: number }[] = [];
  const benchmarkCurve: { date: string; value: number }[] = [];
  const trades: Trade[] = [];

  // Find start index where we have enough data
  let startIndex = 100;
  while (startIndex < data.length && (isNaN(data[startIndex].close) || ma100[startIndex] === null)) {
    startIndex++;
  }

  if (startIndex >= data.length) {
    return {
      trades: [],
      capitalCurve: [],
      benchmarkCurve: [],
      finalNetValue: 1,
      returnRate: '0.00',
      benchmarkReturn: '0.00',
      winRate: '0',
      tradeCount: 0
    };
  }

  const initialPrice = data[startIndex].close;

  for (let i = 0; i < data.length; i++) {
    if (i < startIndex) {
      // align arrays
      capitalCurve.push({ date: data[i].date, value: 1 });
      benchmarkCurve.push({ date: data[i].date, value: 1 });
      continue;
    }

    const price = data[i].close;
    const date = data[i].date;
    const benchmarkNetVal = price / initialPrice;
    benchmarkCurve.push({ date, value: parseFloat(benchmarkNetVal.toFixed(4)) });

    const prevMA10 = ma10[i - 1];
    const prevMA100 = ma100[i - 1];
    const currMA10 = ma10[i];
    const currMA100 = ma100[i];

    let action: 'buy' | 'sell' | 'hold' = 'hold';

    if (prevMA10 !== null && prevMA100 !== null && currMA10 !== null && currMA100 !== null) {
      if (prevMA10 <= prevMA100 && currMA10 > currMA100) action = 'buy';
      if (prevMA10 >= prevMA100 && currMA10 < currMA100) action = 'sell';
    }

    if (action === 'buy' && holdings === 0) {
      holdings = cash / price;
      cash = 0;
      trades.push({ date, type: 'buy', price, desc: '金叉买入' });
    } else if (action === 'sell' && holdings > 0) {
      cash = holdings * price;
      holdings = 0;
      trades.push({ date, type: 'sell', price, desc: '死叉卖出' });
    }

    const totalAsset = cash + (holdings * price);
    const strategyNetVal = totalAsset / initialCapital;
    capitalCurve.push({ date, value: parseFloat(strategyNetVal.toFixed(4)) });
  }

  const finalNetValue = capitalCurve[capitalCurve.length - 1]?.value || 1;
  const returnRate = ((finalNetValue - 1) * 100).toFixed(2);
  const finalBenchmarkNetValue = benchmarkCurve[benchmarkCurve.length - 1]?.value || 1;
  const benchmarkReturn = ((finalBenchmarkNetValue - 1) * 100).toFixed(2);

  const totalSellTrades = trades.filter(t => t.type === 'sell').length;
  const winTrades = trades.filter((t, i) => t.type === 'sell' && t.price > trades[i - 1].price).length;
  const winRate = totalSellTrades > 0 ? ((winTrades / totalSellTrades) * 100).toFixed(0) : '0';

  return {
    trades,
    capitalCurve,
    benchmarkCurve,
    finalNetValue,
    returnRate,
    benchmarkReturn,
    winRate,
    tradeCount: trades.length
  };
};