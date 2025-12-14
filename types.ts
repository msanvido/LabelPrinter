export interface LabelRecord {
  [key: string]: string;
}

export type TextAlign = 'left' | 'center' | 'right';

export interface LabelConfig {
  fontSize: number;
  textAlign: TextAlign;
  template: string;
}

export interface LabelLayout {
  id: string;
  name: string;
  description: string;
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginLeft: number;
  colWidth: number;
  rowHeight: number;
  numCols: number;
  numRows: number;
  horizontalGap: number;
  verticalGap: number;
  paddingInternal: number;
}

export type Tab = 'input' | 'preview';