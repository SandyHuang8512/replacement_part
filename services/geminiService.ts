import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from "xlsx";
import { AnalysisResult, SpecItem, ComplianceLevel, FileData, CompletenessResult } from "../types";

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

const validateMimeType = (fileData: FileData) => {
  const supportedTypes = [
    'application/pdf', 
    'image/png', 
    'image/jpeg', 
    'image/jpg', 
    'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];
  if (!supportedTypes.includes(fileData.type)) {
     throw new Error(`Unsupported file type: ${fileData.type}. Please upload PDF, Images, or Excel files.`);
  }
};

const isExcel = (fileData: FileData) => {
  return fileData.type.includes('spreadsheet') || fileData.type.includes('excel') || fileData.file.name.endsWith('.xlsx') || fileData.file.name.endsWith('.xls');
};

// Helper to extract text from Excel/Image/PDF for the Prompt
const getFileContentPart = (fileData: FileData, label: string) => {
  if (isExcel(fileData)) {
    try {
      // Parse Excel to CSV text
      const workbook = XLSX.read(fileData.base64, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const csvText = XLSX.utils.sheet_to_csv(sheet);
      
      return { 
        text: `DOCUMENT_CONTENT (${label}):\n${csvText}\n[End of CSV content]` 
      };
    } catch (e) {
      console.error("Excel parse error", e);
      throw new Error(`Failed to read Excel file: ${fileData.file.name}. Please ensure it is a valid .xlsx file.`);
    }
  } else {
    // Standard Image/PDF handling for Vision
    return { 
      inlineData: { mimeType: fileData.type, data: fileData.base64 } 
    };
  }
};

// --- Step 3: Pre-Check Function ---
export const checkFileCompleteness = async (
  masterList: FileData,
  filenames: string[]
): Promise<CompletenessResult> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");
  validateMimeType(masterList);
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";

  const prompt = `
    Role: Procurement Document Assistant.
    
    Task: 
    1. Analyze the provided 'Master List' content (CSV/Table) row by row.
    2. Each row usually represents a comparison group with:
       - One "Original Part" (Component A).
       - ONE OR MORE "Substitute Parts" (Component B, Component C, etc.).
    3. You MUST identify ALL substitutes listed in the row. Do not stop after finding just one.
    4. For every part found (Original and ALL Substitutes), check if a file in the "Uploaded Filenames" list matches it.
    
    Uploaded Filenames List:
    ${JSON.stringify(filenames)}
    
    Rules:
    - Loose Matching: If Master List says "NTTFS080N10" and filename is "NTTFS080N10GTAG.pdf", count it as "Provided".
    - If a part name is found in the Excel but NO file matches, status is "Missing".
    - Output MUST group result by Master List row.
  `;

  const parts: any[] = [{ text: prompt }];

  // Attach Master List (Parsed Text if Excel, Image if PDF/Image)
  const masterContent = getFileContentPart(masterList, "Master List");
  if (masterContent.text) {
    parts.push({ text: masterContent.text });
  } else if (masterContent.inlineData) {
    parts.push({ text: "DOCUMENT: Master List Image/PDF" });
    parts.push(masterContent);
  }

  const partSchema = {
    type: Type.OBJECT,
    properties: {
      partName: { type: Type.STRING },
      status: { type: Type.STRING, enum: ['Provided', 'Missing'] },
      matchedFilename: { type: Type.STRING, nullable: true }
    },
    required: ['partName', 'status']
  };

  const schema = {
    type: Type.OBJECT,
    properties: {
      groupedRows: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            original: partSchema,
            substitutes: { type: Type.ARRAY, items: partSchema } // Must be array to capture B and C
          },
          required: ['original', 'substitutes']
        }
      },
      allProvided: { type: Type.BOOLEAN },
      message: { type: Type.STRING }
    },
    required: ['groupedRows', 'allProvided', 'message']
  };

  try {
    const result = await ai.models.generateContent({
      model: model,
      contents: { role: "user", parts: parts },
      config: { 
        responseMimeType: "application/json", 
        responseSchema: schema,
        temperature: 0.1 
      }
    });
    
    if (!result.text) throw new Error("No response from AI check.");
    
    let jsonStr = result.text.trim();
    if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json\n/, "").replace(/\n```$/, "");
    }
    
    return JSON.parse(jsonStr) as CompletenessResult;
  } catch (error) {
    console.error("Completeness Check Failed:", error);
    throw new Error("Check Failed: " + (error instanceof Error ? error.message : "Unknown error"));
  }
};

// --- Step 4: Analysis Function ---
export const analyzeDatasheets = async (
  masterList: FileData,
  datasheets: FileData[]
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  validateMimeType(masterList);
  datasheets.forEach(ds => validateMimeType(ds));

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash"; 

  const filenames = datasheets.map(d => d.file.name);

  const parts: any[] = [];

  let promptText = `
    Role: Senior Procurement & R&D Validation Assistant.
    Goal: Compare electronic components (Original vs Substitutes) for EVERY row in the 'Master List'.

    Uploaded Datasheets:
    ${JSON.stringify(filenames)}

    Instructions:
    1. **Iterate Master List Rows**: The Master List may contain multiple distinct comparison groups (e.g. Row 1: MOSFET A vs B/C; Row 2: Diode X vs Y).
       - You MUST generate a "Comparison Group" for EACH row found in the master list.
       - DO NOT combine different component series into one table.
    
    2. **Component Identification (Smart Mapping)**:
       - For each row, identify Original Part (A) and Substitutes (B, C...).
       - Use "Fuzzy Matching" to find the correct datasheet from the Uploaded Datasheets list.
       - Example: If Master List says "NTTFS080" and file is "NTTFS080N10GTAG.pdf", map them together.
    
    3. **Comparison Table (1-15 Items)**:
       - For EACH group, generate a specific comparison table.
       - Items 1-10: Critical Specs (Matches the component type, e.g., Vds, Id, Rds for MOSFET; Vz, Pd for Zener).
       - Items 11-13: Secondary Specs.
       - Items 14-15: Info/Lifecycle.
       - Determine 'compliance' (Fully Compliant/Partial/Non-Compliant).

    4. **Handling Missing Files**:
       - If a datasheet is missing for Component C, you must still include "Spec C" column but mark values as "N/A (Missing File)".
       - Do not omit the column.

    Output Format: JSON with an array of groups.
  `;

  parts.push({ text: promptText });

  // Attach Master List
  const masterContent = getFileContentPart(masterList, "Master List");
  if (masterContent.text) {
     parts.push({ text: masterContent.text });
  } else {
     parts.push({ text: "DOCUMENT: Master List (Reference)" });
     parts.push(masterContent); // inlineData
  }

  // Attach Datasheets
  if (datasheets.length === 0) {
      throw new Error("No datasheets provided for analysis.");
  }

  datasheets.forEach((ds, index) => {
    const dsContent = getFileContentPart(ds, `Datasheet File #${index+1}: ${ds.file.name}`);
    if (dsContent.text) {
        parts.push({ text: dsContent.text });
    } else {
        parts.push({ text: `DOCUMENT (File #${index+1}): Filename: ${ds.file.name}` });
        parts.push(dsContent); // inlineData
    }
  });

  const specItemSchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.INTEGER },
      parameter: { type: Type.STRING },
      unit: { type: Type.STRING },
      valueA: { type: Type.STRING },
      valueB: { type: Type.STRING },
      complianceB: { type: Type.STRING, enum: [ComplianceLevel.FULLY_COMPLIANT, ComplianceLevel.PARTIAL, ComplianceLevel.NON_COMPLIANT] },
      valueC: { type: Type.STRING },
      complianceC: { type: Type.STRING, enum: [ComplianceLevel.FULLY_COMPLIANT, ComplianceLevel.PARTIAL, ComplianceLevel.NON_COMPLIANT] },
      comment: { type: Type.STRING }
    },
    // Added comment to required to prevent null values in export
    required: ["id", "parameter", "valueA", "valueB", "complianceB", "valueC", "complianceC", "comment"]
  };

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      missingFiles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of part numbers that had NO attached PDF." },
      groups: {
        type: Type.ARRAY,
        description: "List of comparison groups (one per row in Master List)",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            rowNumber: { type: Type.INTEGER },
            summary: { type: Type.STRING, description: "Executive summary for this specific component group." },
            mappedParts: {
                type: Type.OBJECT,
                properties: {
                    partA: { type: Type.STRING },
                    partB: { type: Type.STRING },
                    partC: { type: Type.STRING },
                }
            },
            recommendation: { type: Type.STRING, enum: ["B", "C", "None", "Both"] },
            specs: {
              type: Type.ARRAY,
              items: specItemSchema
            }
          },
          required: ["id", "rowNumber", "summary", "mappedParts", "recommendation", "specs"]
        }
      }
    },
    required: ["groups", "missingFiles"]
  };

  try {
    const result = await ai.models.generateContent({
      model: model,
      contents: { role: "user", parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      }
    });

    if (!result.text) {
      throw new Error("No response from AI.");
    }
    
    let jsonStr = result.text.trim();
    if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json\n/, "").replace(/\n```$/, "");
    }

    return JSON.parse(jsonStr) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw new Error("AI Analysis Failed: " + (error instanceof Error ? error.message : "Unknown error"));
  }
};