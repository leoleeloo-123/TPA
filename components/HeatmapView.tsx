
import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import { CityNetwork, Language } from '../types';
import { MapPin, Info, Download } from 'lucide-react';

interface HeatmapViewProps {
  networks: CityNetwork[];
  lang: Language;
  metric: string;
}

// Coordinates for standard cities if names don't match exactly or for scatter points
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

const HeatmapView: React.FC<HeatmapViewProps> = ({ networks = [], lang, metric }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedCity, setSelectedCity] = useState<CityNetwork | null>(null);
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null);
  const [isMapRegistered, setIsMapRegistered] = useState(false);

  const maxVal = useMemo(() => {
    if (!networks || networks.length === 0) return 1;
    const vals = networks.map(n => Number((n as any)[metric]) || 0);
    return Math.max(...vals, 1);
  }, [networks, metric]);

  useEffect(() => {
    if (!chartRef.current) return;

    const myChart = echarts.init(chartRef.current);
    setChartInstance(myChart);

    // Fetch authoritative GeoJSON for China map
    fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
      .then(res => res.json())
      .then(geoJson => {
        echarts.registerMap('china', geoJson);
        setIsMapRegistered(true);
      })
      .catch(err => {
        console.error('Failed to load map data', err);
      });

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
  }, [networks]);

  // Update chart only when map is registered and other props change
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
        formatter: (params: any) => {
          return `${params.name}: ${params.value[2]}`;
        }
      },
      visualMap: {
        min: 0,
        max: maxVal,
        left: 'left',
        top: 'bottom',
        text: [lang === Language.ZH ? '高' : 'High', lang === Language.ZH ? '低' : 'Low'],
        calculable: true,
        inRange: {
          color: ['#e0f2fe', '#3b82f6', '#1e40af']
        },
        padding: [20, 20, 40, 40],
        textStyle: { fontWeight: 'bold', fontSize: 10 }
      },
      geo: {
        map: 'china',
        roam: false,
        zoom: 1.1,
        emphasis: {
          label: { show: false },
          itemStyle: { areaColor: '#f1f5f9' }
        },
        itemStyle: {
          areaColor: '#f8fafc',
          borderColor: '#e2e8f0',
          borderWidth: 1.5
        }
      },
      series: [
        {
          name: 'City Points',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: scatterData,
          symbolSize: (val: any) => 12 + (val[2] / maxVal) * 22,
          encode: { value: 2 },
          label: {
            formatter: '{b}',
            position: 'right',
            show: false
          },
          emphasis: {
            label: {
              show: true
            }
          },
          itemStyle: {
            color: '#3b82f6',
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.1)'
          }
        },
        {
          name: 'Top Cities',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: scatterData.filter(d => d.value![2] / maxVal > 0.6),
          symbolSize: (val: any) => 14 + (val[2] / maxVal) * 22,
          showEffectOn: 'render',
          rippleEffect: { brushType: 'stroke', scale: 3 },
          label: {
            formatter: '{b}',
            position: 'right',
            show: true,
            fontWeight: 'bold',
            fontSize: 11,
            color: '#334155',
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: [2, 4],
            borderRadius: 4
          },
          itemStyle: {
            color: '#1e40af',
            shadowBlur: 15,
            shadowColor: 'rgba(0,0,0,0.2)'
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
      pixelRatio: 4, // Ultra high resolution for PPT
      backgroundColor: '#ffffff'
    });
    const link = document.createElement('a');
    link.href = url;
    link.download = `TPA_Medical_Network_China_Map_${new Date().getTime()}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
            {lang === Language.ZH ? '医疗服务网络覆盖地图' : 'Medical Network Coverage Map'}
          </h2>
          <p className="text-slate-500 text-sm mt-3 font-medium">
            {lang === Language.ZH ? '权威行政区划底图叠加 Excel 实时业务数据' : 'Authoritative administrative base map overlaid with real-time Excel data'}
          </p>
        </div>
        <button 
          onClick={handleExport}
          className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition shadow-2xl shadow-blue-600/20 flex items-center gap-3"
        >
          <Download className="w-4 h-4" />
          {lang === Language.ZH ? '导出 4K 高清资产' : 'Export 4K HD Asset'}
        </button>
      </div>

      <div className="flex gap-10 flex-1 overflow-hidden min-h-[750px]">
        {/* Massive Map Area */}
        <div className="relative flex-1 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm flex items-center justify-center p-8">
          {!isMapRegistered && (
            <div className="text-slate-400 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-black uppercase tracking-widest">{lang === Language.ZH ? '加载地理信息系统...' : 'Initializing GIS...'}</span>
            </div>
          )}
          <div ref={chartRef} className={`w-full h-full ${!isMapRegistered ? 'invisible' : 'visible'}`} />
          
          {isMapRegistered && (
            <div className="absolute top-10 left-10 flex flex-col gap-2">
              <div className="bg-white/90 backdrop-blur p-3 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-3 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>Standard: WGS-84 / PRC-Standard</span>
              </div>
            </div>
          )}

          <div className="absolute bottom-10 right-10 text-[11px] font-black text-slate-200 uppercase tracking-[0.5em] [writing-mode:vertical-rl] opacity-40">
            TPA GEOSPATIAL ENGINE 2.0
          </div>
        </div>

        {/* Info Sidebar (Fixed width, massive depth) */}
        <div className="w-[420px] flex flex-col gap-6 shrink-0">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex-1 flex flex-col relative overflow-hidden">
            {selectedCity ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full">
                <div className="flex justify-between items-start mb-10 border-b border-slate-100 pb-8">
                   <div>
                    <h3 className="text-5xl font-black text-slate-900 leading-none tracking-tighter">
                      {lang === Language.ZH ? selectedCity.cityName : (selectedCity.cityNameEn || selectedCity.cityName)}
                    </h3>
                    <div className="flex items-center gap-2 mt-4">
                       <MapPin className="w-4 h-4 text-blue-500" />
                       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {lang === Language.ZH ? selectedCity.region : (selectedCity.regionEn || selectedCity.region)}
                      </span>
                    </div>
                   </div>
                </div>

                <div className="space-y-12">
                  <div className="relative">
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mb-4">{lang === Language.ZH ? '直付合作机构' : 'Direct Pay Providers'}</p>
                    <div className="flex items-baseline gap-4">
                       <p className="text-8xl font-black text-blue-600 tabular-nums leading-none tracking-tighter">{selectedCity.directPayCount}</p>
                       <span className="text-sm font-black text-slate-300 uppercase tracking-widest">{lang === Language.ZH ? '家' : 'Units'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">{lang === Language.ZH ? '公立高端' : 'Public Prem.'}</p>
                      <p className="text-3xl font-black text-slate-800 tabular-nums">{selectedCity.publicPremiumCount}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">{lang === Language.ZH ? '私立机构' : 'Private'}</p>
                      <p className="text-3xl font-black text-slate-800 tabular-nums">{selectedCity.privateCount}</p>
                    </div>
                  </div>

                  <div className={`p-6 rounded-[1.5rem] border flex items-center justify-between transition-all duration-500 ${selectedCity.hasRepresentative === '是' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                      <p className={`font-black text-xs uppercase tracking-widest ${selectedCity.hasRepresentative === '是' ? 'text-emerald-700' : 'text-slate-500'}`}>{lang === Language.ZH ? '驻院代表' : 'On-site Rep'}</p>
                      <p className="text-[11px] text-slate-400 mt-2 font-medium leading-relaxed">{lang === Language.ZH ? '提供理赔资料收集及口译协助' : 'Providing local claim support and translation'}</p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-sm shadow-xl ${selectedCity.hasRepresentative === '是' ? 'bg-emerald-500 text-white rotate-6' : 'bg-slate-200 text-slate-400'}`}>
                      {selectedCity.hasRepresentative === '是' ? 'YES' : 'NO'}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-4">{lang === Language.ZH ? '运营备注' : 'Operational Remarks'}</p>
                    <div className="bg-amber-50/20 p-6 rounded-2xl border border-amber-100/30">
                      <p className="text-slate-600 text-sm italic font-medium leading-relaxed">
                        {lang === Language.ZH ? selectedCity.remarks : (selectedCity.remarksEn || selectedCity.remarks)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-10 shadow-inner group transition-transform duration-700">
                   <MapPin className="w-12 h-12 text-blue-200 animate-bounce" />
                </div>
                <h4 className="text-2xl font-black text-slate-400 mb-4 tracking-tighter">{lang === Language.ZH ? '选择观测点' : 'Select Target'}</h4>
                <p className="text-slate-300 text-sm font-bold max-w-[280px] leading-relaxed uppercase tracking-widest">
                  {lang === Language.ZH ? '在权威地图中点击城市节点获取明细' : 'Interact with standard map nodes to reveal data'}
                </p>
              </div>
            )}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16" />
          </div>
          
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
             <div className="relative z-10">
                <h4 className="text-blue-400 text-[11px] font-black uppercase tracking-[0.4em] mb-8">{lang === Language.ZH ? '全国网络实时统计' : 'National Live Stats'}</h4>
                <div className="space-y-8">
                  <div className="flex justify-between items-end border-b border-white/5 pb-6">
                    <span className="text-slate-500 text-xs font-black uppercase tracking-widest">{lang === Language.ZH ? '覆盖城市数' : 'Cities'}:</span>
                    <span className="text-5xl font-black tabular-nums tracking-tighter leading-none">{networks.length}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-white/5 pb-6">
                    <span className="text-slate-500 text-xs font-black uppercase tracking-widest">{lang === Language.ZH ? '网络总规模' : 'Network'}:</span>
                    <span className="text-6xl font-black tabular-nums tracking-tighter leading-none text-blue-500">{networks.reduce((acc, curr) => acc + (Number(curr.directPayCount) || 0), 0)}</span>
                  </div>
                </div>
             </div>
             <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-[80px] -mr-24 -mt-24 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapView;
