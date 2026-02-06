import React, { useMemo, useState } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceDot, Brush
} from 'recharts';
import { StockDataPoint } from '../types';
import { runStrategy, calculateMA } from '../utils';

interface BacktestViewProps {
  data: StockDataPoint[];
}

export const BacktestView: React.FC<BacktestViewProps> = ({ data }) => {
  const { 
    capitalCurve, benchmarkCurve, trades, 
    finalNetValue, returnRate, benchmarkReturn, winRate, tradeCount 
  } = useMemo(() => runStrategy(data), [data]);

  const chartData = useMemo(() => {
    const ma10 = calculateMA(10, data, 'volume');
    const ma100 = calculateMA(100, data, 'volume');
    return capitalCurve.map((c, i) => ({
      date: c.date,
      strategy: c.value,
      benchmark: benchmarkCurve[i]?.value,
      price: data.find(d => d.date === c.date)?.close,
      volume: data.find(d => d.date === c.date)?.volume,
      maShort: ma10.find((_, idx) => data[idx].date === c.date),
      maLong: ma100.find((_, idx) => data[idx].date === c.date)
    }));
  }, [data, capitalCurve, benchmarkCurve]);

  // Determine current signal status
  const currentSignal = useMemo(() => {
    if (trades.length === 0) return { type: 'none', date: '-', price: 0 };
    const lastTrade = trades[trades.length - 1];
    return {
        type: lastTrade.type,
        date: lastTrade.date,
        price: lastTrade.price
    };
  }, [trades]);

  // Filter trades for markers
  const markers = useMemo(() => {
    return trades.map(t => ({
      ...t,
    }));
  }, [trades]);

  // Sync state for zoom
  const [zoomState, setZoomState] = useState<{startIndex: number | undefined, endIndex: number | undefined}>({
    startIndex: undefined,
    endIndex: undefined
  });

  const handleBrushChange = (e: any) => {
    if (e) {
      setZoomState({ startIndex: e.startIndex, endIndex: e.endIndex });
    }
  };

  const zoomedData = useMemo(() => {
    if (zoomState.startIndex !== undefined && zoomState.endIndex !== undefined) {
      return chartData.slice(zoomState.startIndex, zoomState.endIndex + 1);
    }
    return chartData;
  }, [chartData, zoomState]);

  if (!data.length) return <div className="p-8 text-center text-slate-500">正在加载数据...</div>;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Current Signal Status Bar */}
      <div className={`flex items-center justify-between p-4 rounded-lg border shadow-sm ${currentSignal.type === 'buy' ? 'bg-red-50 border-red-200' : currentSignal.type === 'sell' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${currentSignal.type === 'buy' ? 'bg-red-500' : currentSignal.type === 'sell' ? 'bg-green-600' : 'bg-slate-400'}`}>
                  {currentSignal.type === 'buy' ? '多' : currentSignal.type === 'sell' ? '空' : '-'}
              </div>
              <div>
                  <div className="text-sm text-slate-500">当前策略信号</div>
                  <div className={`text-lg font-bold ${currentSignal.type === 'buy' ? 'text-red-600' : currentSignal.type === 'sell' ? 'text-green-700' : 'text-slate-600'}`}>
                      {currentSignal.type === 'buy' ? '持仓 (看多)' : currentSignal.type === 'sell' ? '空仓 (避险)' : '无信号'}
                  </div>
              </div>
          </div>
          {currentSignal.type !== 'none' && (
              <div className="text-right">
                  <div className="text-xs text-slate-500">信号发出时间</div>
                  <div className="font-mono font-medium text-slate-800">{currentSignal.date}</div>
                  <div className="text-xs text-slate-400">@ {currentSignal.price.toFixed(2)}</div>
              </div>
          )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-col items-center p-2 rounded bg-slate-50">
           <span className="text-xs text-slate-500">策略总收益</span>
           <span className={`text-lg font-bold ${Number(returnRate) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
             {returnRate}%
           </span>
        </div>
        <div className="flex flex-col items-center p-2 rounded bg-slate-50">
           <span className="text-xs text-slate-500">基准收益</span>
           <span className="text-lg font-bold text-slate-700">{benchmarkReturn}%</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded bg-slate-50">
           <span className="text-xs text-slate-500">当前净值</span>
           <span className="text-lg font-bold text-blue-600">{finalNetValue.toFixed(4)}</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded bg-slate-50">
           <span className="text-xs text-slate-500">交易次数</span>
           <span className="text-lg font-bold text-slate-700">{tradeCount}</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded bg-slate-50">
           <span className="text-xs text-slate-500">胜率</span>
           <span className="text-lg font-bold text-slate-700">{winRate}%</span>
        </div>
      </div>

      <div className="flex-1 h-full w-full grid grid-rows-2 gap-4">
        {/* Top Chart: Net Value & Price (Controlled by Zoom) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 row-span-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={zoomedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} syncId="backtestSync">
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
               <XAxis dataKey="date" tick={false} axisLine={false} height={0} />
               <YAxis yAxisId="left" domain={['auto', 'auto']} tick={{fontSize:10}} />
               <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tick={{fontSize:10}} />
               <Tooltip />
               <Legend verticalAlign="top" height={24}/>
               
               <Line yAxisId="left" type="monotone" dataKey="strategy" name="策略净值" stroke="#dc2626" strokeWidth={2} dot={false} isAnimationActive={false} />
               <Line yAxisId="left" type="monotone" dataKey="benchmark" name="基准净值" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
               <Line yAxisId="right" type="monotone" dataKey="price" name="标的价格" stroke="#3b82f6" strokeWidth={1} dot={false} opacity={0.5} isAnimationActive={false} />

               {markers.map((t, idx) => {
                 // Only show markers if they are in the zoomed range
                 const isInRange = zoomedData.find(d => d.date === t.date);
                 if (!isInRange) return null;
                 return (
                  <ReferenceDot
                    key={idx}
                    yAxisId="right"
                    x={t.date}
                    y={t.price}
                    r={3}
                    fill={t.type === 'buy' ? '#dc2626' : '#16a34a'}
                    stroke="white"
                  />
                 );
               })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Chart: Volume & MAs (Controls Zoom) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 row-span-1 min-h-[200px]">
           <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} syncId="backtestSync">
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
               <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={30} />
               <YAxis domain={[0, 'auto']} tick={{fontSize:10}} />
               <Tooltip />
               <Legend verticalAlign="top" height={24} />
               
               <Bar dataKey="volume" name="成交量" fill="#e2e8f0" barSize={2} isAnimationActive={false} />
               <Line type="monotone" dataKey="maShort" name="MA10成交量" stroke="#3b82f6" strokeWidth={1} dot={false} isAnimationActive={false} />
               <Line type="monotone" dataKey="maLong" name="MA100成交量" stroke="#f59e0b" strokeWidth={1} dot={false} isAnimationActive={false} />
               
               <Brush 
                  dataKey="date" 
                  height={30} 
                  stroke="#94a3b8" 
                  fill="#f8fafc" 
                  onChange={handleBrushChange}
                />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};