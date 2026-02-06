import React, { useState, useEffect } from 'react';
import { TabType, ETFOption, StockDataPoint } from './types';
import { fetchVolumeData, fetchBondData, fetchBacktestData } from './services';
import { VolumeView } from './components/VolumeView.tsx';
import { BondView } from './components/BondView.tsx';
import { BacktestView } from './components/BacktestView.tsx';
import { TopBottomView } from './components/TopBottomView.tsx';
import { Activity, BarChart2, TrendingUp, Layers, ArrowUpCircle } from 'lucide-react';

const ETF_OPTIONS: ETFOption[] = [
  { label: '上证指数 (大盘基准)', value: '1.000001' },
  { label: '沪深300 (核心蓝筹)', value: '1.510300' },
  { label: '创业板指 (成长风格)', value: '0.159915' },
  { label: '科创50 (硬科技)', value: '1.588000' },
  { label: '证券ETF (牛市旗手)', value: '1.512880' },
  { label: '半导体ETF (科技渣男)', value: '1.512480' },
  { label: '上证50 (超大盘)', value: '1.510050' },
  { label: '中证500 (中小盘)', value: '1.510500' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.VOLUME);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<StockDataPoint[]>([]);
  const [selectedEtf, setSelectedEtf] = useState<string>('1.000001');

  // Load data when tab or ETF changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        let result: StockDataPoint[] = [];
        switch (activeTab) {
          case TabType.VOLUME:
          case TabType.SIGNAL:
            result = await fetchVolumeData();
            break;
          case TabType.BOND:
            result = await fetchBondData();
            break;
          case TabType.BACKTEST:
          case TabType.TOPBOTTOM:
            result = await fetchBacktestData(selectedEtf);
            break;
        }
        setData(result);
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activeTab, selectedEtf]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 animate-pulse">
           <Activity size={48} className="mb-4" />
           <p>正在分析市场数据...</p>
        </div>
      );
    }
    
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[500px] text-slate-400">
           <p>暂无数据，请检查网络连接。</p>
        </div>
      );
    }

    switch (activeTab) {
      case TabType.VOLUME:
        return <VolumeView data={data} />;
      case TabType.BOND:
        return <BondView data={data} />;
      case TabType.SIGNAL:
        return <VolumeView data={data} showSignals={true} />;
      case TabType.BACKTEST:
        return <BacktestView data={data} />;
      case TabType.TOPBOTTOM:
        return <TopBottomView data={data} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <BarChart2 className="text-red-500" /> 
             A股深度复盘系统
           </h1>
           <p className="text-slate-500 text-sm mt-1">实时量化分析 / 股债模型 / 策略回测</p>
        </div>
        
        <div className="flex items-center gap-2 text-xs font-mono bg-white px-3 py-1.5 rounded border border-slate-200">
          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
          {isLoading ? '同步中...' : '已连接'}
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <nav className="flex overflow-x-auto pb-2 md:pb-0 gap-2 no-scrollbar">
          {[
            { id: TabType.VOLUME, label: '量价复盘', icon: BarChart2 },
            { id: TabType.BOND, label: '股债模型', icon: Layers },
            { id: TabType.SIGNAL, label: '量能信号', icon: Activity },
            { id: TabType.BACKTEST, label: '策略回测', icon: TrendingUp },
            { id: TabType.TOPBOTTOM, label: '顶底指标', icon: ArrowUpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                  ${isActive 
                    ? 'bg-slate-900 text-white shadow-md transform scale-105' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'}
                `}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {(activeTab === TabType.BACKTEST || activeTab === TabType.TOPBOTTOM) && (
          <div className="md:ml-auto">
            <select 
              value={selectedEtf} 
              onChange={(e) => setSelectedEtf(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-slate-500 focus:border-slate-500 block w-full p-2.5 shadow-sm"
            >
              {ETF_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <main className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-1 overflow-hidden">
        <div className="h-[600px] w-full p-4">
          {renderContent()}
        </div>
      </main>
      
      <footer className="mt-6 text-center text-xs text-slate-400">
        数据来源：东方财富 (Eastmoney) | 仅供参考，不构成投资建议 | 市场有风险，投资需谨慎
      </footer>
    </div>
  );
};

export default App;
