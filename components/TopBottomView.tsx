import React, { useMemo, useState } from 'react';
import { 
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Area, Brush
} from 'recharts';
import { StockDataPoint } from '../types';
import { calculateHDY } from '../utils';

interface TopBottomViewProps {
  data: StockDataPoint[];
}

export const TopBottomView: React.FC<TopBottomViewProps> = ({ data }) => {
  const chartData = useMemo(() => {
    const hdy = calculateHDY(data);
    return data.map((d, i) => ({
      ...d,
      hdy: hdy[i]
    }));
  }, [data]);

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

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-600 flex items-center gap-2">
        <span className="font-bold text-slate-800">HDY 顶底指标:</span>
        <span className="text-green-600 font-medium"> &gt; 90 顶部风险</span>
        <span className="text-slate-300">|</span>
        <span className="text-red-500 font-medium"> &lt; 10 底部机会 (黄金坑)</span>
      </div>

      <div className="flex-1 w-full grid grid-rows-2 gap-4">
        {/* Top: Price (Controlled) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={zoomedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} syncId="tbSync">
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
               <XAxis dataKey="date" tick={false} axisLine={false} height={0} />
               <YAxis domain={['auto', 'auto']} tick={{fontSize:10}} />
               <Tooltip />
               <Line type="monotone" dataKey="close" name="价格" stroke="#ef4444" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom: HDY (Controller) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 min-h-[200px]">
           <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} syncId="tbSync">
               <defs>
                 <linearGradient id="colorHdy" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                   <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
               <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={30} />
               <YAxis domain={[0, 100]} tick={{fontSize:10}} ticks={[0, 20, 50, 80, 100]}/>
               <Tooltip />
               
               <ReferenceLine y={90} stroke="green" strokeDasharray="3 3" label={{ value: '风险区', fill: 'green', fontSize: 10, position: 'right' }}/>
               <ReferenceLine y={10} stroke="red" strokeDasharray="3 3" label={{ value: '底部区', fill: 'red', fontSize: 10, position: 'right' }}/>
               
               <Area type="monotone" dataKey="hdy" name="风险值" stroke="#06b6d4" fillOpacity={1} fill="url(#colorHdy)" isAnimationActive={false} />
               
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
