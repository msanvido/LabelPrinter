/**
 * Robust CSV parser that handles quoted values and mixed line endings.
 */
export const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  
  // Normalize line endings
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i+1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentVal);
        currentVal = '';
      } else if (char === '\n') {
        currentRow.push(currentVal);
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }
  
  // Push last value/row if exists
  if (currentVal || currentRow.length > 0) {
      currentRow.push(currentVal);
      rows.push(currentRow);
  }
  
  return rows;
};

/**
 * Heuristic to detect if text is Tab-Separated Values (TSV) or CSV
 */
export const parseRawInput = (text: string): { headers: string[], data: Record<string, string>[] } => {
    if (!text.trim()) return { headers: [], data: [] };

    const firstLine = text.split('\n')[0];
    const isTab = firstLine.includes('\t');
    
    let rows: string[][] = [];
    if (isTab) {
        // Simple tab split for copy-paste from Excel
        rows = text.split('\n').filter(r => r.trim()).map(line => line.split('\t'));
    } else {
        // Robust CSV parse
        rows = parseCSV(text);
    }

    if (rows.length < 2) return { headers: [], data: [] }; // Need at least header + 1 row

    // Extract Headers
    const potentialHeaders = rows[0].map(h => h.trim());

    // Extract Data
    const data = rows.slice(1).map(values => {
      const obj: Record<string, string> = {};
      potentialHeaders.forEach((h, i) => {
        let val = values[i] || '';
        obj[h] = val.trim(); 
      });
      return obj;
    });

    return { headers: potentialHeaders, data };
}