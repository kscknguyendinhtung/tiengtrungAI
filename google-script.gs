/**
 * GOOGLE APPS SCRIPT CODE
 * 
 * Instructions for the user:
 * 1. Open https://script.google.com/
 * 2. Create a new project.
 * 3. Paste this code.
 * 4. Deploy as "Web App".
 * 5. Set "Execute as: Me" and "Who has access: Anyone".
 * 6. Copy the Web App URL and paste it into the app.
 */

function doGet(e) {
  const sheetId = e.parameter.sheetId;
  const action = e.parameter.action;
  const ss = SpreadsheetApp.openById(sheetId);
  
  if (action === 'getVocab') {
    const sheet = ss.getSheetByName('từ vựng') || ss.insertSheet('từ vựng');
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getReading') {
    const sheet = ss.getSheetByName('luyện đọc') || ss.insertSheet('luyện đọc');
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getGrammar') {
    const sheet = ss.getSheetByName('ngữ pháp') || ss.insertSheet('ngữ pháp');
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getOCR') {
    const sheet = ss.getSheetByName('OCR') || ss.insertSheet('OCR');
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const sheetId = params.sheetId;
  const action = params.action;
  const ss = SpreadsheetApp.openById(sheetId);
  
  if (action === 'saveOCR') {
    const sheet = ss.getSheetByName('OCR') || ss.insertSheet('OCR');
    sheet.appendRow([new Date(), params.text]);
    return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
  }
  
  if (action === 'syncVocab') {
    const sheet = ss.getSheetByName('từ vựng') || ss.insertSheet('từ vựng');
    sheet.clear();
    const vocabData = params.data; 
    if (vocabData.length > 0) {
      sheet.getRange(1, 1, vocabData.length, vocabData[0].length).setValues(vocabData);
    }
    return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'syncReading') {
    const sheet = ss.getSheetByName('luyện đọc') || ss.insertSheet('luyện đọc');
    sheet.clear();
    const readingData = params.data; 
    if (readingData.length > 0) {
      sheet.getRange(1, 1, readingData.length, readingData[0].length).setValues(readingData);
    }
    return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'syncGrammar') {
    const sheet = ss.getSheetByName('ngữ pháp') || ss.insertSheet('ngữ pháp');
    sheet.clear();
    const grammarData = params.data; 
    if (grammarData.length > 0) {
      sheet.getRange(1, 1, grammarData.length, grammarData[0].length).setValues(grammarData);
    }
    return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
  }
}
