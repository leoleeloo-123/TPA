
import React, { useState } from 'react';
import { TPAData, Language } from './types';
import { ICONS, DEFAULT_TEMPLATE_DATA } from './constants';
import { parseExcel, exportExcel, downloadTemplate } from './services/excelProcessor';
import HeatmapView from './components/HeatmapView';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Toaster, toast } from 'react-hot-toast';
import { ShieldCheck, Globe, Upload, LayoutDashboard, Database, BarChart3, Settings as SettingsIcon, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<TPAData>(DEFAULT_TEMPLATE_DATA as any);
  const [lang, setLang] = useState<Language>(Language.ZH);
  const [activeTab, setActiveTab] = useState<'map' | 'services' | 'sla' | 'settings'>('map');

  const currentMetric = data.settings.find(s => s.key === 'defaultMetric')?.value || 'directPayCount';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await parseExcel(file);
      setData(parsedData);
      toast.success(lang === Language.ZH ? '数据导入成功！' : 'Data imported successfully!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const renderServices = () => {
    const categories = Array.from(new Set(data.services.map(s => s.category)));
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
        {categories.map(cat => (
          <div key={cat} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-l-4 border-blue-600 pl-3 uppercase tracking-wider">{cat}</h3>
            <div className="space-y-4">
              {data.services.filter(s => s.category === cat && s.isVisible === '是').sort((a, b) => a.order - b.order).map((service, idx) => (
                <div key={idx} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl transition-all hover:border-blue-400 group">
                  <div className="flex items-start gap-5">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-inner">
                      {ICONS[service.iconKey] || ICONS.grid}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 truncate text-lg tracking-tight">
                        {lang === Language.ZH ? service.name : (service.nameEn || service.name)}
                      </h4>
                      <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2 font-medium">
                        {lang === Language.ZH ? service.description : (service.descriptionEn || service.description)}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-5 text-[10px] font-black uppercase tracking-widest">
                        <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600 border border-slate-200">
                          SLA: <span className="text-blue-700">{service.slaValue} {service.slaUnit}</span>
                        </span>
                        <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600 border border-slate-200">
                          {lang === Language.ZH ? '支持语言' : 'Support'}: <span className="text-slate-800">{service.languages}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSLA = () => {
    const chartData = data.slas.filter(s => s.isVisible === '是').map(s => ({
      name: lang === Language.ZH ? s.serviceItem : (s.serviceItemEn || s.serviceItem),
      value: s.value,
      unit: s.unit
    }));

    return (
      <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
          {data.slas.filter(s => s.isVisible === '是').map((sla, idx) => (
            <div key={idx} className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
              <div className="relative z-10">
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mb-6">{lang === Language.ZH ? sla.serviceItem : (sla.serviceItemEn || sla.serviceItem)}</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-black tracking-tighter tabular-nums text-slate-900">{sla.value}</span>
                  <span className="text-blue-600 text-2xl font-black">{sla.unit}</span>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <p className="text-slate-500 text-sm font-medium italic leading-relaxed">{sla.remarks}</p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-blue-500/10 transition-all duration-700" />
            </div>
          ))}
        </div>

        <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-2 h-8 bg-blue-600 rounded-full" />
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {lang === Language.ZH ? '核心服务 SLA 指标看板' : 'Service SLA Analytics Dashboard'}
            </h3>
          </div>
          <div className="h-[600px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 80, top: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="5 5" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} fontWeight="bold" axisLine={false} tickLine={false} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={200} 
                  tick={{ fontSize: 13, fontWeight: '800', fill: '#1e293b' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '20px', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 12, 12, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen flex bg-slate-50 overflow-hidden text-slate-900">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '16px', fontWeight: 'bold' } }} />
      
      {/* PERSISTENT LEFT SIDEBAR */}
      <aside className="w-80 bg-slate-950 flex flex-col h-full shrink-0 border-r border-slate-800 shadow-[20px_0_50px_rgba(0,0,0,0.2)] z-50">
        <div className="p-10">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-2xl shadow-blue-500/40">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter leading-none">TPA Pro</h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1.5">Internal Engine</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-3 mt-6">
          <div className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] px-5 mb-6 opacity-60">
            {lang === Language.ZH ? '分析与可视化' : 'Analytics & Visualization'}
          </div>
          
          {[
            { id: 'map', icon: <LayoutDashboard className="w-5 h-5" />, label: lang === Language.ZH ? '医疗网络覆盖' : 'Network Coverage' },
            { id: 'services', icon: <Database className="w-5 h-5" />, label: lang === Language.ZH ? '业务能力模块' : 'Service Modules' },
            { id: 'sla', icon: <BarChart3 className="w-5 h-5" />, label: lang === Language.ZH ? 'SLA 指标承诺' : 'SLA Performance' },
            { id: 'settings', icon: <SettingsIcon className="w-5 h-5" />, label: lang === Language.ZH ? '核心数据管理' : 'Data Admin' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-between gap-4 px-5 py-4.5 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/30 translate-x-1' : 'text-slate-400 hover:bg-slate-900 hover:text-white hover:translate-x-1'}`}
            >
              <div className="flex items-center gap-4">
                <span className={`${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>
                  {item.icon}
                </span>
                <span className="text-sm font-black tracking-tight">{item.label}</span>
              </div>
              {activeTab === item.id && <ChevronRight className="w-4 h-4 text-blue-200" />}
            </button>
          ))}
        </nav>

        {/* BOTTOM SIDEBAR UI */}
        <div className="p-8 mt-auto border-t border-slate-900">
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
             <div className="flex items-center gap-3 mb-4">
               <Globe className="w-4 h-4 text-blue-500" />
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{lang === Language.ZH ? '系统语言' : 'Language'}</span>
             </div>
             <div className="flex bg-slate-950 p-1 rounded-xl gap-1 border border-slate-800">
                <button 
                  onClick={() => setLang(Language.ZH)}
                  className={`flex-1 text-[11px] font-black py-2 rounded-lg transition-all ${lang === Language.ZH ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  中文
                </button>
                <button 
                  onClick={() => setLang(Language.EN)}
                  className={`flex-1 text-[11px] font-black py-2 rounded-lg transition-all ${lang === Language.EN ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  ENG
                </button>
             </div>
          </div>
        </div>
      </aside>

      {/* FULL WIDTH MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* GLOBAL HEADER */}
        <header className="h-20 bg-white/80 border-b border-slate-200 shrink-0 flex items-center px-12 justify-between sticky top-0 z-40 backdrop-blur-2xl">
          <div className="flex items-center gap-5">
             <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">{lang === Language.ZH ? '数据实时同步中' : 'Live Sync Active'}</span>
             </div>
             <span className="text-slate-300 text-xl font-thin">/</span>
             <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
               {activeTab === 'map' && (lang === Language.ZH ? '网络热力透视' : 'Coverage Insight')}
               {activeTab === 'services' && (lang === Language.ZH ? '服务模块概览' : 'Capability Matrix')}
               {activeTab === 'sla' && (lang === Language.ZH ? 'SLA 实时监控' : 'Quality Assurance')}
               {activeTab === 'settings' && (lang === Language.ZH ? '系统配置中心' : 'Control Center')}
             </h2>
          </div>
          
          <div className="flex items-center gap-10">
             <div className="hidden xl:flex items-center gap-10">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5">Environment</p>
                  <p className="text-xs font-black text-slate-800 tracking-tight">Production (Internal)</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5">Last Refreshed</p>
                  <p className="text-xs font-black text-blue-600 tracking-tight">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} / UTC+8</p>
                </div>
             </div>
             <div className="h-10 w-px bg-slate-200" />
             <div className="flex items-center gap-3 bg-slate-50 pr-5 pl-2 py-2 rounded-full border border-slate-100 cursor-pointer hover:bg-slate-100 transition">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-black text-white shadow-lg">TPA</div>
                <span className="text-xs font-black text-slate-700 tracking-tight">ADMIN_USER</span>
             </div>
          </div>
        </header>

        {/* SCROLLABLE VIEWPORT */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-12 w-full">
          <div className="w-full h-full">
            {activeTab === 'map' && (
              <HeatmapView networks={data.networks} lang={lang} metric={currentMetric} />
            )}
            
            {activeTab === 'services' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-end mb-10">
                  <div>
                    <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{lang === Language.ZH ? '核心服务能力矩阵' : 'Service Capability Matrix'}</h2>
                    <p className="text-slate-500 text-lg mt-6 font-medium max-w-3xl leading-relaxed">
                      {lang === Language.ZH ? '通过 Excel 映射定义的结构化服务视图，旨在为 PPT 资产导出提供高质量、标准化的可视化呈现。' : 'A structured service view defined through Excel mapping, designed for high-quality PPT asset exports.'}
                    </p>
                  </div>
                  <button className="flex items-center gap-3 px-10 py-5 bg-slate-950 text-white rounded-3xl text-sm font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-2xl hover:scale-105 active:scale-95">
                    {ICONS.image} {lang === Language.ZH ? '导出能力画册' : 'Export Asset Gallery'}
                  </button>
                </div>
                {renderServices()}
              </div>
            )}

            {activeTab === 'sla' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                 <div className="flex justify-between items-end mb-10">
                  <div>
                    <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{lang === Language.ZH ? 'SLA 承诺与时效监控' : 'SLA Standards & Quality'}</h2>
                    <p className="text-slate-500 text-lg mt-6 font-medium max-w-3xl leading-relaxed">
                      {lang === Language.ZH ? '可视化展示 TPA 核心流程的响应时效与接通率，确保 B2B 服务的专业性与可信度。' : 'Visualization of response times and pick-up rates for core TPA processes, ensuring professionalism and credibility.'}
                    </p>
                  </div>
                  <button className="flex items-center gap-3 px-10 py-5 bg-slate-950 text-white rounded-3xl text-sm font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-2xl hover:scale-105 active:scale-95">
                    {ICONS.image} {lang === Language.ZH ? '导出服务报告图表' : 'Export Quality Charts'}
                  </button>
                </div>
                {renderSLA()}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                 <div className="text-center mb-16">
                    <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{lang === Language.ZH ? '数据治理中心' : 'Data Governance'}</h2>
                    <p className="text-slate-500 text-lg mt-6 font-medium max-w-2xl mx-auto">
                      {lang === Language.ZH ? '管理 TPA 运行所需的全部核心数据源，支持双向同步与模板导出。' : 'Manage all core data sources for TPA operations, supporting bi-directional sync and template export.'}
                    </p>
                  </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <section className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-[500px] hover:shadow-2xl transition-all duration-500">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-ping" />
                        {lang === Language.ZH ? 'EXCEL 实时数据同步' : 'Excel Real-time Sync'}
                      </h3>
                      <label className="flex-1 flex flex-col items-center justify-center p-12 border-4 border-dashed border-slate-100 rounded-[2.5rem] hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all duration-500 group relative">
                        <div className="bg-white w-28 h-28 rounded-3xl shadow-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition duration-500 border border-slate-100">
                          <Upload className="w-12 h-12 text-blue-600" />
                        </div>
                        <span className="text-slate-900 font-black tracking-tighter block text-2xl mb-2">{lang === Language.ZH ? '上传 TPA_Data.xlsx' : 'Import New Data Source'}</span>
                        <span className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">{lang === Language.ZH ? '系统将自动解析五个 Sheet 的核心业务逻辑' : 'Auto-parsing 5 Sheets for Business Logic'}</span>
                        <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                      </label>
                    </section>

                    <section className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-[500px] hover:shadow-2xl transition-all duration-500">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
                        <div className="w-3 h-3 bg-indigo-600 rounded-full" />
                        {lang === Language.ZH ? '系统资产备份与导出' : 'Platform Asset Export'}
                      </h3>
                      <div className="space-y-6 flex-1 flex flex-col justify-center">
                        <button 
                          onClick={() => exportExcel(data)}
                          className="w-full flex items-center justify-between p-8 bg-slate-50 text-slate-800 rounded-3xl font-black text-lg hover:bg-slate-100 transition-all border border-slate-200 group"
                        >
                          <div className="flex items-center gap-6">
                             <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                {ICONS.download}
                             </div>
                             <div className="text-left">
                                <span className="tracking-tighter block">{lang === Language.ZH ? '导出当前运行快照' : 'Export Current Snapshot'}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Full Workbook (.xlsx)</span>
                             </div>
                          </div>
                          <ChevronRight className="w-6 h-6 text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </button>
                        
                        <button 
                          onClick={downloadTemplate}
                          className="w-full flex items-center justify-between p-8 bg-blue-600 text-white rounded-3xl font-black text-lg hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/20 group"
                        >
                           <div className="flex items-center gap-6">
                             <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-blue-200 group-hover:bg-white/20 transition-colors">
                                {ICONS.download}
                             </div>
                             <div className="text-left">
                                <span className="tracking-tighter block">{lang === Language.ZH ? '获取标准数据模板' : 'Download Master Template'}</span>
                                <span className="text-[10px] text-blue-200 uppercase tracking-widest mt-1">Ready for data entry</span>
                             </div>
                          </div>
                          <ChevronRight className="w-6 h-6 text-blue-200 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </section>
                 </div>
              </div>
            )}
          </div>
        </main>

        {/* STATUS FOOTER */}
        <footer className="bg-white border-t border-slate-200 h-14 px-12 flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] shrink-0">
          <div className="flex items-center gap-8">
            <span className="hover:text-slate-600 cursor-default transition">&copy; 2024 TPA INSIGHT PROFESSIONAL PLATFORM</span>
            <div className="h-4 w-px bg-slate-100" />
            <span className="text-emerald-500/80">{lang === Language.ZH ? '保密级别：高 (内部专用)' : 'Security: High (Internal Only)'}</span>
          </div>
          <div className="flex items-center gap-8">
             <div className="flex items-center gap-2">
                <span className="text-slate-300">Build:</span>
                <span className="text-slate-500">v2.0.4-LATEST</span>
             </div>
             <div className="h-4 w-px bg-slate-100" />
             <div className="flex items-center gap-2 group cursor-default">
                <span className="group-hover:text-blue-500 transition-colors">EXCEL ENGINE ACTIVE</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
             </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
