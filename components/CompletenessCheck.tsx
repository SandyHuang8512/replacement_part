
import React from 'react';
import { CompletenessResult, CompletenessPart } from '../types';
import { CheckCircle2, XCircle, FileSearch, Check, AlertOctagon, ArrowRight } from 'lucide-react';

interface Props {
  data: CompletenessResult;
}

// Helper component for a single part chip (Compact Horizontal Version)
const PartStatusChip: React.FC<{ part: CompletenessPart; label: string }> = ({ part, label }) => {
  const isProvided = part.status === 'Provided';
  const bgColor = isProvided ? 'bg-green-50' : 'bg-red-50';
  const borderColor = isProvided ? 'border-green-200' : 'border-red-200';
  const textColor = isProvided ? 'text-green-800' : 'text-red-800';
  
  // Style based on label. If it contains a hyphen (e.g. A-1), it's a substitute.
  const isSubstitute = label.includes('-');
  
  const badgeStyle = !isSubstitute
    ? 'bg-blue-100 text-blue-700 border-blue-200' 
    : 'bg-purple-100 text-purple-700 border-purple-200';

  return (
    <div className={`flex items-center justify-between border rounded-md px-2 py-1.5 ${bgColor} ${borderColor} transition-all w-full shadow-sm gap-2 h-12`}>
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {/* Badge A, A-1, B... */}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeStyle} shrink-0 w-10 text-center whitespace-nowrap`}>
            {label}
          </span>

          <div className="flex flex-col min-w-0 justify-center">
             {/* Part Name */}
             <div className={`font-bold text-xs truncate leading-tight ${textColor}`} title={part.partName}>
                {part.partName || "Unknown"}
             </div>
             {/* Filename subtext */}
             <div className="flex items-center gap-1 text-[9px] text-slate-500 overflow-hidden leading-tight">
                <FileSearch className={`w-2.5 h-2.5 flex-shrink-0 ${isProvided ? 'text-green-500' : 'text-slate-400'}`} />
                <span className={`truncate max-w-[120px] ${isProvided ? 'text-green-600' : 'text-slate-400 italic'}`}>
                    {part.matchedFilename || "No file"}
                </span>
             </div>
          </div>
      </div>
      
      {/* Status Icon - Strictly fixed width/height to prevent wrapping */}
      <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
          {isProvided ? (
             <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
             <XCircle className="w-5 h-5 text-red-500" />
          )}
      </div>
    </div>
  );
};

export const CompletenessCheck: React.FC<Props> = ({ data }) => {
  return (
    <div className={`border rounded-xl p-6 animate-fade-in shadow-sm ${data.allProvided ? 'bg-green-50/50 border-green-200' : 'bg-white border-slate-200'}`}>
      
      {/* Header Section */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${data.allProvided ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
          {data.allProvided ? <Check className="w-6 h-6" /> : <AlertOctagon className="w-6 h-6" />}
        </div>
        <div>
           <h3 className={`text-lg font-bold ${data.allProvided ? 'text-green-800' : 'text-slate-800'}`}>
             資料完整性檢查 (Data Completeness)
           </h3>
           <p className={`text-sm ${data.allProvided ? 'text-green-600' : 'text-slate-500'}`}>
             {data.message}
           </p>
        </div>
      </div>

      {/* Table-like Structure */}
      <div className="w-full bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
           <div className="col-span-12 md:col-span-4 px-4 py-3">原始料件 (Original)</div>
           <div className="hidden md:block col-span-1 px-0 py-3 text-center"></div>
           <div className="col-span-12 md:col-span-7 px-4 py-3">替代料件 (Substitutes)</div>
        </div>

        <div className="divide-y divide-slate-100">
          {data.groupedRows.map((row, idx) => {
             // Generate Letter based on row index (0=A, 1=B, 2=C...)
             const groupLetter = String.fromCharCode(65 + idx);
             
             return (
              <div key={idx} className="grid grid-cols-12 items-center hover:bg-slate-50/50 transition-colors py-2">
                
                {/* Original Part Column (A, B, C...) */}
                <div className="col-span-12 md:col-span-4 px-4 py-2 border-b md:border-b-0 md:border-r border-slate-100">
                   <PartStatusChip part={row.original} label={groupLetter} />
                </div>

                {/* Arrow Indicator (Desktop) */}
                <div className="hidden md:flex col-span-1 items-center justify-center text-slate-300">
                   <ArrowRight className="w-5 h-5" />
                </div>

                {/* Substitutes Column (A-1, B-1...) */}
                <div className="col-span-12 md:col-span-7 px-4 py-2">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {row.substitutes.map((sub, sIdx) => {
                      const subLabel = `${groupLetter}-${sIdx + 1}`;
                      return <PartStatusChip key={sIdx} part={sub} label={subLabel} />;
                    })}
                    {row.substitutes.length === 0 && (
                       <span className="text-sm text-slate-400 italic py-1">無替代料 (No substitutes listed)</span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
