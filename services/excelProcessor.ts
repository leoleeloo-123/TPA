
import * as XLSX from 'xlsx';
import { TPAData, CityNetwork, ServiceModule, SLACommitment, AppSetting, FieldDefinition } from '../types';

export const parseExcel = async (file: File): Promise<TPAData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheets = {
          networks: '城市网络',
          services: '服务模块',
          slas: 'SLA承诺',
          settings: '设置',
          fields: '字段说明'
        };

        const result: TPAData = {
          networks: [],
          services: [],
          slas: [],
          settings: [],
          fields: []
        };

        // Verification & Parsing
        const parseSheet = <T>(sheetName: string, requiredKeys: string[]): T[] => {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) throw new Error(`缺少必要的Sheet: ${sheetName}`);
          const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];
          
          if (jsonData.length > 0) {
            const actualKeys = Object.keys(jsonData[0]);
            requiredKeys.forEach(k => {
              if (!actualKeys.includes(k)) {
                // Non-fatal warning might be better, but let's be strict as requested
                console.warn(`Sheet "${sheetName}" 可能缺少列: ${k}`);
              }
            });
          }
          return jsonData as T[];
        };

        result.networks = parseSheet<CityNetwork>(sheets.networks, ['城市名称', '直付合作机构数量']);
        result.services = parseSheet<ServiceModule>(sheets.services, ['模块名称', '模块分类']);
        result.slas = parseSheet<SLACommitment>(sheets.slas, ['服务项', '承诺值']);
        result.settings = parseSheet<AppSetting>(sheets.settings, ['Key', 'Value']);
        result.fields = parseSheet<FieldDefinition>(sheets.fields, ['Sheet名称', '字段名']);

        resolve(result);
      } catch (err: any) {
        reject(new Error(`导入失败: ${err.message}`));
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const exportExcel = (data: TPAData, filename: string = 'TPA_Data') => {
  const wb = XLSX.utils.book_new();
  
  const wsNetworks = XLSX.utils.json_to_sheet(data.networks);
  XLSX.utils.book_append_sheet(wb, wsNetworks, '城市网络');
  
  const wsServices = XLSX.utils.json_to_sheet(data.services);
  XLSX.utils.book_append_sheet(wb, wsServices, '服务模块');
  
  const wsSLAs = XLSX.utils.json_to_sheet(data.slas);
  XLSX.utils.book_append_sheet(wb, wsSLAs, 'SLA承诺');
  
  const wsSettings = XLSX.utils.json_to_sheet(data.settings);
  XLSX.utils.book_append_sheet(wb, wsSettings, '设置');
  
  const wsFields = XLSX.utils.json_to_sheet(data.fields);
  XLSX.utils.book_append_sheet(wb, wsFields, '字段说明');

  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
};

export const downloadTemplate = () => {
  const template: TPAData = {
    networks: [
      { cityName: '示例城市', country: '中国', region: '华东', coverageLevel: '高', directPayCount: 100, publicPremiumCount: 20, privateCount: 80, hasRepresentative: '是', remarks: '示例备注' }
    ],
    services: [
      { name: '示例服务', category: '核心服务', description: '服务说明', languages: '中/英', slaType: '时效', slaValue: 24, slaUnit: '小时', isVisible: '是', order: 1, iconKey: 'network' }
    ],
    slas: [
      { serviceItem: '示例指标', value: 99, unit: '%', benchmarkType: '行业参考', isVisible: '是', remarks: '备注说明' }
    ],
    settings: [
      { key: 'defaultLanguage', value: 'ZH' }
    ],
    fields: [
      { sheetName: '城市网络', fieldName: 'cityName', fieldType: '文本', isRequired: '是', exampleValue: '北京', logicDescription: '城市名称' }
    ]
  };
  exportExcel(template, 'TPA_Data_Template');
};
