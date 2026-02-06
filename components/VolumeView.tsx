import React, { useMemo, useState } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Brush, ReferenceDot
} from 'recharts';
import { StockDataPoint } from '../types';
import { calculateMA } from '../utils';

interface VolumeViewProps {
  data: StockDataPoint[];
  showSignals?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 border border-slate-200 p-3 shadow-xl rounded text-sm text-slate-700">
        <p className="font-bold border-b pb-1 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
            <span>{p.name}:</span>
            <span className="font-mono font-medium">
               {p.value.toLocaleString(undefined, { maximumFractionDigits: 4 })}
               {p.name.includes('成交量') ? ' 亿' : ''}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const VolumeView: React.FC<VolumeViewProps> = ({ data, showSignals = false }) => {
  const [showMA20W, setShowMA20W] = useState(false);
  const [showCustomMA, setShowCustomMA] = useState(false);
  const [customMADays, setCustomMADays] = useState(148);

  const processedData = useMemo(() => {
    if (!data.length) return [];
    
    // Calculate MAs locally for chart
    const ma100 = calculateMA(100, data, 'volume'); // 20 weeks approx 100 days
    const maCustom = calculateMA(customMADays, data, 'volume');
    const ma10 = calculateMA(10, data, 'volume');
    
    return data.map((d, i) => ({
      ...d,
      maShort: ma10[i],
      maLong: ma100[i], // MA100 is 20-week roughly
      maCustom: maCustom[i],
      // For signals
      signal: showSignals && i > 100 ? (() => {
         const pShort = ma10[i-1] || 0;
         const pLong = ma100[i-1] || 0;
         const cShort = ma10[i] || 0;
         const cLong = ma100[i] || 0;
         if (pShort <= pLong && cShort > cLong) return 'buy';
         if (pShort >= pLong && cShort < cLong) return 'sell';
         return null;
      })() : null
    }));
  }, [data, customMADays, showSignals]);

  // Identify Buy/Sell points for markers
  const signals = useMemo(() => {
    if (!showSignals) return [];
    return processedData.filter(d => d.signal);
  }, [processedData, showSignals]);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 text-sm">
          {!showSignals ? (
            <>
              <button 
                onClick={() => setShowMA20W(!showMA20W)}
                className={`px-3 py-1.5 rounded-full border transition-colors ${showMA20W ? 'bg-yellow-50 border-yellow-300 text-yellow-700 font-medium' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
              >
                📈 20周均量线
              </button>
              
              <div className="flex items-center gap-2 p-1 border rounded-full pl-3 bg-slate-50">
                <input 
                  type="number" 
                  value={customMADays}
                  onChange={(e) => setCustomMADays(Number(e.target.value))}
                  className="w-12 bg-transparent text-center border-b border-slate-300 focus:outline-none text-slate-700 font-mono"
                />
                <span className="text-slate-500 text-xs mr-1">日</span>
                <button 
                  onClick={() => setShowCustomMA(!showCustomMA)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${showCustomMA ? 'bg-cyan-100 text-cyan-800' : 'bg-white border hover:bg-slate-100'}`}
                >
                  叠加
                </button>
              </div>
            </>
          ) : (
             <div className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium">
               策略说明: 短期均量(MA10) 金叉 长期均量(MA100/20周) 买入，死叉卖出
             </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-[400px] w-full bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: '#64748b' }} 
              tickLine={false}
              minTickGap={30}
            />
            <YAxis 
              yAxisId="price"
              domain={['auto', 'auto']}
              tick={{ fontSize: 10, fill: '#ef4444' }}
              tickLine={false}
              axisLine={{ stroke: '#ef4444' }}
              label={{ value: '指数', position: 'insideTopLeft', fill: '#ef4444', fontSize: 10 }}
            />
            <YAxis 
              yAxisId="vol" 
              orientation="right" 
              domain={[0, (dataMax: number) => Math.max(dataMax * 1.5, 3)]}
              tick={{ fontSize: 10, fill: '#3b82f6' }}
              tickLine={false}
              axisLine={{ stroke: '#3b82f6' }}
              label={{ value: '成交(万亿)', position: 'insideTopRight', fill: '#3b82f6', fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
            
            <Bar 
              yAxisId="vol" 
              dataKey="volume" 
              name="成交量" 
              fill="#cbd5e1" 
              barSize={2}
              isAnimationActive={false}
            />
            
            {showMA20W && (
              <Line yAxisId="vol" type="monotone" dataKey="maLong" name="20周均量" stroke="#eab308" strokeWidth={2} dot={false} isAnimationActive={false} />
            )}
            {showCustomMA && (
              <Line yAxisId="vol" type="monotone" dataKey="maCustom" name={`MA${customMADays}均量`} stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
            )}

            {showSignals && (
              <Line yAxisId="vol" type="monotone" dataKey="maShort" name="MA10(短)" stroke="#3b82f6" strokeWidth={1} dot={false} isAnimationActive={false} />
            )}
            {showSignals && (
              <Line yAxisId="vol" type="monotone" dataKey="maLong" name="MA100(长)" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
            )}

            <Line 
              yAxisId="price" 
              type="monotone" 
              dataKey="close" 
              name="收盘价" 
              stroke="#ef4444" 
              strokeWidth={1.5} 
              dot={false} 
              isAnimationActive={false}
            />

            {showSignals && signals.map((s, idx) => (
               <ReferenceDot
                  key={idx}
                  yAxisId="price"
                  x={s.date}
                  y={s.close}
                  r={4}
                  fill={s.signal === 'buy' ? '#ef4444' : '#22c55e'}
                  stroke="none"
                  label={{ 
                    value: s.signal === 'buy' ? 'B' : 'S', 
                    position: 'top', 
                    fill: s.signal === 'buy' ? '#ef4444' : '#22c55e',
                    fontSize: 10,
                    fontWeight: 'bold'
                  }}
               />
            ))}

            <Brush dataKey="date" height={30} stroke="#94a3b8" fill="#f8fafc" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};