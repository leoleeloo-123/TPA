import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import { CityNetwork, Language } from '../types';
import { MapPin, Download, RefreshCw, Layers, Info, Share2 } from 'lucide-react';
import { CITY_COORDINATES } from '../constants';

interface HeatmapViewProps {
  networks: CityNetwork[];
  lang: Language;
  metric: string;
}

// 针对全球/美国 IP 优化的多源镜像
const MAP_SOURCES = [
  'https://unpkg.com/echarts-china-geo-json@1.0.2/china.json', // 美国/全球访问极佳
  'https://cdn.jsdelivr.net/npm/echarts-china-geo-json@1.0.2/china.json',
  'https://fastly.jsdelivr.net/npm/echarts-china-geo-json@1.0.2/china.json',
  'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'
];

const HeatmapView: React.FC<HeatmapViewProps> = ({ networks = [], lang, metric }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedCity, setSelectedCity] = useState<CityNetwork | null>(null);
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null);
  const [isMapRegistered, setIsMapRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  const maxVal = useMemo(() => {
    if (!networks || networks.length === 0) return 1;
    const vals = networks.map(n => Number((n as any)[metric]) || 0);
    return Math.max(...vals, 1);
  }, [networks, metric]);

  const loadMapData = async () => {
    setLoading(true);
    setUseFallback(false);
    
    if (echarts.getMap('china')) {
      setIsMapRegistered(true);
      setLoading(false);
      return;
    }

    let loaded = false;
    for (const source of MAP_SOURCES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
        const response = await fetch(source, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error();
        const geoJson = await response.json();
        echarts.registerMap('china', geoJson);
        loaded = true;
        console.log(`Success: Map loaded from ${source}`);
        break;
      } catch (err) {
        console.warn(`Retry: Map source ${source} unavailable.`);
      }
    }

    if (loaded) {
      setIsMapRegistered(true);
    } else {
      setUseFallback(true);
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

  const renderGisChart = (instance: echarts.ECharts) => {
    const lonLatMap: Record<string, [number, number]> = {
      '北京': [116.40, 39.90], '上海': [121.47, 31.23], '广州': [113.26, 23.12],
      '深圳': [114.05, 22.54], '成都': [104.06, 30.57], '杭州': [120.15, 30.28],
      '武汉': [114.30, 30.59], '西安': [108.94, 34.34], '南京': [118.79, 32.05],
      '重庆': [106.55, 29.56], '天津': [117.19, 39.12], '苏州': [120.61, 31.29],
      '厦门': [118.08, 24.47], '昆明': [102.71, 25.04], '乌鲁木齐': [87.61, 43.79],
      '哈尔滨': [126.63, 45.75], '沈阳': [123.42, 41.79], '青岛': [120.33, 36.07],
      '长沙': [112.98, 28.11], '大连': [121.61, 38.91],
      '福州': [119.30, 26.08], '南宁': [108.32, 22.82], '海口': [110.33, 20.02]
    };

    const scatterData = networks.map(n => ({
      name: n.cityName,
      value: lonLatMap[n.cityName] ? [...lonLatMap[n.cityName], Number((n as any)[metric]) || 0] : undefined
    })).filter(d => d.value !== undefined);

    const option = {
      backgroundColor: 'transparent',
      visualMap: {
        min: 0, max: maxVal, left: 40, bottom: 40, calculable: true,
        inRange: { color: ['#eff6ff', '#3b82f6', '#1e3a8a'] },
        textStyle: { fontWeight: '800', color: '#64748b' }
      },
      geo: {
        map: 'china', roam: false, zoom: 1.15,
        itemStyle: { areaColor: '#f1f5f9', borderColor: '#cbd5e1', borderWidth: 1.5 },
        emphasis: { itemStyle: { areaColor: '#e2e8f0' }, label: { show: false } }
      },
      series: [
        {
          type: 'scatter', coordinateSystem: 'geo', data: scatterData,
          symbolSize: (val: any) => 12 + (val[2] / maxVal) * 28,
          itemStyle: { color: '#3b82f6', shadowBlur: 15, shadowColor: 'rgba(59,130,246,0.3)' }
        },
        {
          type: 'effectScatter', coordinateSystem: 'geo', 
          data: scatterData.filter(d => d.value![2] / maxVal > 0.6),
          symbolSize: (val: any) => 18 + (val[2] / maxVal) * 35,
          showEffectOn: 'render', rippleEffect: { brushType: 'stroke', scale: 4 },
          label: { show: true, position: 'right', formatter: '{b}', fontWeight: '900', color: '#0f172a', fontSize: 14 },
          itemStyle: { color: '#1d4ed8' }, zlevel: 1
        }
      ]
    };
    instance.setOption(option, true);
  };

  // 强化版 Fallback：模拟“数字化网络拓扑”
  const renderFallbackChart = (instance: echarts.ECharts) => {
    const data = networks.map(n => {
      const coord = CITY_COORDINATES[n.cityName] || { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 };
      return {
        name: n.cityName,
        value: [coord.x, 100 - coord.y, Number((n as any)[metric]) || 0]
      };
    });

    // 建立核心枢纽链路（北上广深成）
    const hubLinks = [
      { source: '北京', target: '上海' },
      { source: '北京', target: '成都' },
      { source: '上海', target: '广州' },
      { source: '广州', target: '成都' },
      { source: '广州', target: '深圳' }
    ].map(link => {
      const s = CITY_COORDINATES[link.source];
      const t = CITY_COORDINATES[link.target];
      if (!s || !t) return null;
      return { coords: [[s.x, 100 - s.y], [t.x, 100 - t.y]] };
    }).filter(Boolean);

    const option = {
      backgroundColor: 'transparent',
      grid: { top: '10%', bottom: '10%', left: '10%', right: '10%' },
      xAxis: { show: false, min: 0, max: 100 },
      yAxis: { show: false, min: 0, max: 100 },
      visualMap: {
        min: 0, max: maxVal, left: 40, bottom: 40,
        inRange: { color: ['#eff6ff', '#3b82f6', '#1e3a8a'] }
      },
      series: [
        {
          type: 'lines',
          coordinateSystem: 'cartesian2d',
          data: hubLinks,
          lineStyle: { color: '#e2e8f0', width: 2, type: 'dashed', curveness: 0.2 },
          z: 1
        },
        {
          type: 'scatter',
          coordinateSystem: 'cartesian2d',
          data: data,
          symbolSize: (val: any) => 20 + (val[2] / maxVal) * 50,
          label: { 
            show: true, position: 'top', formatter: '{b}', 
            fontWeight: '900', color: '#1e293b', fontSize: 13,
            backgroundColor: 'rgba(255,255,255,0.9)', padding: [6, 12], borderRadius: 10,
            shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.05)'
          },
          itemStyle: { 
            shadowBlur: 30, shadowColor: 'rgba(59, 130, 246, 0.4)',
            borderWidth: 3, borderColor: '#fff'
          },
          z: 2
        }
      ]
    };
    instance.setOption(option, true);
  };

  const handleExport = () => {
    if (!chartInstance) return;
    const url = chartInstance.getDataURL({ type: 'png', pixelRatio: 4, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.href = url;
    link.download = `TPA_Network_Asset_${new Date().getTime()}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">
            {lang === Language.ZH ? '医疗服务网络热力分布' : 'Medical Network Heatmap'}
          </h2>
          <p className="text-slate-500 text-base mt-4 font-medium flex items-center gap-2">
            {useFallback ? (
               <>
                <Share2 className="w-4 h-4 text-amber-500" />
                {lang === Language.ZH ? '数字化网络模式：GIS 外部同步受限，已激活结构化拓扑渲染' : 'Digital Topology: GIS restricted, schematic rendering active'}
               </>
            ) : (
              lang === Language.ZH ? '基于 Excel 实时业务数据生成的权威地理图层' : 'Authoritative GIS layers generated from live Excel data'
            )}
          </p>
        </div>
        <div className="flex gap-4">
           {useFallback && (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm">
                <Info className="w-3.5 h-3.5" />
                Schematic Mode
              </div>
           )}
           <button 
            onClick={loadMapData}
            className="p-4 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50 hover:text-blue-600 transition shadow-sm active:scale-90"
            title="Refresh View"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
           <button 
            onClick={handleExport}
            className="px-10 py-4 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition shadow-2xl flex items-center gap-3 active:scale-95"
          >
            <Download className="w-4 h-4" />
            {lang === Language.ZH ? '生成 PPT 资产' : 'Generate PPT Asset'}
          </button>
        </div>
      </div>

      <div className="flex gap-10 flex-1 overflow-hidden min-h-[750px]">
        {/* MAP CONTAINER */}
        <div className={`relative flex-1 border rounded-[4rem] shadow-sm flex items-center justify-center p-12 overflow-hidden transition-all duration-1000 ${useFallback ? 'border-amber-100 bg-slate-50/80' : 'border-slate-200 bg-white'}`}>
          
          {/* 装饰性背景网格 - 仅在 Fallback 模式下显示 */}
          {useFallback && (
            <div className="absolute inset-0 pointer-events-none opacity-[0.4]" 
                 style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          )}

          {loading && (
            <div className="absolute inset-0 z-20 bg-white/40 backdrop-blur-md flex flex-col items-center justify-center">
              <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-2xl" />
              <p className="mt-8 text-sm font-black text-slate-900 uppercase tracking-widest animate-pulse">{lang === Language.ZH ? '正在构建地理矩阵' : 'Building Geo Matrix'}</p>
            </div>
          )}
          
          <div ref={chartRef} className="w-full h-full relative z-10" />
          
          {!loading && !useFallback && (
            <div className="absolute top-12 left-12 pointer-events-none">
              <div className="bg-white/95 backdrop-blur px-6 py-4 rounded-[1.5rem] border border-slate-200 shadow-2xl flex items-center gap-4">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(37,99,235,0.6)]" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Live GIS Sync Active</span>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="w-[480px] flex flex-col gap-8 shrink-0">
          <div className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-sm flex-1 flex flex-col relative overflow-hidden group">
            {selectedCity ? (
              <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col h-full">
                <div className="flex justify-between items-start mb-14 border-b border-slate-100 pb-12">
                   <div>
                    <h3 className="text-7xl font-black text-slate-950 leading-none tracking-tighter">
                      {lang === Language.ZH ? selectedCity.cityName : (selectedCity.cityNameEn || selectedCity.cityName)}
                    </h3>
                    <div className="flex items-center gap-4 mt-8">
                       <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                        <MapPin className="w-4 h-4" />
                       </div>
                       <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">
                        {lang === Language.ZH ? selectedCity.region : (selectedCity.regionEn || selectedCity.region)}
                      </span>
                    </div>
                   </div>
                </div>

                <div className="space-y-12">
                  <div className="relative p-10 bg-slate-950 rounded-[3rem] overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                    <p className="text-blue-500 text-[11px] font-black uppercase tracking-[0.4em] mb-6">{lang === Language.ZH ? '直付合作机构' : 'Providers'}</p>
                    <div className="flex items-baseline gap-6 relative z-10">
                       <p className="text-[10rem] font-black text-white tabular-nums leading-none tracking-tighter">{selectedCity.directPayCount}</p>
                       <span className="text-lg font-black text-blue-400 uppercase tracking-widest">UNITS</span>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] -mr-32 -mt-32" />
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white transition-all duration-500 hover:shadow-xl">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Public Prem.</p>
                      <p className="text-5xl font-black text-slate-900 tabular-nums">{selectedCity.publicPremiumCount}</p>
                    </div>
                    <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white transition-all duration-500 hover:shadow-xl">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Private Sect.</p>
                      <p className="text-5xl font-black text-slate-900 tabular-nums">{selectedCity.privateCount}</p>
                    </div>
                  </div>

                  <div className={`p-10 rounded-[2.5rem] border flex items-center justify-between transition-all duration-700 ${selectedCity.hasRepresentative === '是' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex-1">
                      <p className={`font-black text-[11px] uppercase tracking-[0.2em] mb-3 ${selectedCity.hasRepresentative === '是' ? 'text-emerald-700' : 'text-slate-500'}`}>{lang === Language.ZH ? '驻院代表覆盖' : 'On-site Rep'}</p>
                      <p className="text-xs text-slate-500 font-bold leading-relaxed">{lang === Language.ZH ? '支持全流程直付结算与现场语言协助' : 'Direct claim & concierge support active'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center mb-14 shadow-inner border border-slate-100">
                   <Layers className="w-16 h-16 text-slate-200" />
                </div>
                <h4 className="text-4xl font-black text-slate-300 mb-6 tracking-tighter uppercase">{lang === Language.ZH ? '待解析节点' : 'Node Analysis'}</h4>
                <p className="text-slate-300 text-sm font-black max-w-[320px] leading-relaxed uppercase tracking-[0.3em]">
                  {lang === Language.ZH ? '请点击热力图中的节点以激活深度数据透视' : 'Click network nodes to activate deep pivot analysis'}
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-blue-600 rounded-[4rem] p-14 text-white relative overflow-hidden shadow-2xl">
             <div className="relative z-10">
                <h4 className="text-white/40 text-[11px] font-black uppercase tracking-[0.5em] mb-12">{lang === Language.ZH ? '全国网络概览' : 'Network Summary'}</h4>
                <div className="space-y-12">
                  <div className="flex justify-between items-end border-b border-white/20 pb-10 group">
                    <span className="text-white/60 text-sm font-black uppercase tracking-[0.2em]">{lang === Language.ZH ? '覆盖节点' : 'Cities'}:</span>
                    <span className="text-7xl font-black tabular-nums tracking-tighter leading-none">{networks.length}</span>
                  </div>
                  <div className="flex justify-between items-end group">
                    <span className="text-white/60 text-sm font-black uppercase tracking-[0.2em]">{lang === Language.ZH ? '直付终端' : 'Providers'}:</span>
                    <span className="text-[10rem] font-black tabular-nums tracking-tighter leading-none text-white">{networks.reduce((acc, curr) => acc + (Number(curr.directPayCount) || 0), 0)}</span>
                  </div>
                </div>
             </div>
             <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[120px] -mr-48 -mb-48" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapView;