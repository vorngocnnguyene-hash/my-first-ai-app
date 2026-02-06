import React, { useMemo, useState } from 'react';
import { 
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceArea, Brush
} from 'recharts';
import { StockDataPoint } from '../types';

interface BondViewProps {
  data: StockDataPoint[];
}

export const BondView: React.FC<BondViewProps> = ({ data }) => {
  const [highlightMode, setHighlightMode] = useState<'none' | 'kill' | 'bull'>('none');

  // Calculate regions for highlighting
  const areas = useMemo(() => {
    if (highlightMode === 'none' || data.length < 20) return [];
    
    const regions: { x1: string; x2: string; type: string }[] = [];
    let start: string | null = null;
    
    const WINDOW = 20;

    for (let i = WINDOW; i < data.length; i++) {
      const curr = data[i];
      const prev = data[i - WINDOW];
      
      if (!curr.bondPrice || !prev.bondPrice) continue;

      const stockChg = (curr.close - prev.close) / prev.close;
      const bondChg = (curr.bondPrice - prev.bondPrice) / prev.bondPrice;

      let isMatch = false;
      if (highlightMode === 'kill') {
        // Stock down > 1%, Bond down > 0.1% (Liquidity Crunch)
        if (stockChg < -0.01 && bondChg < -0.001) isMatch = true;
      } else if (highlightMode === 'bull') {
        // Stock up > 1%, Bond up > 0.1% (Liquidity Flood)
        if (stockChg > 0.01 && bondChg > 0.001) isMatch = true;
      }

      if (isMatch) {
        if (!start) start = curr.date;
      } else {
        if (start) {
          regions.push({ x1: start, x2: data[i-1].date, type: highlightMode });
          start = null;
        }
      }
    }
    // Close pending region
    if (start) {
        regions.push({ x1: start, x2: data[data.length-1].date, type: highlightMode });
    }

    return regions;
  }, [data, highlightMode]);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <span className="text-sm font-semibold text-slate-700">分析工具:</span>
        <button 
          onClick={() => setHighlightMode(highlightMode === 'kill' ? 'none' : 'kill')}
          className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${highlightMode === 'kill' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          📉 股债双杀 (流动性紧缩)
        </button>
        <button 
          onClick={() => setHighlightMode(highlightMode === 'bull' ? 'none' : 'bull')}
          className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${highlightMode === 'bull' ? 'bg-red-50 border-red-300 text-red-800 font-bold' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          🚀 股债同涨 (流动性泛滥)
        </button>
      </div>

      <div className="flex-1 min-h-[400px] w-full bg-white rounded-lg border border-slate-200 shadow-sm p-4 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
             <defs>
              <linearGradient id="colorBond" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: '#64748b' }} 
              tickLine={false}
              minTickGap={30}
            />
            <YAxis 
              yAxisId="stock"
              domain={['auto', 'auto']}
              tick={{ fontSize: 10, fill: '#ef4444' }}
              tickLine={false}
              axisLine={{ stroke: '#ef4444' }}
              label={{ value: '指数', position: 'insideTopLeft', fill: '#ef4444', fontSize: 10 }}
            />
            <YAxis 
              yAxisId="bond" 
              orientation="right" 
              domain={['auto', 'auto']}
              tick={{ fontSize: 10, fill: '#7c3aed' }}
              tickLine={false}
              axisLine={{ stroke: '#7c3aed' }}
              label={{ value: '国债ETF', position: 'insideTopRight', fill: '#7c3aed', fontSize: 10 }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontSize: '12px' }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />

            {/* Render Highlight Areas */}
            {areas.map((area, idx) => (
              <ReferenceArea 
                key={idx} 
                yAxisId="stock"
                x1={area.x1} 
                x2={area.x2} 
                fill={area.type === 'kill' ? '#0f766e' : '#b91c1c'} 
                fillOpacity={0.15} 
              />
            ))}

            <Line 
              yAxisId="stock" 
              type="monotone" 
              dataKey="close" 
              name="上证指数" 
              stroke="#ef4444" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false}
            />
            <Line 
              yAxisId="bond" 
              type="monotone" 
              dataKey="bondPrice" 
              name="30年国债ETF (511090)" 
              stroke="#7c3aed" 
              strokeWidth={2} 
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Brush dataKey="date" height={30} stroke="#94a3b8" fill="#f8fafc" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};