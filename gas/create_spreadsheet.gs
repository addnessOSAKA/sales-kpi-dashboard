/**
 * 営業チームKPIダッシュボード用スプレッドシート作成スクリプト
 * このスクリプトは、アプリケーションに連携するためのスプレッドシートを作成します。
 */

// メインの実行関数
function createKpiSpreadsheet() {
  // 新しいスプレッドシートを作成
  const spreadsheet = SpreadsheetApp.create('営業チームKPIダッシュボード');
  const spreadsheetId = spreadsheet.getId();
  const spreadsheetUrl = spreadsheet.getUrl();
  
  // 週次データシートを作成
  createWeeklySheet(spreadsheet);
  
  // 月次データシートを作成
  createMonthlySheet(spreadsheet);
  
  // 担当者データシートを作成
  createMembersSheet(spreadsheet);
  
  // 設定シートを作成
  createConfigSheet(spreadsheet, spreadsheetId);
  
  // 完了メッセージを表示
  Logger.log('スプレッドシートの作成が完了しました。');
  Logger.log('スプレッドシートID: ' + spreadsheetId);
  Logger.log('スプレッドシートURL: ' + spreadsheetUrl);
  
  return {
    success: true,
    spreadsheetId: spreadsheetId,
    spreadsheetUrl: spreadsheetUrl
  };
}

/**
 * 週次データシートを作成する
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - スプレッドシート
 */
function createWeeklySheet(spreadsheet) {
  // 既存のシートを取得して名前を変更
  const sheet = spreadsheet.getSheets()[0];
  sheet.setName('Weekly');
  
  // ヘッダー行を設定
  const headers = [
    'period', 
    'approach_value', 'approach_target', 'approach_change',
    'meeting_value', 'meeting_target', 'meeting_change',
    'negotiation_value', 'negotiation_target', 'negotiation_change',
    'proposal_value', 'proposal_target', 'proposal_change',
    'contract_value', 'contract_target', 'contract_change',
    'amount_value', 'amount_target', 'amount_change'
  ];
  
  // ヘッダー行を設定
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // サンプルデータを追加
  const sampleData = [
    ['2025年1月第3週', 118, 120, 5.0, 92, 95, 4.5, 65, 70, 3.2, 32, 35, 2.8, 9, 10, 1.5, 25.6, 28.0, 2.0],
    ['2025年1月第4週', 123, 125, 6.0, 95, 98, 5.0, 68, 72, 3.5, 34, 36, 3.0, 10, 11, 2.0, 27.8, 29.0, 2.5],
    ['2025年2月第1週', 127, 130, 7.0, 99, 100, 5.5, 70, 75, 4.0, 35, 38, 3.2, 9, 12, 1.8, 26.5, 30.0, 2.2],
    ['2025年2月第2週', 131, 135, 8.0, 102, 105, 6.0, 72, 78, 4.5, 36, 40, 3.5, 11, 13, 2.5, 30.2, 32.0, 3.0],
    ['2025年2月第3週', 135, 140, 9.0, 105, 108, 6.5, 74, 80, 5.0, 38, 42, 3.8, 12, 14, 3.0, 32.5, 34.0, 3.5],
    ['2025年2月第4週', 140, 145, 10.0, 109, 110, 7.0, 75, 82, 5.2, 39, 44, 4.0, 12, 15, 3.2, 33.8, 36.0, 4.0],
    ['2025年3月第1週', 143, 150, 11.0, 112, 115, 8.0, 74, 85, 5.0, 38, 46, 3.5, 13, 16, 4.0, 35.6, 38.0, 4.5],
    ['2025年3月第2週', 148, 155, 12.0, 114, 118, 8.6, 76, 88, 5.5, 37, 48, -2.6, 14, 18, 7.7, 37.8, 40.0, 5.0]
  ];
  
  // データを設定
  sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
  
  // 列幅を調整
  sheet.setColumnWidth(1, 150);
  for (let i = 2; i <= headers.length; i++) {
    sheet.setColumnWidth(i, 120);
  }
  
  // スタイルを設定
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f2f2f2');
  
  // 数値列のフォーマットを設定
  for (let i = 2; i <= headers.length; i++) {
    if (headers[i-1].includes('change')) {
      sheet.getRange(2, i, sampleData.length, 1).setNumberFormat('0.0');
    } else if (headers[i-1].includes('amount')) {
      sheet.getRange(2, i, sampleData.length, 1).setNumberFormat('0.0');
    } else {
      sheet.getRange(2, i, sampleData.length, 1).setNumberFormat('0');
    }
  }
}

