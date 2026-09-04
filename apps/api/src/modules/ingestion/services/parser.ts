import * as fs from 'fs';
import * as xlsxModule from 'xlsx';
import Papa from 'papaparse';

const xlsx = (xlsxModule as any).default ?? xlsxModule;

export async function parseFile(filePath: string, fileType: string): Promise<any[]> {
  if (fileType.includes('csv') || filePath.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  } else if (fileType.includes('spreadsheetml') || fileType.includes('excel') || filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
    return data;
  }
  
  throw new Error('Unsupported file type');
}
