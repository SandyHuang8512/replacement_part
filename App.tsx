import React, { useState } from 'react';
import { FileUploadCard } from './components/FileUpload';
import { AnalysisTable } from './components/AnalysisTable';
import { CompletenessCheck } from './components/CompletenessCheck';
import { AppState, FileData } from './types';
import { analyzeDatasheets, checkFileCompleteness } from './services/geminiService';
import { CircuitBoard, Sparkles, Loader2, FileText, Trash2, ListChecks, PlayCircle } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    masterList: null,
    datasheets: [],
    isAnalyzing: false,
    isChecking: false,
    checkResult: null,
    result: null,
    error: null
  });

  const handleDatasheetSelect = (newFiles: FileData | FileData[] | null) => {
    if (!newFiles) return;
    const newArray = Array.isArray(newFiles) ? newFiles : [newFiles];
    
    // Reset checks if files change
    setState(prev => ({
      ...prev,
      datasheets: [...prev.datasheets, ...newArray],
      checkResult: null, 
      result: null
    }));
  };

  const removeDatasheet = (id: string) => {
    setState(prev => ({
      ...prev,
      datasheets: prev.datasheets.filter(f => f.id !== id),
      checkResult: null // Reset check if file removed
    }));
  };

  // Step 3: Completeness Check
  const handleCheckCompleteness = async () => {
    if (!state.masterList || state.datasheets.length === 0) return;
    
    setState(prev => ({ ...prev, isChecking: true, error: null }));
    try {
      const filenames = state.datasheets.map(d => d.file.name);
      const result = await checkFileCompleteness(state.masterList, filenames);
      setState(prev => ({ ...prev, isChecking: false, checkResult: result }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ ...prev, isChecking: false, error: "檢查失敗 (Check Failed): " + (err.message || "Please check your API Key or File content.") }));
    }
  };

  // Step 4: Full Analysis
  const handleAnalyze = async () => {
    if (!state.masterList || state.datasheets.length === 0) return;

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));
    
    try {
      const result = await analyzeDatasheets(state.masterList, state.datasheets);
      setState(prev => ({ ...prev, result, isAnalyzing: false }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        error: err.message || "Analysis failed. Please try again." 
      }));
    }
  };

  const reset = () => {
    setState({
      masterList: null,
      datasheets: [],
      isAnalyzing: false,
      isChecking: false,
      checkResult: null,
      result: null,
      error: null
    });
  };

  if (state.result) {
    // Full screen view for results
    return (
        <AnalysisTable result={state.result} onReset={reset} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6">
      
      {/* Header */}
      <div className="text-center mb-10 max-w-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
             <CircuitBoard className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">替代料規格比對系統</h1>
        <p className="text-slate-500 mt-2">Intelligent Sub-Source Validator</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        <div className="p-8">
          {state.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm animate-pulse flex items-center gap-2">
              <span className="font-bold">錯誤 (Error):</span> {state.error}
            </div>
          )}

          {/* LAYER 1: Uploads (Side by Side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            
            {/* Step 1: Master List (LEFT) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-bold shadow-md">1</span>
                <div>
                    <h3 className="font-bold text-lg text-slate-800">上傳基準總表</h3>
                    <p className="text-xs text-slate-500 font-mono">(Master List: A vs B/C)</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 h-full">
                  <div className="mb-4 bg-indigo-50 text-indigo-700 text-xs p-3 rounded-lg border border-indigo-100 leading-relaxed">
                      <strong>支援檔案：</strong> Excel (.xlsx, .xls), PDF, 圖片。<br/>
                      AI will extract text from Excel automatically.
                  </div>
                  <FileUploadCard 
                    label="Master List Upload" 
                    subLabel="Excel, PDF, Images"
                    accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg"
                    fileData={state.masterList} 
                    required
                    onFileSelect={(f) => setState(prev => ({...prev, masterList: f as FileData, checkResult: null}))} 
                  />
              </div>
            </div>

            {/* Step 2: Datasheets (RIGHT) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold shadow-md">2</span>
                 <div>
                    <h3 className="font-bold text-lg text-slate-800">上傳所有規格書</h3>
                    <p className="text-xs text-slate-500 font-mono">(Upload All Datasheets)</p>
                 </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 h-full flex flex-col">
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      請拖曳上傳所有相關的 PDF (A料件, B料件, C料件)。檔名請盡量包含料號。
                  </p>
                  
                  <FileUploadCard 
                    label="Drag & Drop Datasheets" 
                    subLabel="PDF Recommended"
                    multiple
                    hasUploadedFiles={state.datasheets.length > 0}
                    onFileSelect={handleDatasheetSelect} 
                  />

                  {/* File List */}
                  {state.datasheets.length > 0 && (
                    <div className="mt-4 bg-white rounded-lg border border-slate-200 p-3 flex-1 min-h-[100px] max-h-[200px] overflow-y-auto custom-scrollbar">
                      <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            已選擇檔案 ({state.datasheets.length})
                          </h4>
                          <button onClick={() => setState(prev => ({...prev, datasheets: [], checkResult: null}))} className="text-xs text-red-400 hover:text-red-600">Clear All</button>
                      </div>
                      <div className="space-y-2">
                        {state.datasheets.map((file) => (
                          <div key={file.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 hover:border-blue-200 transition-colors">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <span className="text-xs text-slate-700 truncate" title={file.file.name}>{file.file.name}</span>
                            </div>
                             <button onClick={() => removeDatasheet(file.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="flex flex-col items-center space-y-8 pt-6 border-t border-slate-100">
             
             {/* Step 3 Trigger: Check Completeness */}
             <div className="w-full flex justify-center">
                 <button
                    onClick={handleCheckCompleteness}
                    disabled={!state.masterList || state.datasheets.length === 0 || state.isChecking}
                    className={`
                        flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm tracking-wide transition-all shadow-md
                        ${(!state.masterList || state.datasheets.length === 0) 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg transform hover:-translate-y-0.5'}
                    `}
                 >
                    {state.isChecking ? (
                        <>
                           <Loader2 className="w-4 h-4 animate-spin" />
                           正在檢查檔案完整性... (Checking...)
                        </>
                    ) : (
                        <>
                           <ListChecks className="w-4 h-4" />
                           檢查檔案完整性 (Check Completeness)
                        </>
                    )}
                 </button>
             </div>

             {/* Check Result Display */}
             {state.checkResult && (
                 <div className="w-full animate-fade-in-up">
                    <CompletenessCheck data={state.checkResult} />
                    
                    {/* Step 4 Trigger: Analyze */}
                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={handleAnalyze}
                            disabled={state.isAnalyzing}
                            className={`
                                relative group flex items-center gap-3 px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] overflow-hidden
                                ${state.isAnalyzing ? 'cursor-wait opacity-80' : ''}
                            `}
                        >
                            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 -skew-x-12"></div>
                            
                            {state.isAnalyzing ? (
                                <>
                                   <Loader2 className="w-6 h-6 animate-spin" />
                                   正在進行 AI 規格比對分析... (Analyzing...)
                                </>
                            ) : (
                                <>
                                   <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                                   <span>開始 AI 規格比對 (Start Analysis)</span>
                                   <PlayCircle className="w-5 h-5 opacity-60" />
                                </>
                            )}
                        </button>
                    </div>
                 </div>
             )}
          </div>

        </div>
      </div>

      <footer className="mt-12 text-slate-400 text-xs text-center">
          <p>Powered by Google Gemini 2.5 Flash</p>
      </footer>
    </div>
  );
};

export default App;