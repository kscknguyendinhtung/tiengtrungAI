export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT CODE
 * 
 * Hướng dẫn:
 * 1. Mở https://script.google.com/
 * 2. Tạo một dự án mới.
 * 3. Dán mã này vào.
 * 4. Nhấn Deploy > New Deployment.
 * 5. Chọn loại "Web App", Execute as: "Me", Who has access: "Anyone".
 * 6. Sao chép URL Web App vừa sinh ra và dán vào ứng dụng.
 */

function doGet(e) {
  const sheetId = e.parameter.sheetId;
  const action = e.parameter.action;
  const ss = SpreadsheetApp.openById(sheetId);
  
  if (action === 'getSheets') {
    const sheetNames = ss.getSheets().map(s => s.getName());
    return ContentService.createTextOutput(JSON.stringify(sheetNames)).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getVocab') {
    const sheetName = e.parameter.vocabSheetName || 'từ vựng';
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getReading') {
    const sheetName = e.parameter.readingSheetName || 'luyện đọc';
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getGrammar') {
    const sheetName = e.parameter.grammarSheetName || 'ngữ pháp';
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getOCR') {
    const sheetName = e.parameter.ocrSheetName || 'OCR';
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
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
    const sheetName = params.ocrSheetName || 'OCR';
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.appendRow([new Date(), params.text]);
    return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
  }
  
  if (action === 'syncVocab') {
    const sheetName = params.vocabSheetName || 'từ vựng';
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.clear();
    const vocabData = params.data; 
    if (vocabData.length > 0) {
      sheet.getRange(1, 1, vocabData.length, vocabData[0].length).setValues(vocabData);
    }
    return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'syncReading') {
    const sheetName = params.readingSheetName || 'luyện đọc';
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.clear();
    const readingData = params.data; 
    if (readingData.length > 0) {
      sheet.getRange(1, 1, readingData.length, readingData[0].length).setValues(readingData);
    }
    return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'syncGrammar') {
    const sheetName = params.grammarSheetName || 'ngữ pháp';
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sheet.clear();
    const grammarData = params.data; 
    if (grammarData.length > 0) {
      sheet.getRange(1, 1, grammarData.length, grammarData[0].length).setValues(grammarData);
    }
    return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
  }
}
`;
