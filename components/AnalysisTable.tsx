import React from 'react';
import { AnalysisResult, ComplianceLevel, ComparisonGroup } from '../types';
import { CheckCircle, AlertTriangle, XCircle, FileSpreadsheet, AlertOctagon, Layers, ArrowDown, ArrowLeft, CircuitBoard } from 'lucide-react';

interface Props {
  result: AnalysisResult;
  onReset: () => void;
}

const ComplianceIcon = ({ level }: { level: ComplianceLevel }) => {
  switch (level) {
    case ComplianceLevel.FULLY_COMPLIANT:
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case ComplianceLevel.PARTIAL:
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    case ComplianceLevel.NON_COMPLIANT:
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return null;
  }
};

const ComplianceBadge = ({ level }: { level: ComplianceLevel }) => {
   const colors = {
    [ComplianceLevel.FULLY_COMPLIANT]: "bg-green-100 text-green-800 border-green-200",
    [ComplianceLevel.PARTIAL]: "bg-yellow-100 text-yellow-800 border-yellow-200",
    [ComplianceLevel.NON_COMPLIANT]: "bg-red-100 text-red-800 border-red-200",
  };

  if (!level) return <span className="text-slate-300">-</span>;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[level]} flex items-center gap-1 w-fit shrink-0`}>
      <ComplianceIcon level={level} />
      {level === ComplianceLevel.FULLY_COMPLIANT ? '符合' : level === ComplianceLevel.PARTIAL ? '需確認' : '不符'}
    </span>
  );
};

export const AnalysisTable: React.FC<Props> = ({ result, onReset }) => {
  
  // Helper to generate group labels (A, B, C...) based on index
  const getGroupLabel = (index: number) => String.fromCharCode(65 + index);

  const exportCSV = () => {
    try {
      if (!result || !result.groups || result.groups.length === 0) {
        alert("沒有資料可以匯出 (No data to export)");
        return;
      }

      let csvRows: string[] = [];
      const BOM = "\uFEFF"; // Add Byte Order Mark for Excel Chinese compatibility

      result.groups.forEach((group, index) => {
          const groupLabel = getGroupLabel(index);
          const sub1Label = `${groupLabel}-1`;
          const sub2Label = `${groupLabel}-2`;

          // Safety checks to prevent crashes on undefined/null values
          const partA = group.mappedParts?.partA || "Part A";
          const partB = group.mappedParts?.partB || "Part B";
          const partC = group.mappedParts?.partC || "Part C";
          const summary = (group.summary || "").replace(/"/g, '""');
          const recommendation = group.recommendation || "-";

          // Group Header
          csvRows.push(`"GROUP ${groupLabel}: ${partA.replace(/"/g, '""')} vs Substitutes"`);
          csvRows.push(`"Summary: ${summary}"`);
          csvRows.push(`"Recommendation: ${recommendation}"`);
          
          // Table Headers - Updated to match UI (A-1, A-2)
          const headers = [
            "ID", 
            "Parameter", 
            "Unit", 
            `Spec ${groupLabel} (${partA.replace(/"/g, '""')})`, 
            `Spec ${sub1Label} (${partB.replace(/"/g, '""')})`, 
            `${sub1Label} Result`, 
            `Spec ${sub2Label} (${partC.replace(/"/g, '""')})`, 
            `${sub2Label} Result`, 
            "Comment"
          ];
          csvRows.push(headers.join(","));

          // Table Data
          if (group.specs && Array.isArray(group.specs)) {
            group.specs.forEach(s => {
                // Robust null handling for all fields
                const param = (s.parameter || "").replace(/"/g, '""');
                const unit = (s.unit || "").replace(/"/g, '""');
                const valA = (s.valueA || "").replace(/"/g, '""');
                const valB = (s.valueB || "").replace(/"/g, '""');
                const compB = s.complianceB || "";
                const valC = (s.valueC || "").replace(/"/g, '""');
                const compC = s.complianceC || "";
                const comment = (s.comment || "").replace(/"/g, '""'); 

                const row = [
                    s.id || "",
                    `"${param}"`,
                    `"${unit}"`,
                    `"${valA}"`,
                    `"${valB}"`,
                    `"${compB}"`,
                    `"${valC}"`,
                    `"${compC}"`,
                    `"${comment}"`
                ];
                csvRows.push(row.join(","));
            });
          }

          // Spacer
          csvRows.push("");
          csvRows.push("");
      });
      
      const csvContent = BOM + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Substitution_Analysis_Report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Export Failed:", err);
      alert("匯出失敗 (Export Failed): " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  // Helper function for cell background color based on compliance
  const getComplianceBgClass = (level: ComplianceLevel) => {
    switch (level) {
      case ComplianceLevel.PARTIAL:
        return 'bg-yellow-50'; // Yellow for Partial/Review Needed
      case ComplianceLevel.NON_COMPLIANT:
        return 'bg-red-50';    // Red for Non-Compliant
      case ComplianceLevel.FULLY_COMPLIANT:
      default:
        return '';             // Unchanged (White/Inherit) for Compliant
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-3">
             <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg text-white shadow-sm">
                 <CircuitBoard className="w-6 h-6" />
             </div>
             <div>
                 <h1 className="text-xl font-bold text-slate-800 leading-tight">執行結果 (Execution Result)</h1>
             </div>
         </div>
         <button 
             onClick={onReset}
             className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all font-medium text-sm group"
         >
             <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
             返回主畫面 (Return to Main)
         </button>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8 animate-fade-in">

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
             <div className="text-slate-500 text-sm">
                 共發現 {result.groups.length} 組比對資料 (Total Groups: {result.groups.length})
             </div>
             <button 
                onClick={exportCSV}
                className="flex items-center gap-2 px-6 py-2.5 text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-md hover:shadow-lg transition-all font-bold text-sm"
            >
                <FileSpreadsheet className="w-4 h-4" />
                匯出總表給 RD (Export Report)
            </button>
        </div>

        {/* Missing Files Alert */}
        {result.missingFiles && result.missingFiles.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
             <AlertOctagon className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
             <div>
               <h3 className="font-bold text-orange-800">資料缺失提醒 (Missing Files Detected)</h3>
               <ul className="list-disc list-inside text-sm text-orange-600 mt-1 font-mono">
                 {result.missingFiles.map((f, i) => <li key={i}>{f}</li>)}
               </ul>
             </div>
          </div>
        )}

        {/* Groups Iterator */}
        {result.groups.map((group, index) => {
          const groupLabel = getGroupLabel(index);
          const sub1Label = `${groupLabel}-1`;
          const sub2Label = `${groupLabel}-2`;

          return (
          <div key={group.id || index} className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Group Header */}
              <div className="bg-slate-800 text-white p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                      <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">Group #{index + 1}</span>
                      <div className="font-mono text-sm md:text-base flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-500/20 rounded border border-blue-500/50 text-blue-200 font-bold">{groupLabel}</span>
                          <span className="text-white font-bold">{group.mappedParts.partA}</span> 
                          
                          <span className="text-slate-500 mx-1">vs</span>
                          
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                            <span className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 bg-purple-500/20 rounded border border-purple-500/50 text-purple-200 text-xs">{sub1Label}</span>
                                <span>{group.mappedParts.partB}</span>
                            </span>
                            {group.mappedParts.partC && group.mappedParts.partC !== "N/A" && (
                                <>
                                    <span className="hidden sm:inline text-slate-500 mx-1">/</span>
                                    <span className="flex items-center gap-1">
                                        <span className="px-1.5 py-0.5 bg-purple-500/20 rounded border border-purple-500/50 text-purple-200 text-xs">{sub2Label}</span>
                                        <span>{group.mappedParts.partC}</span>
                                    </span>
                                </>
                            )}
                          </div>
                      </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                      group.recommendation === 'None' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                  }`}>
                      Rec: {group.recommendation}
                  </div>
              </div>

              {/* Summary */}
              <div className="p-6 bg-slate-50 border-b border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Executive Summary
                  </h4>
                  <p className="text-slate-700 text-sm leading-relaxed">{group.summary || "No summary provided."}</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                              <th className="px-4 py-3 w-10 text-center text-xs">No.</th>
                              <th className="px-4 py-3 w-1/5">規格項目 (Parameter)</th>
                              <th className="px-4 py-3 bg-blue-50/50 w-[18%] text-blue-900">
                                  Spec {groupLabel}
                              </th>
                              <th className="px-4 py-3 bg-purple-50/30 w-[18%] text-purple-900">
                                  Spec {sub1Label}
                              </th>
                              <th className="px-4 py-3 bg-purple-50/30 w-[18%] text-purple-900">
                                  Spec {sub2Label}
                              </th>
                              <th className="px-4 py-3">備註 (Notes)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {group.specs.map((spec) => (
                              <tr key={spec.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">{spec.id}</td>
                                  
                                  {/* Parameter */}
                                  <td className="px-4 py-3 font-medium text-slate-800">
                                      {spec.parameter} 
                                      {spec.unit && <span className="text-slate-400 text-xs ml-1">({spec.unit})</span>}
                                  </td>
                                  
                                  {/* Spec A */}
                                  <td className="px-4 py-3 bg-blue-50/30 text-slate-700 font-mono text-xs border-r border-slate-100">
                                      {spec.valueA}
                                  </td>
                                  
                                  {/* Spec B (Sub 1) - With Conditional Background */}
                                  <td className={`px-4 py-3 border-r border-slate-100 ${getComplianceBgClass(spec.complianceB)}`}>
                                      <div className="space-y-1">
                                          <div className="font-mono text-slate-700 text-xs">{spec.valueB || "-"}</div>
                                          <ComplianceBadge level={spec.complianceB} />
                                      </div>
                                  </td>
                                  
                                  {/* Spec C (Sub 2) - With Conditional Background */}
                                  <td className={`px-4 py-3 border-r border-slate-100 ${getComplianceBgClass(spec.complianceC)}`}>
                                      <div className="space-y-1">
                                          <div className="font-mono text-slate-700 text-xs">{spec.valueC || "-"}</div>
                                          {(spec.valueC && spec.valueC !== '-' && spec.valueC !== 'N/A') && (
                                             <ComplianceBadge level={spec.complianceC} />
                                          )}
                                      </div>
                                  </td>
                                  
                                  {/* Comments */}
                                  <td className="px-4 py-3 text-slate-500 text-xs leading-relaxed">
                                      {spec.comment}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-xs text-slate-400 p-2 bg-slate-50 border-t border-slate-100">
                 <div>Items 1-10: Critical</div>
                 <div>Items 11-13: Secondary</div>
                 <div>Items 14-15: Info</div>
              </div>
          </div>
          );
        })}

        {result.groups.length > 1 && (
           <div className="flex justify-center pt-8">
               <div className="text-slate-400 flex flex-col items-center animate-bounce">
                  <span className="text-xs mb-1">Scroll for more groups</span>
                  <ArrowDown className="w-4 h-4" />
               </div>
           </div>
        )}
      </div>
    </div>
  );
};
