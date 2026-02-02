
import React from 'react';
import { Network, PhoneCall, ShieldCheck, Activity, Plane, Globe, MapPin, Settings, Download, Upload, Image as ImageIcon, BarChart3, LayoutGrid } from 'lucide-react';

export const ICONS: Record<string, React.ReactNode> = {
  network: <Network className="w-5 h-5" />,
  hotline: <PhoneCall className="w-5 h-5" />,
  claims: <ShieldCheck className="w-5 h-5" />,
  emergency: <Activity className="w-5 h-5" />,
  rescue: <Plane className="w-5 h-5" />,
  globe: <Globe className="w-5 h-5" />,
  map: <MapPin className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
  download: <Download className="w-5 h-5" />,
  upload: <Upload className="w-5 h-5" />,
  image: <ImageIcon className="w-5 h-5" />,
  chart: <BarChart3 className="w-5 h-5" />,
  grid: <LayoutGrid className="w-5 h-5" />,
};

/**
 * Refined coordinate mapping for heatmap visualization (China)
 * Based on a 1000x800 SVG ViewBox projection
 * X: 0-100%, Y: 0-100%
 */
export const CITY_COORDINATES: Record<string, { x: number; y: number }> = {
  '北京': { x: 70.8, y: 31.5 },
  '上海': { x: 82.5, y: 52.5 },
  '广州': { x: 72.5, y: 77.5 },
  '深圳': { x: 73.2, y: 80.0 },
  '成都': { x: 53.5, y: 58.5 },
  '杭州': { x: 81.5, y: 56.5 },
  '武汉': { x: 69.8, y: 57.5 },
  '西安': { x: 60.5, y: 48.5 },
  '南京': { x: 79.5, y: 51.5 },
  '重庆': { x: 57.5, y: 62.5 },
  '天津': { x: 71.8, y: 34.5 },
  '沈阳': { x: 82.5, y: 22.5 },
  '哈尔滨': { x: 87.5, y: 13.5 },
  '青岛': { x: 77.8, y: 41.5 },
  '大连': { x: 79.5, y: 31.5 },
  '苏州': { x: 81.5, y: 53.5 },
  '厦门': { x: 79.5, y: 72.5 },
  '长沙': { x: 68.5, y: 66.5 },
  '昆明': { x: 51.5, y: 76.5 },
  '乌鲁木齐': { x: 25.5, y: 24.5 },
  '拉萨': { x: 33.5, y: 61.5 },
  '呼和浩特': { x: 63.5, y: 30.5 },
  '福州': { x: 80.8, y: 67.5 },
  '南宁': { x: 64.5, y: 79.5 },
  '海口': { x: 68.5, y: 88.5 },
};

export const DEFAULT_TEMPLATE_DATA = {
  networks: [
    { cityName: '北京', country: '中国', region: '华北', coverageLevel: '高', directPayCount: 150, publicPremiumCount: 45, privateCount: 105, hasRepresentative: '是', remarks: '核心枢纽城市', cityNameEn: 'Beijing', regionEn: 'North China' },
    { cityName: '上海', country: '中国', region: '华东', coverageLevel: '高', directPayCount: 200, publicPremiumCount: 50, privateCount: 150, hasRepresentative: '是', remarks: '金融中心旗舰覆盖', cityNameEn: 'Shanghai', regionEn: 'East China' },
    { cityName: '广州', country: '中国', region: '华南', coverageLevel: '高', directPayCount: 120, publicPremiumCount: 30, privateCount: 90, hasRepresentative: '是', remarks: '大湾区核心', cityNameEn: 'Guangzhou', regionEn: 'South China' },
    { cityName: '成都', country: '中国', region: '西南', coverageLevel: '中', directPayCount: 80, publicPremiumCount: 20, privateCount: 60, hasRepresentative: '否', remarks: '西南地区中心', cityNameEn: 'Chengdu', regionEn: 'Southwest' },
    { cityName: '杭州', country: '中国', region: '华东', coverageLevel: '中', directPayCount: 95, publicPremiumCount: 25, privateCount: 70, hasRepresentative: '是', remarks: '数字经济中心', cityNameEn: 'Hangzhou', regionEn: 'East China' },
    { cityName: '西安', country: '中国', region: '西北', coverageLevel: '中', directPayCount: 60, publicPremiumCount: 12, privateCount: 48, hasRepresentative: '否', remarks: '西北门户', cityNameEn: 'Xi\'an', regionEn: 'Northwest' },
    { cityName: '乌鲁木齐', country: '中国', region: '西北', coverageLevel: '低', directPayCount: 12, publicPremiumCount: 2, privateCount: 10, hasRepresentative: '否', remarks: '远端服务点', cityNameEn: 'Urumqi', regionEn: 'Northwest' }
  ],
  services: [
    { name: '24/7多语种热线', category: '核心服务', description: '提供全年无休的医疗咨询与理赔协助', languages: '中/英/日', slaType: '热线', slaValue: 20, slaUnit: '秒', isVisible: '是', order: 1, iconKey: 'hotline' },
    { name: '直付医疗网络', category: '核心服务', description: '覆盖全球主要城市的直付合作机构', languages: '中/英', slaType: '网络', slaValue: 1, slaUnit: '个工作日', isVisible: '是', order: 2, iconKey: 'network' },
    { name: '全球紧急救援', category: '增值服务', description: '紧急空中转运与遗体遣返服务', languages: '中/英', slaType: '救援', slaValue: 4, slaUnit: '小时', isVisible: '是', order: 3, iconKey: 'rescue' }
  ],
  slas: [
    { serviceItem: '理赔处理时效', value: 5, unit: '工作日', benchmarkType: '行业参考', isVisible: '是', remarks: '95%达成率' },
    { serviceItem: '热线接通率', value: 98, unit: '%', benchmarkType: '内部目标', isVisible: '是', remarks: '20秒内接通' },
    { serviceItem: '紧急救援响应', value: 2, unit: '小时', benchmarkType: '内部目标', isVisible: '是', remarks: '初步评估完成' }
  ],
  settings: [
    { key: 'defaultLanguage', value: 'ZH' },
    { key: 'defaultExportRatio', value: '16:9' },
    { key: 'defaultResolution', value: '2x' },
    { key: 'defaultMetric', value: 'directPayCount' }
  ],
  fields: [
    { sheetName: '城市网络', fieldName: 'cityName', fieldType: '文本', isRequired: '是', exampleValue: '北京', logicDescription: '显示在地图上的城市名' }
  ]
};
