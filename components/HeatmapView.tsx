import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import { CityNetwork, Language } from '../types';
import { MapPin, Download, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { CITY_COORDINATES } from '../constants';

interface HeatmapViewProps {
  networks: CityNetwork[];
  lang: Language;
  metric: string;
}

// Optimized list of GeoJSON sources including npm mirrors
const MAP_SOURCES = [
  'https://cdn.jsdelivr.net/npm/echarts-china-geo-json@1.0.2/china.json',
  'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
  'https://fastly.jsdelivr.net/gh/apache/echarts-website@asf-site/examples/data/asset/geo/china.json'
];

const HeatmapView: React.FC<HeatmapViewProps> = ({ networks = [], lang, metric }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedCity, setSelectedCity] = useState<CityNetwork | null>(null);
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null);
  const [isMapRegistered, setIsMapRegistered] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  const maxVal = useMemo(() => {
    if (!networks || networks.length === 0) return 1;
    const vals = networks.map(n => Number((n as any)[metric]) || 0);
    return Math.max(...vals, 1);
  }, [networks, metric]);

  const loadMapData = async () => {
    setLoading(true);
    setMapError(null);
    setUseFallback(false);
    
    if (echarts.getMap('china')) {
      setIsMapRegistered(true);
      setLoading(false);
      return;
    }

    let loaded = false;
    for (const source of MAP_SOURCES) {
      try {
        const response = await fetch(source);
        if (!response.ok) throw new Error(`Source failed`);
        const geoJson = await response.json();
        echarts.registerMap('china', geoJson);
        loaded = true;
        break;
      } catch (err) {
        console.warn(`Map source ${source} failed, retrying...`);
      }
    }

    if (loaded) {
      setIsMapRegistered(true);
    } else {
      setMapError('GIS Server Unreachable');
      setUseFallback(true); // Activate Schematic Fallback Mode
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
      if (params.componentType === 'series') {
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
    if (chartInstance) {
      if (useFallback) {
        renderFallbackChart(chartInstance);
      } else if (isMapRegistered) {
        renderGisChart(chartInstance);
      }
    }
  }, [networks, metric, lang, chartInstance, isMapRegistered, useFallback, maxVal]);

  // Standard GIS Map Rendering
  const renderGisChart = (instance: echarts.ECharts) => {
    const validNetworks = networks || [];
    const scatterData = validNetworks.map(n => {
      const coords = (CITY_COORDINATES[n.cityName] ? [
        100 + (CITY_COORDINATES[n.cityName].x / 100) * 20, 
        20 + (CITY_COORDINATES[n.cityName].y / 100) * 30 
      ] : [0,0]); 
      // Note: Real GIS uses Lon/Lat, we use our mapping as reliable fallback inside the series
      // But for Geo Map, we need specific Lon/Lat
      const lonLatMap: Record<string, [number, number]> = {
        '北京': [116.40, 39.90], '上海': [121.47, 31.23], '广州': [113.26, 23.12],
        '深圳': [114.05, 22.54], '成都': [104.06, 30.57], '杭州': [120.15, 30.28],
        '武汉': [114.30, 30.59], '西安': [108.94, 34.34], '南京': [118.79, 32.05],
        '重庆': [106.55, 29.56], '天津': [117.19, 39.12], '苏州': [120.61, 31.29],
        '厦门': [118.08, 24.47], '昆明': [102.71, 25.04], '乌鲁木齐': [87.61, 43.79]
      };
      
      return {
        name: n.cityName,
        value: lonLatMap[n.cityName] ? [...lonLatMap[n.cityName], Number((n as any)[metric]) || 0] : undefined
      };
    }).filter(d => d.value !== undefined);

    const option = {
      backgroundColor: 'transparent',
      visualMap: {
        min: 0, max: maxVal, left: 30, bottom: 30, calculable: true,
        inRange: { color: ['#eff6ff', '#3b82f6', '#1e3a8a'] },
        textStyle: { fontWeight: '800', color: '#64748b' }
      },
      geo: {
        map: 'china', roam: false, zoom: 1.15,
        itemStyle: { areaColor: '#f8fafc', borderColor: '#cbd5e1', borderWidth: 1.2 },
        emphasis: { itemStyle: { areaColor: '#f1f5f9' }, label: { show: false } }
      },
      series: [
        {
          type: 'scatter', coordinateSystem: 'geo', data: scatterData,
          symbolSize: (val: any) => 12 + (val[2] / maxVal) * 25,
          itemStyle: { color: '#3b82f6', shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)' }
        },
        {
          type: 'effectScatter', coordinateSystem: 'geo', 
          data: scatterData.filter(d => d.value![2] / maxVal > 0.6),
          symbolSize: (val: any) => 15 + (val[2] / maxVal) * 30,
          showEffectOn: 'render', rippleEffect: { brushType: 'stroke', scale: 3 },
          label: { show: true, position: 'right', formatter: '{b}', fontWeight: '900', color: '#0f172a' },
          itemStyle: { color: '#1d4ed8' }, zlevel: 1
        }
      ]
    };
    instance.setOption(option, true);
  };

  // Schematic Fallback Rendering (Scatter Plot without Geo Layer)
  const renderFallbackChart = (instance: echarts.ECharts) => {
    const validNetworks = networks || [];
    const data = validNetworks.map(n => {
      const coord = CITY_COORDINATES[n.cityName] || { x: Math.random() * 100, y: Math.random() * 100 };
      return {
        name: n.cityName,
        value: [coord.x, 100 - coord.y, Number((n as any)[metric]) || 0]
      };
    });

    const option = {
      backgroundColor: 'transparent',
      grid: { top: '15%', bottom: '15%', left: '10%', right: '10%' },
      xAxis: { show: false, min: 0, max: 100 },
      yaxis: { show: false, min: 0, max: 100 },
      visualMap: {
        min: 0, max: maxVal, left: 30, bottom: 30,
        inRange: { color: ['#eff6ff', '#3b82f6', '#1e3a8a'] }
      },
      series: [{
        type: 'scatter',
        data: data,
        symbolSize: (val: any) => 15 + (val[2] / maxVal) * 40,
        label: { show: true, position: 'top', formatter: '{b}', fontWeight: '900', color: '#334155' },
        itemStyle: { shadowBlur: 20, shadowColor: 'rgba(59, 130, 246, 0.4)' }
      }]
    };
    instance.setOption(option, true);
  };

  const handleExport = () => {
    if (!chartInstance) return;
    const url = chartInstance.getDataURL({ type: 'png', pixelRatio: 4, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.href = url;
    link.download = `TPA_Heatmap_Export_${new Date().getTime()}.png`;
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
            {useFallback 
              ? (lang === Language.ZH ? '示意图模式：GIS 连接受限，已切换至结构化坐标投影' : 'Schematic Mode: GIS restricted, switched to coordinate projection')
              : (lang === Language.ZH ? '权威地理图层叠加 Excel 实时业务数据' : 'Official GIS layers overlaid with real-time Excel data')}
          </p>
        </div>
        <div className="flex gap-4">
           {useFallback && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <Layers className="w-3.5 h-3.5" />
                Fallback Active
              </div>
           )}
           <button 
            onClick={loadMapData}
            className="p-3.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition active:scale-90"
            title="Refresh GIS"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
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
        <div className={`relative flex-1 bg-white border rounded-[3rem] shadow-sm flex items-center justify-center p-12 overflow-hidden transition-all duration-1000 ${useFallback ? 'border-amber-200 bg-slate-50/30' : 'border-slate-200'}`}>
          {loading && (
            <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-2xl" />
              <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-800 animate-pulse">{lang === Language.ZH ? '正在同步地理图层' : 'Syncing Geo Layers'}</p>
            </div>
          )}
          
          <div ref={chartRef} className="w-full h-full" />
          
          {!loading && !useFallback && (
            <div className="absolute top-10 left-10 pointer-events-none">
              <div className="bg-white/90 backdrop-blur px-5 py-3 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-4">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">GIS Level: Administrative</span>
              </div>
            </div>
          )}

          {useFallback && (
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
               <Layers className="w-[600px] h-[600px] text-slate-950" />
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="w-[440px] flex flex-col gap-6 shrink-0">
          <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm flex-1 flex flex-col relative overflow-hidden">
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
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white transition-all duration-500">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Public Prem.</p>
                      <p className="text-4xl font-black text-slate-900 tabular-nums">{selectedCity.publicPremiumCount}</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white transition-all duration-500">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Private</p>
                      <p className="text-4xl font-black text-slate-900 tabular-nums">{selectedCity.privateCount}</p>
                    </div>
                  </div>

                  <div className={`p-8 rounded-[2rem] border flex items-center justify-between transition-all duration-700 ${selectedCity.hasRepresentative === '是' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex-1">
                      <p className={`font-black text-xs uppercase tracking-widest mb-2 ${selectedCity.hasRepresentative === '是' ? 'text-emerald-700' : 'text-slate-500'}`}>{lang === Language.ZH ? '驻院代表覆盖' : 'On-site Rep'}</p>
                      <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{lang === Language.ZH ? '支持现场口译及直付结算协助' : 'Direct claim support active'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-12 shadow-inner border border-slate-100">
                   <MapPin className="w-14 h-14 text-slate-200" />
                </div>
                <h4 className="text-3xl font-black text-slate-300 mb-4 tracking-tighter uppercase">{lang === Language.ZH ? '待激活节点' : 'Awaiting Data'}</h4>
                <p className="text-slate-300 text-xs font-black max-w-[280px] leading-relaxed uppercase tracking-[0.3em]">
                  {lang === Language.ZH ? '点击地图热力点以激活数据透视' : 'Interact with map nodes to reveal stats'}
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-slate-950 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
             <div className="relative z-10">
                <h4 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.5em] mb-10">{lang === Language.ZH ? '全国指数统计' : 'National Index'}</h4>
                <div className="space-y-10">
                  <div className="flex justify-between items-end border-b border-white/5 pb-8 group">
                    <span className="text-slate-500 text-xs font-black uppercase tracking-widest">{lang === Language.ZH ? '覆盖城市' : 'Cities'}:</span>
                    <span className="text-6xl font-black tabular-nums tracking-tighter leading-none">{networks.length}</span>
                  </div>
                  <div className="flex justify-between items-end group">
                    <span className="text-slate-500 text-xs font-black uppercase tracking-widest">{lang === Language.ZH ? '机构总数' : 'Providers'}:</span>
                    <span className="text-7xl font-black tabular-nums tracking-tighter leading-none text-blue-600">{networks.reduce((acc, curr) => acc + (Number(curr.directPayCount) || 0), 0)}</span>
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