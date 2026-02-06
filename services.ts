import localforage from 'localforage';
import { jsonp } from './utils';
import { StockDataPoint } from './types';

// Initialize LocalForage
localforage.config({
  name: 'AShareAnalystPro',
  storeName: 'market_data_cache_v2' // Updated store name to force refresh
});

const API_BASE = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
const BASE_PARAMS = 'fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f57&klt=101&fqt=1';

/**
 * Fetch raw kline data from Eastmoney
 * @param secid Stock ID (e.g. "1.000001")
 * @param startDate Optional YYYY-MM-DD string. If provided, fetches data starting from this date.
 */
const fetchRawKlines = async (secid: string, startDate?: string): Promise<string[]> => {
  // If startDate is present, convert to YYYYMMDD, else default to '20050101' for "longest" history
  const beg = startDate ? startDate.replace(/-/g, '') : '20050101';
  // Use a large limit to ensure we get all data if initial fetch
  const url = `${API_BASE}?${BASE_PARAMS}&secid=${secid}&beg=${beg}&end=20500101&lmt=100000`;

  try {
    const res = await jsonp(url);
    if (res && res.data && res.data.klines) {
      return res.data.klines;
    }
  } catch (e) {
    console.error(`Fetch failed for ${secid}`, e);
  }
  return [];
};

/**
 * Generic function to sync data: Load Cache -> Fetch New -> Merge -> Save
 */
const syncData = async (
  key: string,
  fetchFn: (startDate: string | undefined) => Promise<StockDataPoint[]>
): Promise<StockDataPoint[]> => {
  try {
    // 1. Try to load from cache
    const cached = await localforage.getItem<StockDataPoint[]>(key) || [];
    
    // 2. Determine start date for incremental fetch
    let lastDate: string | undefined;
    if (cached.length > 0) {
      lastDate = cached[cached.length - 1].date;
    }

    // 3. Fetch new data starting from last cached date
    const newData = await fetchFn(lastDate);
    
    // 4. Merge logic
    if (newData.length === 0) return cached;

    let finalData = cached;
    if (lastDate) {
      // API 'beg' is inclusive, so we filter out records that are <= last cached date to avoid duplicates
      const freshData = newData.filter(d => d.date > lastDate!);
      if (freshData.length > 0) {
        finalData = [...cached, ...freshData];
        // 5. Update cache only if we have new data
        await localforage.setItem(key, finalData);
      }
    } else {
      // Initial fetch case
      finalData = newData;
      await localforage.setItem(key, finalData);
    }
    
    return finalData;

  } catch (e) {
    console.error("Cache sync failed", e);
    // Fallback: try to fetch everything without cache
    return fetchFn(undefined);
  }
};

export const fetchVolumeData = async (): Promise<StockDataPoint[]> => {
  return syncData('volume_data_v2', async (startDate) => {
    // Fetch both SH and SZ markets
    const [linesSH, linesSZ] = await Promise.all([
      fetchRawKlines('1.000001', startDate),
      fetchRawKlines('0.399001', startDate)
    ]);

    if (!linesSH.length) return [];

    const szMap = new Map<string, number>();
    linesSZ.forEach((line) => {
      const p = line.split(',');
      if (p.length > 5) {
        const vol = parseFloat(p[5]);
        if (!isNaN(vol)) szMap.set(p[0], vol);
      }
    });

    const result: StockDataPoint[] = [];
    linesSH.forEach((line) => {
      const p = line.split(',');
      if (p.length > 5) {
        const date = p[0];
        const close = parseFloat(p[2]);
        const shVol = parseFloat(p[5]);
        const szVol = szMap.get(date) || 0;

        if (!isNaN(close) && !isNaN(shVol)) {
          result.push({
            date: date,
            close: close,
            volume: parseFloat(((shVol + szVol) / 1000000000000).toFixed(4))
          });
        }
      }
    });
    return result;
  });
};

export const fetchBondData = async (): Promise<StockDataPoint[]> => {
  return syncData('bond_data_v2', async (startDate) => {
    const [linesStock, linesBond] = await Promise.all([
      fetchRawKlines('1.000001', startDate),
      fetchRawKlines('1.511090', startDate)
    ]);

    const etfMap = new Map<string, number>();
    linesBond.forEach((l) => {
      const p = l.split(',');
      if (p.length > 2) {
        const val = parseFloat(p[2]);
        if (!isNaN(val)) etfMap.set(p[0], val);
      }
    });

    const result: StockDataPoint[] = [];
    linesStock.forEach((line) => {
      const p = line.split(',');
      if (p.length > 2) {
        const date = p[0];
        const stockIdx = parseFloat(p[2]);
        const bondPrice = etfMap.get(date);

        if (!isNaN(stockIdx)) {
          result.push({
            date: date,
            close: stockIdx,
            volume: 0,
            bondPrice: bondPrice || 0
          });
        }
      }
    });
    return result;
  });
};

export const fetchBacktestData = async (secid: string): Promise<StockDataPoint[]> => {
  return syncData(`backtest_${secid}_v2`, async (startDate) => {
    const lines = await fetchRawKlines(secid, startDate);
    
    const result: StockDataPoint[] = [];
    lines.forEach((line) => {
      const p = line.split(',');
      if (p.length > 5) {
        const date = p[0];
        const open = parseFloat(p[1]);
        const close = parseFloat(p[2]);
        const high = parseFloat(p[3]);
        const low = parseFloat(p[4]);
        const volume = parseFloat(p[5]);

        if (!isNaN(close) && !isNaN(high) && !isNaN(low)) {
          result.push({ date, open, close, high, low, volume });
        }
      }
    });
    return result;
  });
};