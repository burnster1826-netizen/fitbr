
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SheetsRow {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Synchronizes the total nutrition for a specific date from Firestore to Google Sheets.
 */
export async function syncDailyTotals(userId: string, dateStr: string, accessToken: string, spreadsheetId: string) {
  // 1. Fetch all logs for this day from Firestore to get accurate totals
  const qLogs = query(
    collection(db, 'logs'),
    where('userId', '==', userId),
    where('dateStr', '==', dateStr)
  );
  const snapLogs = await getDocs(qLogs);
  
  let totalCals = 0, totalP = 0, totalC = 0, totalF = 0;
  snapLogs.docs.forEach(doc => {
    const d = doc.data();
    totalCals += d.calories || 0;
    totalP += d.protein || 0;
    totalC += d.carbs || 0;
    totalF += d.fat || 0;
  });

  // 2. Perform the update in Google Sheets
  await updateDailySheetRow(accessToken, spreadsheetId, {
    date: dateStr,
    calories: Math.round(totalCals),
    protein: Math.round(totalP),
    carbs: Math.round(totalC),
    fat: Math.round(totalF)
  });
}

export async function findExistingSheet(accessToken: string, title: string = 'Daily Nutrition Tracker'): Promise<string | null> {
  const query = `name = '${title}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    // If it's a 403 or 404, we might not have Drive search access or the scope is restricted
    // but with drive.file we should at least see files we created.
    return null;
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  
  return null;
}

export async function checkSheetExists(accessToken: string, spreadsheetId: string): Promise<boolean> {
  const url = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=id,trashed`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) return false;
    
    const data = await response.json();
    return !data.trashed;
  } catch (err) {
    return false;
  }
}

export async function createNutritionSheet(accessToken: string): Promise<string> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'Daily Nutrition Tracker'
      },
      sheets: [
        {
          properties: {
            title: 'Logs',
            gridProperties: {
              frozenRowCount: 1
            }
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { 
                      userEnteredValue: { stringValue: 'Date' },
                      userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, horizontalAlignment: 'CENTER' }
                    },
                    { 
                      userEnteredValue: { stringValue: 'Calories (Total)' },
                      userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, horizontalAlignment: 'CENTER' }
                    },
                    { 
                      userEnteredValue: { stringValue: 'Protein (Total)' },
                      userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, horizontalAlignment: 'CENTER' }
                    },
                    { 
                      userEnteredValue: { stringValue: 'Carbs (Total)' },
                      userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, horizontalAlignment: 'CENTER' }
                    },
                    { 
                      userEnteredValue: { stringValue: 'Fats (Total)' },
                      userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, horizontalAlignment: 'CENTER' }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to create sheet: ${err.error.message}`);
  }

  const data = await response.json();
  return data.spreadsheetId;
}

export async function updateDailySheetRow(accessToken: string, spreadsheetId: string, row: SheetsRow) {
  // 1. Fetch column A to find the date
  // We use valueRenderOption=UNFORMATTED_VALUE to get the raw data if possible, 
  // but formatted is often safer for string matching if we know the input format.
  const rangeA = 'Logs!A:A';
  const getResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeA}?valueRenderOption=FORMATTED_VALUE`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  const data = await getResponse.json();
  const values = data.values || [];
  
  let rowIndex = -1;
  const targetDate = row.date.trim();

  for (let i = 0; i < values.length; i++) {
    const cellValue = values[i][0];
    if (!cellValue) continue;

    const normalizedCellValue = cellValue.toString().trim();
    
    // Direct match
    if (normalizedCellValue === targetDate) {
      rowIndex = i + 1;
      break;
    }

    // Try parsing both as dates if they look like dates
    try {
      const cellDate = new Date(normalizedCellValue);
      const targetDateObj = new Date(targetDate);
      if (!isNaN(cellDate.getTime()) && !isNaN(targetDateObj.getTime())) {
        if (cellDate.toISOString().split('T')[0] === targetDateObj.toISOString().split('T')[0]) {
          rowIndex = i + 1;
          break;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  const body = {
    values: [[row.date, row.calories, row.protein, row.carbs, row.fat]]
  };

  if (rowIndex !== -1) {
    // 2. Update existing row
    const updateRange = `Logs!A${rowIndex}:E${rowIndex}`;
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Failed to update sheet: ${err.error.message}`);
    }
  } else {
    // 3. Append new row
    const appendRange = 'Logs!A:E';
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Failed to append to sheet: ${err.error.message}`);
    }
  }
}
