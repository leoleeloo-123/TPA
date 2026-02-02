import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import { CityNetwork, Language } from '../types';
import { MapPin, Download, AlertCircle, RefreshCw } from 'lucide-react';

interface HeatmapViewProps {
  networks: CityNetwork[];
  lang: Language;
  metric: string;
}

const GEO_COORDS: Record<string, [number, number]> = {
  '北京': [116.4074, 39.9042],
  '上海': [121.4737, 31.2304],
  '广州': [113.2644, 23.1291],
  '深圳': [114.0579, 22.5431],
  '成都': [104.0665, 30.5723],
  '杭州': [120.1536, 30.2875],
  '武汉': [114.3054, 30.5931],
  '西安': [108.9402, 34.3416],
  '南京': [118.7966, 32.0594],
  '重庆': [106.5516, 29.5630],
  '天津': [117.1902, 39.1256],
  '沈阳': [123.4294, 41.7968],
  '哈尔滨': [126.6425, 45.7569],
  '青岛': [120.3826, 36.0671],
  '大连': [121.6147, 38.9140],
  '苏州': [120.6196, 31.2994],
  '厦门': [118.0894, 24.4798],
  '长沙': [112.9388, 28.2280],
  '昆明': [102.7123, 25.0406],
  '乌鲁木齐': [87.6177, 43.7928],
  '拉萨': [91.1322, 29.6604],
  '呼和浩特': [111.6708, 40.8183],
  '福州': [119.2965, 26.0745],
  '南宁': [108.3200, 22.8240],
  '海口': [110.3312, 20.0319],
};

// Priority list of GeoJSON sources
const MAP_SOURCES = [
  'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
  'https://cdn.jsdelivr.net/gh/apache/echarts-website@asf-site/examples/data/asset/geo/china.json',
  'https://raw.githubusercontent.com/apache/echarts/master/test/data/map/json/china.json'
];

