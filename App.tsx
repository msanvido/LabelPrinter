import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layout, 
  Type, 
  Database, 
  AlertCircle, 
  Check, 
  Plus, 
  RefreshCw, 
  Filter, 
  X,
  ChevronRight,
  Download,
  Trash2,
  FileDown,
  FileText
} from 'lucide-react';
import { jsPDF } from "jspdf";
import { Card } from './components/Card';
import { Button } from './components/Button';
import { parseRawInput } from './utils/csv';
import { LabelRecord, TextAlign } from './types';

// Avery 5160 constants
const LABELS_PER_PAGE = 30;

const DEFAULT_CSV = `Name,Address,City,State,ZIP,Country
"John Doe",123 Maple St,Springfield,IL,62704,USA
"Jane Smith",456 Oak Ave,Metropolis,NY,10012,USA
"Bob Johnson",789 Pine Rd,Gotham,NJ,07001,USA
"Alice Williams",321 Elm St,Smallville,KS,66002,USA
"Charlie Brown",654 Cedar Ln,Peanuts,CA,90210,USA
`;

const PRESETS = [
  {
    name: "USA",
    template: "<Name>\n<Address>\n<City>, <State> <ZIP>"
  },
  {
    name: "Europe",
    template: "<Name>\n<Address>\n<ZIP> <City>, <State>\n<Country>"
  },
  {
    name: "Canada",
    template: "<Name>\n<Address>\n<City> <State>\n<ZIP>\n<Country>"
  }
];

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'input' | 'preview'>('input');
  const [rawData, setRawData] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<LabelRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Filtering
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());

  // Template & Appearance
  const [labelTemplate, setLabelTemplate] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(11);
  const [textAlign, setTextAlign] = useState<TextAlign>('left');

  // --- Effects ---

  // Initialize with default data
  useEffect(() => {
    if (rawData === '') {
        setRawData(DEFAULT_CSV);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse Data Effect
  useEffect(() => {
    const { headers: newHeaders, data: newData } = parseRawInput(rawData);
    setHeaders(newHeaders);
    setParsedData(newData);

    // Auto-generate template if empty and we have data
    if (!labelTemplate && newHeaders.length > 0) {
        const lowerHeaders = newHeaders.map(h => h.toLowerCase());
        const has = (term: string) => newHeaders.find(h => h.toLowerCase().includes(term));
        
        const name = has('name') || newHeaders[0];
        const addr = has('address') || has('street');
        const city = has('city');
        const state = has('state');
        const zip = has('zip') || has('postal') || has('code');
        
        let defaultTemp = `<${name}>`;
        if (addr) defaultTemp += `\n<${addr}>`;
        if (city || state || zip) {
            defaultTemp += `\n`;
            if (city) defaultTemp += `<${city}>`;
            if (city && state) defaultTemp += `, `;
            if (state) defaultTemp += `<${state}> `;
            if (zip) defaultTemp += `<${zip}>`;
        } else if (newHeaders.length > 1 && newHeaders[1] !== name && newHeaders[1] !== addr) {
             defaultTemp += `\n<${newHeaders[1]}>`;
        }
        setLabelTemplate(defaultTemp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData]);

  // --- Filtering Logic ---

  const uniqueFilterValues = useMemo(() => {
    if (!filterColumn || !parsedData.length) return [];
    const values = parsedData
      .map(row => row[filterColumn])
      .filter(v => v !== undefined && v !== null && v.trim() !== '');
    return [...new Set(values)].sort();
  }, [parsedData, filterColumn]);

  useEffect(() => {
    if (filterColumn) {
      setSelectedFilters(new Set(uniqueFilterValues));
    } else {
      setSelectedFilters(new Set());
    }
  }, [uniqueFilterValues, filterColumn]);

  const toggleFilter = (val: string) => {
    const newSet = new Set(selectedFilters);
    if (newSet.has(val)) newSet.delete(val);
    else newSet.add(val);
    setSelectedFilters(newSet);
  };

  const processedData = useMemo(() => {
    if (!filterColumn) return parsedData;
    return parsedData.filter(row => {
      const val = row[filterColumn];
      if (!val || val.trim() === '') return false; 
      return selectedFilters.has(val);
    });
  }, [parsedData, filterColumn, selectedFilters]);

  // --- PDF Generation Handler ---

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    
    // Allow UI to update before blocking with PDF generation
    setTimeout(() => {
      try {
        // Initialize PDF - Letter size, Inches
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'in',
          format: 'letter' // 8.5 x 11 inches
        });

        // Set Font
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fontSize);

        // Avery 5160 Dimensions (Inches)
        const MARGIN_TOP = 0.5;
        const MARGIN_LEFT = 0.21975;
        const COL_WIDTH = 2.625;
        const ROW_HEIGHT = 1.0;
        const HORIZ_GAP = 0.125;
        const PADDING_INTERNAL = 0.125;

        processedData.forEach((record, index) => {
           // Add new page every 30 labels
           if (index > 0 && index % LABELS_PER_PAGE === 0) {
              doc.addPage();
           }

           // Calculate grid position
           const pageIndex = index % LABELS_PER_PAGE;
           const col = pageIndex % 3;
           const row = Math.floor(pageIndex / 3);

           // Calculate coordinates
           const xStart = MARGIN_LEFT + (col * (COL_WIDTH + HORIZ_GAP));
           const yStart = MARGIN_TOP + (row * ROW_HEIGHT);

           // Parse Content
           const lines = labelTemplate.split('\n').map(line => 
              line.replace(/<([^>]+)>/g, (_, key) => record[key] || '')
           );

           // Determine Text X Position based on Alignment
           let xText = xStart + PADDING_INTERNAL;
           if (textAlign === 'center') {
              xText = xStart + (COL_WIDTH / 2);
           } else if (textAlign === 'right') {
              xText = xStart + COL_WIDTH - PADDING_INTERNAL;
           }

           // Determine Text Y Position (Top Padding)
           const yText = yStart + PADDING_INTERNAL;

           // Render Text
           doc.text(lines, xText, yText, {
              align: textAlign,
              baseline: 'top',
              lineHeightFactor: 1.15
           });
        });

        doc.save("labels.pdf");
      } catch (err) {
        console.error("PDF Generation failed", err);
        alert("Failed to generate PDF");
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  const insertTag = (tag: string) => {
    setLabelTemplate(prev => prev + `<${tag}>`);
  };

  const clearData = () => {
    if (window.confirm("Are you sure you want to clear all data?")) {
        setRawData('');
        setLabelTemplate('');
    }
  };

  const resetTemplate = () => {
    setLabelTemplate('');
    const current = rawData;
    setRawData(''); 
    setTimeout(() => setRawData(current), 10);
  };

  // --- Rendering Helpers ---

  const chunkedData = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < processedData.length; i += LABELS_PER_PAGE) {
      chunks.push(processedData.slice(i, i + LABELS_PER_PAGE));
    }
    return chunks;
  }, [processedData]);

  const LabelContent: React.FC<{ record: LabelRecord }> = ({ record }) => {
    if (!record) return null;
    const lines = labelTemplate.split('\n');

    return (
      <div 
        className="flex flex-col justify-center h-full w-full overflow-hidden leading-tight font-sans text-slate-900" 
        style={{ fontSize: `${fontSize}pt`, textAlign }}
      >
        {lines.map((line, lineIdx) => {
            const content = line.replace(/<([^>]+)>/g, (match, key) => {
                return record[key] !== undefined ? record[key] : match;
            });
            if (line.length > 0 && content.trim() === '') return null;
            return (
                <div key={lineIdx} className="whitespace-pre-wrap min-h-[1em]">
                    {content}
                </div>
            );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* Styles for Web Preview only */}
      <style>{`
        .web-preview-sheet {
          width: 8.5in;
          height: 11in;
          background: white;
          display: grid;
          grid-template-columns: repeat(3, 2.625in);
          grid-template-rows: repeat(10, 1in);
          column-gap: 0.125in;
          padding-top: 0.5in;
          padding-left: 0.22in;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          margin-bottom: 2rem;
          transform-origin: top center;
        }
        .web-preview-label {
          border: 1px dashed #e2e8f0;
          border-radius: 4px;
          padding: 0.125in;
          overflow: hidden;
          transition: all 0.2s;
        }
        .web-preview-label:hover {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }
      `}</style>

      {/* --- Navigation Bar --- */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm">
                <FileDown size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 tracking-tight">LabelPrinter Pro</span>
                <span className="text-xs text-slate-500 font-medium">Avery 5160 PDF Generator</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-slate-100 rounded-lg p-1 flex">
                <button 
                  onClick={() => setActiveTab('input')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'input' 
                      ? 'bg-white shadow text-blue-600' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2"><Database size={16}/> Data & Design</span>
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'preview' 
                      ? 'bg-white shadow text-blue-600' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2"><Layout size={16}/> Preview</span>
                </button>
              </div>
              
              <div className="h-8 w-px bg-slate-200 mx-1"></div>

              <Button 
                onClick={handleDownloadPDF} 
                variant="primary" 
                disabled={processedData.length === 0 || isGenerating}
                title="Generate and download PDF"
              >
                {isGenerating ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                {isGenerating ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* === TAB 1: INPUT & DESIGN === */}
        {activeTab === 'input' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Left Column: Data Input */}
            <div className="xl:col-span-7 space-y-6">
              
              {/* Data Entry Card */}
              <Card className="flex flex-col h-[500px]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded text-blue-600"><Database size={18} /></div>
                    <div>
                      <h2 className="font-semibold text-slate-800 text-sm">Data Source</h2>
                      <p className="text-xs text-slate-500">Paste CSV or Excel data</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                        {parsedData.length} records
                      </span>
                     <Button variant="ghost" onClick={clearData} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Clear Data">
                        <Trash2 size={16} />
                     </Button>
                  </div>
                </div>
                
                <div className="flex-grow relative">
                    <textarea
                        className="absolute inset-0 w-full h-full p-4 font-mono text-xs leading-relaxed outline-none resize-none focus:bg-blue-50/10 transition-colors"
                        placeholder={`Name,Address,City,State,ZIP\n"John Doe",123 Main St,Anytown,CA,90210...`}
                        value={rawData}
                        onChange={(e) => setRawData(e.target.value)}
                        spellCheck={false}
                    />
                </div>
                <div className="p-2 border-t border-slate-100 bg-white text-[10px] text-slate-400 text-center uppercase font-semibold tracking-wider">
                    First row must contain headers
                </div>
              </Card>

              {/* Filtering Card */}
              {parsedData.length > 0 && (
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-100 rounded text-purple-600"><Filter size={18} /></div>
                        <h2 className="font-semibold text-slate-800 text-sm">Filter Records</h2>
                    </div>
                    {filterColumn && (
                       <span className="text-xs font-medium px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100">
                         Showing {processedData.length} of {parsedData.length}
                       </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-grow max-w-xs">
                        <select 
                        className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        value={filterColumn}
                        onChange={(e) => setFilterColumn(e.target.value)}
                        >
                        <option value="">Select a column to filter...</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>
                    {filterColumn && (
                        <Button variant="ghost" onClick={() => setFilterColumn('')} className="text-slate-500">
                            <X size={16} /> Clear
                        </Button>
                    )}
                  </div>

                  {filterColumn && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Values in "{filterColumn}"</span>
                            <div className="flex gap-3 text-xs">
                                <button onClick={() => setSelectedFilters(new Set(uniqueFilterValues))} className="text-blue-600 hover:text-blue-800 font-medium">Select All</button>
                                <button onClick={() => setSelectedFilters(new Set())} className="text-slate-500 hover:text-slate-700 font-medium">Deselect All</button>
                            </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2 pr-2 custom-scrollbar">
                            {uniqueFilterValues.map(val => (
                                <label key={val} className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-slate-200 hover:shadow-sm">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedFilters.has(val)}
                                        onChange={() => toggleFilter(val)}
                                        className="rounded text-purple-600 focus:ring-purple-500 border-slate-300 w-4 h-4"
                                    />
                                    <span className="truncate text-slate-700" title={val}>{val}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                  )}
                  
                   <div className="mt-6 pt-4 border-t border-slate-100">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Check size={14} /> Preview Matches
                     </h3>
                     <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-left text-xs bg-white">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                            {headers.map((h, i) => <th key={i} className="px-4 py-3 whitespace-nowrap">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedData.length === 0 ? (
                                <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-400">No records found.</td></tr>
                            ) : (
                                processedData.slice(0, 3).map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    {headers.map((h, j) => <td key={j} className="px-4 py-2.5 whitespace-nowrap text-slate-700 max-w-[150px] truncate">{row[h]}</td>)}
                                </tr>
                                ))
                            )}
                        </tbody>
                        </table>
                     </div>
                     {processedData.length > 3 && (
                        <div className="text-center text-xs text-slate-400 mt-3 font-medium">
                            + {processedData.length - 3} more records
                        </div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column: Template Design */}
            <div className="xl:col-span-5 space-y-6">
               <Card className="h-full flex flex-col min-h-[500px]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 rounded text-indigo-600"><Layout size={18} /></div>
                    <div>
                      <h2 className="font-semibold text-slate-800 text-sm">Label Design</h2>
                      <p className="text-xs text-slate-500">Customize layout and style</p>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={resetTemplate} title="Reset Template">
                      <RefreshCw size={14} />
                  </Button>
                </div>

                <div className="p-5 flex-grow flex flex-col gap-6">
                    {/* Style Controls */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Font Size</label>
                             <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1.5 px-3">
                                <Type size={14} className="text-slate-400"/>
                                <input 
                                    type="range" 
                                    min="8" 
                                    max="16" 
                                    step="0.5"
                                    value={fontSize} 
                                    onChange={(e) => setFontSize(parseFloat(e.target.value))}
                                    className="flex-grow h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <span className="text-xs font-mono font-medium w-8 text-right">{fontSize}</span>
                             </div>
                        </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alignment</label>
                             <div className="flex bg-slate-100 rounded-lg p-1">
                                {(['left', 'center', 'right'] as const).map(align => (
                                    <button
                                        key={align}
                                        onClick={() => setTextAlign(align)}
                                        className={`flex-1 capitalize text-xs py-1.5 rounded-md transition-all ${textAlign === align ? 'bg-white shadow text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {align}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Variable Tags */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Insert Variables</label>
                         {headers.length === 0 ? (
                            <div className="text-xs text-slate-400 italic p-2 border border-dashed border-slate-200 rounded">No headers detected yet. Add data first.</div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {headers.map(h => (
                                    <button 
                                        key={h}
                                        onClick={() => insertTag(h)}
                                        className="group text-xs bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 px-2.5 py-1.5 rounded-md border border-slate-200 transition-all shadow-sm flex items-center gap-1.5"
                                    >
                                        <Plus size={10} className="text-slate-400 group-hover:text-indigo-500" /> {h}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Presets */}
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quick Templates</label>
                         <div className="flex flex-wrap gap-2">
                            {PRESETS.map(preset => (
                                <button 
                                    key={preset.name}
                                    onClick={() => setLabelTemplate(preset.template)}
                                    className="text-xs bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-md border border-slate-200 transition-all shadow-sm flex items-center gap-2 group"
                                    title="Replace current template"
                                >
                                    <FileText size={14} className="text-slate-400 group-hover:text-blue-500" />
                                    <span className="font-medium">{preset.name}</span>
                                </button>
                            ))}
                         </div>
                    </div>

                    {/* Editor */}
                    <div className="flex-grow flex flex-col">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Template Editor</label>
                        <div className="flex-grow relative rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all overflow-hidden bg-white">
                             <textarea 
                                value={labelTemplate}
                                onChange={(e) => setLabelTemplate(e.target.value)}
                                className="w-full h-full p-4 text-sm outline-none font-mono leading-relaxed resize-none"
                                placeholder={`Enter text and variables...\n<Name>\n<Address>\n<City>, <State> <ZIP>`}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                            <AlertCircle size={10} /> Variables must match column headers exactly.
                        </p>
                    </div>
                </div>
               </Card>
            </div>
          </div>
        )}

        {/* === TAB 2: PREVIEW === */}
        {activeTab === 'preview' && (
          <div className="flex flex-col items-center">
            
            <div className="w-full max-w-4xl mb-6 flex items-center justify-between">
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Check size={24} className="text-green-500" />
                    Print Preview
                 </h2>
                 <div className="bg-yellow-50 text-yellow-800 text-sm px-4 py-2 rounded-lg border border-yellow-100 flex items-center gap-2 shadow-sm">
                    <AlertCircle size={16} />
                    <span>Important: When printing PDF, ensure scale is set to <strong>100%</strong> or <strong>"Actual Size"</strong>.</span>
                 </div>
            </div>

            <div className="w-full overflow-auto flex flex-col items-center gap-10 pb-20">
                {processedData.length === 0 && (
                <div className="text-center py-20">
                    <div className="bg-slate-100 rounded-full p-6 inline-block mb-4">
                        <Database size={48} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No Labels to Preview</h3>
                    <p className="text-slate-500">Check your data source or clear your filters.</p>
                </div>
                )}
                
                {chunkedData.map((chunk, pageIdx) => (
                <div key={pageIdx} className="relative group">
                     {/* Page Number Indicator */}
                    <div className="absolute -left-12 top-0 text-slate-300 font-mono text-sm font-bold rotate-[-90deg] origin-right translate-y-8">
                        PAGE {pageIdx + 1}
                    </div>
                    
                    <div className="web-preview-sheet">
                        {chunk.map((record, i) => (
                        <div key={i} className="web-preview-label">
                            <LabelContent record={record} />
                        </div>
                        ))}
                    </div>
                </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}