/**
 * 月次データシートを作成する
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - スプレッドシート
 */
function createMonthlySheet(spreadsheet) {
  // 新しいシートを作成
  const sheet = spreadsheet.insertSheet('Monthly');
  
  // ヘッダー行を設定
  const headers = [
    'period', 
    'approach_value', 'approach_target', 'approach_change',
    'meeting_value', 'meeting_target', 'meeting_change',
    'negotiation_value', 'negotiation_target', 'negotiation_change',
    'proposal_value', 'proposal_target', 'proposal_change',
    'contract_value', 'contract_target', 'contract_change',
    'amount_value', 'amount_target', 'amount_change',
    'approach_to_meeting', 'approach_to_meeting_from', 'approach_to_meeting_to',
    'meeting_to_negotiation', 'meeting_to_negotiation_from', 'meeting_to_negotiation_to',
    'negotiation_to_proposal', 'negotiation_to_proposal_from', 'negotiation_to_proposal_to',
    'proposal_to_contract', 'proposal_to_contract_from', 'proposal_to_contract_to',
    'approach_to_contract', 'approach_to_contract_from', 'approach_to_contract_to',
    'contract_dist_categories', 'contract_dist_amounts'
  ];
  
  // ヘッダー行を設定
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // サンプルデータを追加
  const sampleData = [
    ['2025年1月', 450, 460, 8.3, 365, 380, 6.5, 225, 240, 4.1, 115, 120, 3.2, 32, 35, -2.6, 84.0, 90.0, 1.1, 
     81.1, 450, 365, 61.6, 365, 225, 51.1, 225, 115, 27.8, 115, 32, 7.1, 450, 32, 
     'アプリ開発,データ連携,保守契約,コンサルティング', '32.5,21.0,18.0,12.5'],
    ['2025年2月', 475, 480, 8.3, 385, 390, 6.5, 240, 250, 4.1, 122, 125, 3.2, 38, 36, -2.6, 95.0, 95.0, 1.1, 
     81.1, 475, 385, 62.3, 385, 240, 50.8, 240, 122, 31.1, 122, 38, 8.0, 475, 38, 
     'アプリ開発,データ連携,保守契約,コンサルティング', '36.5,23.0,20.0,15.5'],
    ['2025年3月', 496, 520, 8.3, 408, 420, 6.5, 254, 270, 4.1, 128, 135, 3.2, 37, 38, -2.6, 96.0, 100.0, 1.1, 
     82.3, 496, 408, 62.3, 408, 254, 50.4, 254, 128, 28.9, 128, 37, 7.5, 496, 37, 
     'アプリ開発,データ連携,保守契約,コンサルティング', '37.8,24.5,19.2,14.5']
  ];
  
  // データを設定
  sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
  
  // 列幅を調整
  sheet.setColumnWidth(1, 150);
  for (let i = 2; i <= headers.length; i++) {
    sheet.setColumnWidth(i, 120);
  }
  
  // スタイルを設定
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f2f2f2');
  
  // 数値列のフォーマットを設定
  for (let i = 2; i <= headers.length; i++) {
    if (headers[i-1].includes('change') || headers[i-1].includes('_to_') && !headers[i-1].includes('_from') && !headers[i-1].includes('_to_')) {
      sheet.getRange(2, i, sampleData.length, 1).setNumberFormat('0.0');
    } else if (headers[i-1].includes('amount') && !headers[i-1].includes('contract_dist')) {
      sheet.getRange(2, i, sampleData.length, 1).setNumberFormat('0.0');
    } else if (!headers[i-1].includes('categories') && !headers[i-1].includes('contract_dist')) {
      sheet.getRange(2, i, sampleData.length, 1).setNumberFormat('0');
    }
  }
}