const HeatmapView: React.FC<HeatmapViewProps> = ({ networks = [], lang, metric }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedCity, setSelectedCity] = useState<CityNetwork | null>(null);
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null);
  const [isMapRegistered, setIsMapRegistered] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const maxVal = useMemo(() => {
    if (!networks || networks.length === 0) return 1;
    const vals = networks.map(n => Number((n as any)[metric]) || 0);
    return Math.max(...vals, 1);
  }, [networks, metric]);

  const loadMapData = async () => {
    setLoading(true);
    setMapError(null);
    
    // Check if already registered
    if (echarts.getMap('china')) {
      setIsMapRegistered(true);
      setLoading(false);
      return;
    }

    let loaded = false;
    for (const source of MAP_SOURCES) {
      try {
        const response = await fetch(source, { mode: 'cors' });
        if (!response.ok) throw new Error(`Source ${source} failed`);
        const geoJson = await response.json();
        echarts.registerMap('china', geoJson);
        loaded = true;
        break;
      } catch (err) {
        console.warn(`Attempt with ${source} failed, trying next...`);
      }
    }

    if (loaded) {
      setIsMapRegistered(true);
      setMapError(null);
    } else {
      setMapError('All GIS data sources are unreachable. Check your network or VPN.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!chartRef.current) return;
    const myChart = echarts.init(chartRef.current);
    setChartInstance(myChart);
    
    loadMapData();

    const handleResize = () => myChart.resize();
    window.addEventListener('resize', handleResize);

    myChart.on('click', (params: any) => {
      if (params.componentType === 'series' && (params.seriesType === 'scatter' || params.seriesType === 'effectScatter')) {
        const cityData = networks.find(n => n.cityName === params.name);
        if (cityData) setSelectedCity(cityData);
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      myChart.dispose();
    };
  }, []);

  useEffect(() => {
    if (chartInstance && isMapRegistered) {
      updateChart(chartInstance);
    }
  }, [networks, metric, lang, chartInstance, isMapRegistered, maxVal]);

  const updateChart = (instance: echarts.ECharts) => {
    const validNetworks = networks || [];
    const scatterData = validNetworks.map(n => {
      const coords = GEO_COORDS[n.cityName];
      return {
        name: n.cityName,
        value: coords ? [...coords, Number((n as any)[metric]) || 0] : undefined
      };
    }).filter(d => d.value !== undefined);

    const option: any = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `${params.name}: ${params.value[2]}`
      },
      visualMap: {
        min: 0,
        max: maxVal,
        left: 'left',
        top: 'bottom',
        text: [lang === Language.ZH ? '高' : 'High', lang === Language.ZH ? '低' : 'Low'],
        calculable: true,
        inRange: {
          color: ['#f0f9ff', '#60a5fa', '#1e3a8a']
        },
        padding: [20, 20, 40, 40],
        textStyle: { fontWeight: '800', fontSize: 10, color: '#64748b' }
      },
      geo: {
        map: 'china',
        roam: false,
        zoom: 1.15,
        emphasis: {
          label: { show: false },
          itemStyle: { areaColor: '#f1f5f9' }
        },
        itemStyle: {
          areaColor: '#f8fafc',
          borderColor: '#cbd5e1',
          borderWidth: 1.2
        }
      },
      series: [
        {
          name: 'City Dots',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: scatterData,
          symbolSize: (val: any) => 10 + (val[2] / maxVal) * 20,
          encode: { value: 2 },
          label: { show: false },
          emphasis: { label: { show: true, position: 'right', formatter: '{b}' } },
          itemStyle: {
            color: '#3b82f6',
            shadowBlur: 10,
            shadowColor: 'rgba(59, 130, 246, 0.3)'
          }
        },
        {
          name: 'Core Hubs',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: scatterData.filter(d => d.value![2] / maxVal > 0.65),
          symbolSize: (val: any) => 15 + (val[2] / maxVal) * 25,
          showEffectOn: 'render',
          rippleEffect: { brushType: 'stroke', scale: 3 },
          label: {
            formatter: '{b}',
            position: 'right',
            show: true,
            fontWeight: '900',
            fontSize: 12,
            color: '#0f172a',
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: [4, 8],
            borderRadius: 6,
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.1)'
          },
          itemStyle: {
            color: '#1d4ed8',
            shadowBlur: 20,
            shadowColor: 'rgba(29, 78, 216, 0.4)'
          },
          zlevel: 1
        }
      ]
    };

    instance.setOption(option, true);
  };

  const handleExport = () => {
    if (!chartInstance) return;
    const url = chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 4,
      backgroundColor: '#ffffff'
    });
    const link = document.createElement('a');
    link.href = url;
    link.download = `TPA_Network_Export_${new Date().getTime()}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
            {lang === Language.ZH ? '医疗服务网络热力分布' : 'Medical Network Heatmap'}
          </h2>
          <p className="text-slate-500 text-sm mt-3 font-medium">
            {lang === Language.ZH ? '基于 Apache ECharts 官方地理图层构建' : 'Engineered with official Apache ECharts geospatial layers'}
          </p>
        </div>
        <div className="flex gap-4">
           {mapError && (
              <button 
                onClick={loadMapData}
                className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {lang === Language.ZH ? '重新加载地图' : 'Retry GIS'}
              </button>
           )}
           <button 
            onClick={handleExport}
            className="px-8 py-3.5 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition shadow-2xl flex items-center gap-3 active:scale-95"
          >
            <Download className="w-4 h-4" />
            {lang === Language.ZH ? '生成 PPT 资产' : 'Generate PPT Asset'}
          </button>
        </div>
      </div>

      <div className="flex gap-10 flex-1 overflow-hidden min-h-[750px]">
        {/* MAP CONTAINER */}
        <div className="relative flex-1 bg-white border border-slate-200 rounded-[3rem] shadow-sm flex items-center justify-center p-12 overflow-hidden group">
          {loading && (
            <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-2xl" />
              <div className="text-center">
                 <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-800">{lang === Language.ZH ? '同步地理信息...' : 'Syncing GIS Layers'}</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">WGS-84 Projection System</p>
              </div>
            </div>
          )}
          
          {mapError && (
            <div className="absolute inset-0 z-30 bg-white flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-red-50 p-8 rounded-[2rem] border border-red-100 flex flex-col items-center max-w-sm">
                <AlertCircle className="w-16 h-16 text-red-500 mb-6 animate-pulse" />
                <h4 className="text-xl font-black text-slate-900 mb-3">{lang === Language.ZH ? '地图数据不可用' : 'GIS Data Unavailable'}</h4>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                  {lang === Language.ZH ? '无法从公共 CDN 节点拉取行政地图包。请检查您的网络连接或尝试点击重新加载。' : 'Failed to fetch administrative map from public CDNs. Please check your connection or retry.'}
                </p>
                <button 
                  onClick={loadMapData}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition"
                >
                  {lang === Language.ZH ? '手动重试同步' : 'Retry Sync'}
                </button>
              </div>
            </div>
          )}

          <div ref={chartRef} className={`w-full h-full transition-opacity duration-1000 ${loading || mapError ? 'opacity-0' : 'opacity-100'}`} />
          
          {isMapRegistered && !loading && (
            <div className="absolute top-10 left-10 pointer-events-none">
              <div className="bg-slate-900/5 backdrop-blur px-5 py-3 rounded-2xl border border-slate-200/50 flex items-center gap-4 group-hover:bg-white/90 group-hover:shadow-2xl transition-all duration-500">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Geo-Layer: China Master Projection</span>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="w-[440px] flex flex-col gap-6 shrink-0">
          <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm flex-1 flex flex-col relative overflow-hidden group/sidebar">
            {selectedCity ? (
              <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col h-full">
                <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-10">
                   <div>
                    <h3 className="text-6xl font-black text-slate-900 leading-none tracking-tighter">
                      {lang === Language.ZH ? selectedCity.cityName : (selectedCity.cityNameEn || selectedCity.cityName)}
                    </h3>
                    <div className="flex items-center gap-3 mt-6">
                       <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                        <MapPin className="w-3.5 h-3.5" />
                       </div>
                       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {lang === Language.ZH ? selectedCity.region : (selectedCity.regionEn || selectedCity.region)}
                      </span>
                    </div>
                   </div>
                </div>

                <div className="space-y-12">
                  <div className="relative p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 overflow-hidden">
                    <p className="text-blue-600/60 text-[10px] font-black uppercase tracking-[0.3em] mb-4">{lang === Language.ZH ? '直付合作机构' : 'Providers'}</p>
                    <div className="flex items-baseline gap-4 relative z-10">
                       <p className="text-9xl font-black text-blue-700 tabular-nums leading-none tracking-tighter">{selectedCity.directPayCount}</p>
                       <span className="text-sm font-black text-blue-400 uppercase tracking-widest">UNITS</span>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-2xl transition-all duration-500">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Public Prem.</p>
                      <p className="text-4xl font-black text-slate-900 tabular-nums">{selectedCity.publicPremiumCount}</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-2xl transition-all duration-500">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Private</p>
                      <p className="text-4xl font-black text-slate-900 tabular-nums">{selectedCity.privateCount}</p>
                    </div>
                  </div>

                  <div className={`p-8 rounded-[2rem] border flex items-center justify-between transition-all duration-700 ${selectedCity.hasRepresentative === '是' ? 'bg-emerald-50 border-emerald-100 shadow-[0_20px_40px_rgba(16,185,129,0.1)]' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex-1">
                      <p className={`font-black text-xs uppercase tracking-widest mb-2 ${selectedCity.hasRepresentative === '是' ? 'text-emerald-700' : 'text-slate-500'}`}>{lang === Language.ZH ? '驻院代表覆盖' : 'On-site Rep'}</p>
                      <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{lang === Language.ZH ? '支持现场口译及直付结算协助' : 'Providing direct claim processing support'}</p>
                    </div>
                    <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center font-black text-sm shadow-xl transition-transform duration-700 group-hover/sidebar:rotate-6 ${selectedCity.hasRepresentative === '是' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {selectedCity.hasRepresentative === '是' ? 'YES' : 'NO'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-pulse">
                <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-12 shadow-inner border border-slate-100">
                   <MapPin className="w-14 h-14 text-slate-200" />
                </div>
                <h4 className="text-3xl font-black text-slate-300 mb-4 tracking-tighter uppercase">{lang === Language.ZH ? '待选观测节点' : 'Awaiting Selection'}</h4>
                <p className="text-slate-300 text-xs font-black max-w-[280px] leading-relaxed uppercase tracking-[0.3em]">
                  {lang === Language.ZH ? '交互式地图节点激活后可见详细覆盖指标' : 'Interactive Map Nodes Activation Required'}
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-slate-950 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
             <div className="relative z-10">
                <h4 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.5em] mb-10">{lang === Language.ZH ? '实时网络覆盖指数' : 'Global Coverage Index'}</h4>
                <div className="space-y-10">
                  <div className="flex justify-between items-end border-b border-white/5 pb-8 group">
                    <span className="text-slate-500 text-xs font-black uppercase tracking-widest">{lang === Language.ZH ? '深度覆盖城市' : 'Hub Cities'}:</span>
                    <span className="text-6xl font-black tabular-nums tracking-tighter leading-none group-hover:text-blue-500 transition-colors">{networks.length}</span>
                  </div>
                  <div className="flex justify-between items-end pb-2 group">
                    <span className="text-slate-500 text-xs font-black uppercase tracking-widest">{lang === Language.ZH ? '直付网络规模' : 'Network Cap'}:</span>
                    <span className="text-7xl font-black tabular-nums tracking-tighter leading-none text-blue-600 group-hover:text-white transition-all">{networks.reduce((acc, curr) => acc + (Number(curr.directPayCount) || 0), 0)}</span>
                  </div>
                </div>
             </div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapView;