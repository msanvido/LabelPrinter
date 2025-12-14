export interface LabelRecord {
  [key: string]: string;
}

export type TextAlign = 'left' | 'center' | 'right';

export interface LabelConfig {
  fontSize: number;
  textAlign: TextAlign;
  template: string;
}

export type Tab = 'input' | 'preview';