/**
 * 担当者データシートを作成する
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - スプレッドシート
 */
function createMembersSheet(spreadsheet) {
  // 新しいシートを作成
  const sheet = spreadsheet.insertSheet('Members');
  
  // ヘッダー行を設定
  const headers = [
    'member_id', 'member_name', 
    'amount_value', 'amount_target', 'amount_change',
    'approach_value', 'approach_target',
    'meeting_value', 'meeting_target',
    'negotiation_value', 'negotiation_target',
    'proposal_value', 'proposal_target',
    'contract_value', 'contract_target',
    'approach_to_meeting', 'meeting_to_negotiation', 
    'negotiation_to_proposal', 'proposal_to_contract', 
    'avg_negotiation_period'
  ];
  
  // ヘッダー行を設定
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // サンプルデータを追加
  const sampleData = [
    ['yamauchi', '山内', 32.5, 30.0, 6.2, 38, 40, 29, 30, 19, 20, 12, 15, 9, 8, 85, 70, 60, 35, 75],
    ['uchimura', '内村', 25.8, 26.8, -3.7, 35, 38, 28, 29, 18, 19, 10, 12, 7, 7, 80, 65, 55, 32, 80],
    ['tanigawa', '谷川', 19.7, 21.2, -7.1, 32, 35, 25, 27, 16, 18, 8, 10, 6, 6, 78, 62, 52, 30, 85],
    ['deguchi', '出口', 18.0, 20.0, -10.0, 30, 33, 22, 25, 14, 16, 7, 9, 5, 6, 75, 60, 50, 28, 90]
  ];
  
  // データを設定
  sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
  
  // 列幅を調整
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 150);
  for (let i = 3; i <= headers.length; i++) {
    sheet.setColumnWidth(i, 120);
  }
  
  // スタイルを設定
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f2f2f2');
  
  // 数値列のフォーマットを設定
  for (let i = 3; i <= headers.length; i++) {
    if (headers[i-1].includes('change') || headers[i-1].includes('amount_value') || headers[i-1].includes('amount_target')) {
      sheet.getRange(2, i, sampleData.length, 1).setNumberFormat('0.0');
    } else {
      sheet.getRange(2, i, sampleData.length, 1).setNumberFormat('0');
    }
  }
}

/**
 * 設定シートを作成する
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - スプレッドシート
 * @param {string} spreadsheetId - スプレッドシートID
 */
function createConfigSheet(spreadsheet, spreadsheetId) {
  // 新しいシートを作成
  const sheet = spreadsheet.insertSheet('Config');
  
  // 設定情報を追加
  const configData = [
    ['スプレッドシートID', spreadsheetId],
    ['週次データシート', 'Weekly'],
    ['月次データシート', 'Monthly'],
    ['担当者データシート', 'Members'],
    ['', ''],
    ['アプリケーション設定', ''],
    ['1. アプリケーションのconfig.jsファイルを開きます', ''],
    ['2. spreadsheet.enabledをtrueに設定します', ''],
    ['3. spreadsheet.idに上記のスプレッドシートIDを設定します', ''],
    ['4. spreadsheet.apiKeyにGoogle Sheets APIキーを設定します', ''],
    ['5. 設定を保存して、アプリケーションを再読み込みします', '']
  ];
  
  // データを設定
  sheet.getRange(1, 1, configData.length, 2).setValues(configData);
  
  // 列幅を調整
  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 500);
  
  // スタイルを設定
  sheet.getRange(1, 1, 5, 2).setFontWeight('bold');
  sheet.getRange(6, 1, 1, 2).setFontWeight('bold').setBackground('#f2f2f2');
  
  // スプレッドシートIDをコピーしやすくする
  sheet.getRange(1, 2).setFontFamily('Courier New');
} 