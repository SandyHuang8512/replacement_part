
export enum ComplianceLevel {
  FULLY_COMPLIANT = 'Fully Compliant', // 完全符合
  PARTIAL = 'Partial / Review Needed', // 部分符合/需確認
  NON_COMPLIANT = 'Non-Compliant', // 不符合
}

export interface SpecItem {
  id: number;
  parameter: string; // e.g., "Drain-Source Voltage"
  unit: string; // e.g., "V"
  valueA: string; // The baseline value
  valueB: string; // Substitute B
  complianceB: ComplianceLevel;
  valueC: string; // Substitute C
  complianceC: ComplianceLevel;
  comment: string; // AI reasoning
}

// New: Represents a single row from the Master List (A vs B vs C)
export interface ComparisonGroup {
  id: string; // Unique ID for the group
  rowNumber: number; // Row number in Master List
  mappedParts: {
    partA: string;
    partB: string;
    partC: string;
  };
  summary: string;
  recommendation: 'B' | 'C' | 'None' | 'Both';
  specs: SpecItem[]; // The 1-15 items for this specific group
}

export interface AnalysisResult {
  groups: ComparisonGroup[]; // Array of comparison groups
  missingFiles: string[]; // Global list of missing files
}

export interface FileData {
  id: string; // Unique ID for list rendering
  file: File;
  base64: string;
  type: 'application/pdf' | 'image/png' | 'image/jpeg' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

// Interface for Step 3 (Grouped Structure)
export interface CompletenessPart {
  partName: string;
  status: 'Provided' | 'Missing';
  matchedFilename?: string;
}

export interface CompletenessRow {
  original: CompletenessPart;
  substitutes: CompletenessPart[];
}

export interface CompletenessResult {
  groupedRows: CompletenessRow[];
  allProvided: boolean;
  message: string;
}

export interface AppState {
  masterList: FileData | null;
  datasheets: FileData[];
  isAnalyzing: boolean; // For Step 4
  isChecking: boolean; // For Step 3
  checkResult: CompletenessResult | null; // Result of Step 3
  result: AnalysisResult | null; // Result of Step 4
  error: string | null;
}
