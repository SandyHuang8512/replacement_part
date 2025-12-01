
import React, { useRef } from 'react';
import { Upload, FileText, Check, X, Layers, CheckCircle } from 'lucide-react';
import { FileData } from '../types';
import { fileToBase64 } from '../services/geminiService';

interface Props {
  label: string;
  subLabel?: string;
  accept?: string;
  // If multiple is true, fileData is ignored in display logic inside the dropzone, 
  // but handled via parent list.
  multiple?: boolean; 
  fileData?: FileData | null; // For single file mode
  onFileSelect: (data: FileData | FileData[] | null) => void;
  required?: boolean;
  hasUploadedFiles?: boolean; // New prop for visual feedback in multiple mode
}

export const FileUploadCard: React.FC<Props> = ({ 
  label, 
  subLabel, 
  accept = ".pdf,.png,.jpg,.jpeg", 
  multiple = false,
  fileData, 
  onFileSelect,
  required = false,
  hasUploadedFiles = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File): Promise<FileData> => {
    const base64 = await fileToBase64(file);
    let mimeType: FileData['type'] = 'application/pdf';
    if (file.type.includes('png')) mimeType = 'image/png';
    if (file.type.includes('jpeg') || file.type.includes('jpg')) mimeType = 'image/jpeg';
    if (file.type.includes('sheet') || file.name.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return {
      id: Math.random().toString(36).substr(2, 9),
      file,
      base64,
      type: mimeType
    };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (multiple) {
        const files = Array.from(e.target.files);
        const processed = await Promise.all(files.map(processFile));
        onFileSelect(processed);
      } else {
        const file = e.target.files[0];
        const processed = await processFile(file);
        onFileSelect(processed);
      }
    }
    // Reset value so same file can be selected again if needed
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (multiple) {
         const files = Array.from(e.dataTransfer.files);
         const processed = await Promise.all(files.map(processFile));
         onFileSelect(processed);
      } else {
         const file = e.dataTransfer.files[0];
         const processed = await processFile(file);
         onFileSelect(processed);
      }
    }
  };

  // Single File Display Mode (Completed State)
  if (!multiple && fileData) {
    return (
        <div className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-green-500 bg-green-50 rounded-xl transition-all duration-200 shadow-sm">
           <div className="flex flex-col items-center p-4 text-center animate-fade-in">
             <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 shadow-sm">
               <CheckCircle className="w-8 h-8 text-green-600" />
             </div>
             <p className="text-sm font-bold text-green-900 truncate max-w-[200px]">{fileData.file.name}</p>
             <p className="text-xs text-green-700 font-medium mt-1">上傳成功 (Uploaded)</p>
             <button 
               onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
               className="absolute top-2 right-2 p-1.5 bg-white text-slate-400 hover:text-red-500 rounded-full shadow-sm border border-slate-100"
               title="Remove file"
             >
               <X className="w-4 h-4" />
             </button>
          </div>
        </div>
    );
  }

  // Upload/Dropzone Mode
  const isGreenState = hasUploadedFiles;

  return (
    <div 
      className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed 
        ${isGreenState 
            ? 'border-green-400 bg-green-50/40 hover:bg-green-50/60' 
            : (multiple ? 'border-blue-200 bg-blue-50/30 hover:bg-blue-50/50' : 'border-slate-300 bg-white hover:bg-slate-50')
        } 
        rounded-xl transition-all duration-200 cursor-pointer group`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={inputRef} 
        className="hidden" 
        accept={accept} 
        multiple={multiple}
        onChange={handleFileChange} 
      />
      
      <div className="flex flex-col items-center p-4 text-center group-hover:-translate-y-1 transition-transform duration-300">
        {isGreenState ? (
             <div className="relative">
                <Layers className="w-8 h-8 mb-2 text-green-600 opacity-60" />
                <div className="absolute -right-2 -top-2 bg-white rounded-full p-0.5 shadow-sm border border-green-100">
                    <CheckCircle className="w-5 h-5 text-green-500 fill-green-50" />
                </div>
             </div>
        ) : (
            multiple ? (
                 <Layers className="w-8 h-8 mb-2 text-blue-400" />
            ) : (
                 <Upload className={`w-8 h-8 mb-2 ${required ? 'text-slate-400' : 'text-slate-300'}`} />
            )
        )}
        
        <p className={`text-sm font-semibold ${isGreenState ? 'text-green-800' : 'text-slate-700'}`}>
            {label} {required && <span className="text-red-500">*</span>}
        </p>
        
        {subLabel && <p className={`text-xs mt-1 ${isGreenState ? 'text-green-600' : 'text-slate-400'}`}>{subLabel}</p>}
        
        {isGreenState && (
            <span className="mt-2 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                已上傳 (Files Added)
            </span>
        )}
      </div>
    </div>
  );
};
