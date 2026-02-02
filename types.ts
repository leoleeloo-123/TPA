
export enum Language {
  ZH = 'ZH',
  EN = 'EN'
}

export enum AspectRatio {
  RATIO_16_9 = '16:9',
  RATIO_4_3 = '4:3'
}

export interface CityNetwork {
  cityName: string;
  country: string;
  region: string;
  coverageLevel: string | number;
  directPayCount: number;
  publicPremiumCount: number;
  privateCount: number;
  hasRepresentative: string;
  remarks: string;
  cityNameEn?: string;
  regionEn?: string;
  remarksEn?: string;
}

export interface ServiceModule {
  name: string;
  category: '核心服务' | '增值服务' | 'Core' | 'Value-added';
  description: string;
  languages: string;
  slaType: string;
  slaValue?: number;
  slaUnit: string;
  isVisible: string;
  order: number;
  iconKey: string;
  nameEn?: string;
  descriptionEn?: string;
}

export interface SLACommitment {
  serviceItem: string;
  value: number;
  unit: string;
  benchmarkType: string;
  isVisible: string;
  remarks: string;
  serviceItemEn?: string;
  remarksEn?: string;
}

export interface AppSetting {
  key: string;
  value: string;
}

export interface FieldDefinition {
  sheetName: string;
  fieldName: string;
  fieldType: string;
  isRequired: string;
  exampleValue: string;
  logicDescription: string;
}

export interface TPAData {
  networks: CityNetwork[];
  services: ServiceModule[];
  slas: SLACommitment[];
  settings: AppSetting[];
  fields: FieldDefinition[];
}
