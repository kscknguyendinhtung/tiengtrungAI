export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT CODE (BẢN TỐI ƯU SIÊU TỐC ĐỘ)
 * 
 * Hướng dẫn:
 * 1. Mở file Google Sheet của bạn.
 * 2. Mở Extensions (Tiện ích mở rộng) > Apps Script.
 * 3. Xóa hết mã cũ và dán toàn bộ mã này vào.
 * 4. Nhấn Deploy (Triển khai) > Manage deployments (Quản lý bản triển khai) > Edit (Chỉnh sửa biểu tượng cây bút).
 * 5. Chọn Version: "New version" (Phiên bản mới) > Nhấn Deploy.
 * 6. (Hoặc nếu tạo mới: Deploy > New Deployment > Loại "Web App", Execute as: "Me", Access: "Anyone").
 */

function doGet(e) {
  try {
    const sheetId = (e && e.parameter && e.parameter.sheetId) ? e.parameter.sheetId.trim() : '';
    const action = e && e.parameter ? e.parameter.action : '';
    if (!sheetId) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Thiếu sheetId' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const ss = SpreadsheetApp.openById(sheetId);
    
    if (action === 'getSheets') {
      const sheetNames = ss.getSheets().map(s => s.getName());
      return ContentService.createTextOutput(JSON.stringify(sheetNames)).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Tối ưu: Lấy toàn bộ từ vựng, luyện đọc, ngữ pháp trong 1 lần gọi (Nhanh gấp 3-5 lần)
    if (action === 'getAll') {
      const vSheetName = e.parameter.vocabSheetName || 'từ vựng';
      const rSheetName = e.parameter.readingSheetName || 'luyện đọc';
      const gSheetName = e.parameter.grammarSheetName || 'ngữ pháp';
      
      const vSheet = ss.getSheetByName(vSheetName) || ss.insertSheet(vSheetName);
      const rSheet = ss.getSheetByName(rSheetName) || ss.insertSheet(rSheetName);
      const gSheet = ss.getSheetByName(gSheetName) || ss.insertSheet(gSheetName);
      
      const result = {
        status: 'success',
        vocab: vSheet.getDataRange().getValues(),
        reading: rSheet.getDataRange().getValues(),
        grammar: gSheet.getDataRange().getValues()
      };
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
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

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Hành động không hợp lệ: ' + action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const sheetId = params.sheetId ? params.sheetId.trim() : '';
    const action = params.action;
    const ss = SpreadsheetApp.openById(sheetId);
    
    // Tối ưu: Đồng bộ toàn bộ dữ liệu chỉ trong 1 lần ghi (Tránh xung đột và khóa bảng tính)
    if (action === 'syncAll') {
      if (params.vocab && params.vocab.data) {
        const sheetName = params.vocab.sheetName || 'từ vựng';
        const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
        sheet.clear();
        if (params.vocab.data.length > 0) {
          sheet.getRange(1, 1, params.vocab.data.length, params.vocab.data[0].length).setValues(params.vocab.data);
        }
      }
      if (params.reading && params.reading.data) {
        const sheetName = params.reading.sheetName || 'luyện đọc';
        const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
        sheet.clear();
        if (params.reading.data.length > 0) {
          sheet.getRange(1, 1, params.reading.data.length, params.reading.data[0].length).setValues(params.reading.data);
        }
      }
      if (params.grammar && params.grammar.data) {
        const sheetName = params.grammar.sheetName || 'ngữ pháp';
        const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
        sheet.clear();
        if (params.grammar.data.length > 0) {
          sheet.getRange(1, 1, params.grammar.data.length, params.grammar.data[0].length).setValues(params.grammar.data);
        }
      }
      return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
    }

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

    return ContentService.createTextOutput('Unknown action: ' + action).setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}
`;
