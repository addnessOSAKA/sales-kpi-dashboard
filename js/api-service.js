/**
 * 営業チームKPIダッシュボード APIサービス
 * サーバーとのデータ通信を管理します
 */

class ApiService {
  constructor() {
    this.config = window.appConfig || {};
    this.baseUrl = this.config.apiBaseUrl || '';
    this.apiKey = this.config.apiKey || '';
    this.spreadsheetId = this.config.spreadsheetId || '';
    this.useLocalData = !this.baseUrl || !this.apiKey || !this.spreadsheetId;
    
    // ローカルデータの使用時に警告を表示
    if (this.useLocalData) {
      console.warn('APIの設定が不完全です。ローカルデータを使用します。');
    }
  }
  
  /**
   * APIリクエストを送信する
   * @param {string} endpoint - APIエンドポイント
   * @param {Object} options - フェッチオプション
   * @returns {Promise} レスポンス
   */
  async fetchApi(endpoint, options = {}) {
    if (this.useLocalData) {
      return this.fetchLocalData(endpoint);
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    };
    
    const fetchOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`APIリクエストエラー: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('APIリクエストエラー:', error);
      
      // オフライン時またはAPIエラー時はローカルデータにフォールバック
      return this.fetchLocalData(endpoint);
    }
  }
  
  /**
   * ローカルデータを取得する
   * @param {string} endpoint - データタイプを示すエンドポイント
   * @returns {Promise} ローカルデータ
   */
  async fetchLocalData(endpoint) {
    let dataFile = 'data/sample-data.json';
    
    if (endpoint.includes('weekly')) {
      dataFile = 'data/weekly-data.json';
    } else if (endpoint.includes('monthly')) {
      dataFile = 'data/monthly-data.json';
    } else if (endpoint.includes('members')) {
      dataFile = 'data/members-data.json';
    }
    
    try {
      const response = await fetch(dataFile);
      
      if (!response.ok) {
        throw new Error(`ローカルデータ取得エラー: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('ローカルデータ取得エラー:', error);
      return this.generateFallbackData(endpoint);
    }
  }
  
  /**
   * フォールバックデータを生成する
   * @param {string} endpoint - データタイプを示すエンドポイント
   * @returns {Object} フォールバックデータ
   */
  generateFallbackData(endpoint) {
    if (endpoint.includes('members')) {
      return [
        { id: 'member1', name: '山内' },
        { id: 'member2', name: '内村' },
        { id: 'member3', name: '谷川' },
        { id: 'member4', name: '出口' }
      ];
    }
    
    if (endpoint.includes('weekly')) {
      return {
        weekly: [
          {
            period: '2025-03-3',
            approach: 148,
            meeting: 114,
            negotiation: 76,
            proposal: 37,
            contract: 14,
            amount: 37800000
          }
        ]
      };
    }
    
    if (endpoint.includes('monthly')) {
      return {
        monthly: [
          {
            period: '2025-03',
            approach: 496,
            meeting: 408,
            negotiation: 254,
            proposal: 128,
            contract: 37,
            amount: 96000000
          }
        ]
      };
    }
    
    return { data: [] };
  }
  
  /**
   * 週次データを取得する
   * @param {string} period - 期間（YYYY-MM-W形式）
   * @returns {Promise} 週次データ
   */
  fetchWeeklyData(period) {
    return this.fetchApi(`/weekly/${period}`);
  }
  
  /**
   * 月次データを取得する
   * @param {string} period - 期間（YYYY-MM形式）
   * @returns {Promise} 月次データ
   */
  fetchMonthlyData(period) {
    return this.fetchApi(`/monthly/${period}`);
  }
  
  /**
   * 担当者リストを取得する
   * @returns {Promise} 担当者リスト
   */
  fetchMembers() {
    return this.fetchApi('/members').then(data => data.members || data);
  }
  
  /**
   * すべてのデータを取得する
   * @returns {Promise} すべてのデータ
   */
  fetchAllData() {
    return this.fetchApi('/data/all');
  }
  
  /**
   * 日次データを保存する
   * @param {Object} data - 保存するデータ
   * @returns {Promise} 保存結果
   */
  saveDailyData(data) {
    if (this.useLocalData) {
      console.log('ローカルモード: 日次データの保存をシミュレート', data);
      return Promise.resolve({ success: true, data });
    }
    
    return this.fetchApi('/daily', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  /**
   * 案件データを保存する
   * @param {Object} project - 保存する案件データ
   * @returns {Promise} 保存結果
   */
  saveProject(project) {
    if (this.useLocalData) {
      console.log('ローカルモード: 案件データの保存をシミュレート', project);
      return Promise.resolve({ success: true, data: project });
    }
    
    return this.fetchApi('/projects', {
      method: 'POST',
      body: JSON.stringify(project)
    });
  }
  
  /**
   * 週次データを保存する
   * @param {Object} data - 保存するデータ
   * @returns {Promise} 保存結果
   */
  saveWeeklyData(data) {
    if (this.useLocalData) {
      console.log('ローカルモード: 週次データの保存をシミュレート', data);
      return Promise.resolve({ success: true, data });
    }
    
    return this.fetchApi(`/weekly/${data.period}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  /**
   * Google Sheetsからデータを取得する
   * @returns {Promise} スプレッドシートデータ
   */
  fetchFromGoogleSheets() {
    if (!this.spreadsheetId || !this.apiKey) {
      console.error('Google Sheets APIの設定が不完全です');
      return Promise.reject(new Error('Google Sheets APIの設定が不完全です'));
    }
    
    const sheetsApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values:batchGet?ranges=週次データ!A1:Z1000&ranges=月次データ!A1:Z1000&ranges=担当者データ!A1:Z1000&key=${this.apiKey}`;
    
    return fetch(sheetsApiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Google Sheets APIエラー: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        return this.processGoogleSheetsData(data);
      })
      .catch(error => {
        console.error('Google Sheetsデータ取得エラー:', error);
        throw error;
      });
  }
  
  /**
   * Google Sheetsのデータを処理する
   * @param {Object} data - Google Sheets APIからのレスポンス
   * @returns {Object} 処理済みデータ
   */
  processGoogleSheetsData(data) {
    const valueRanges = data.valueRanges || [];
    const result = {
      weekly: [],
      monthly: [],
      members: []
    };
    
    // 各シートのデータを処理
    valueRanges.forEach((range, index) => {
      const values = range.values || [];
      
      if (values.length < 2) {
        return; // ヘッダーのみの場合はスキップ
      }
      
      const headers = values[0];
      
      // データ行を処理
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const item = {};
        
        // 各列のデータをマッピング
        for (let j = 0; j < headers.length; j++) {
          if (j < row.length) {
            item[this.normalizeHeader(headers[j])] = this.convertValue(headers[j], row[j]);
          }
        }
        
        // データタイプに応じて適切な配列に追加
        if (index === 0) {
          result.weekly.push(item);
        } else if (index === 1) {
          result.monthly.push(item);
        } else if (index === 2) {
          result.members.push(item);
        }
      }
    });
    
    return result;
  }
  
  /**
   * ヘッダー名を正規化する
   * @param {string} header - ヘッダー名
   * @returns {string} 正規化されたヘッダー名
   */
  normalizeHeader(header) {
    const headerMap = {
      '期間': 'period',
      'アプローチ数': 'approach',
      '面談数': 'meeting',
      '商談数': 'negotiation',
      '提案数': 'proposal',
      '契約数': 'contract',
      '契約金額': 'amount',
      'ID': 'id',
      '担当者名': 'name',
      '担当者ID': 'id',
      '名前': 'name'
    };
    
    return headerMap[header] || header.toLowerCase().replace(/\s+/g, '_');
  }
  
  /**
   * 値を適切な型に変換する
   * @param {string} header - ヘッダー名
   * @param {string} value - 変換する値
   * @returns {any} 変換された値
   */
  convertValue(header, value) {
    if (value === undefined || value === null || value === '') {
      return header.includes('数') || header.includes('金額') ? 0 : '';
    }
    
    if (header.includes('数') || header.includes('金額')) {
      // 数値に変換（カンマや通貨記号を除去）
      return parseInt(value.toString().replace(/[^\d.-]/g, ''), 10) || 0;
    }
    
    return value;
  }
}

// グローバルインスタンスとしてエクスポート
window.apiService = new ApiService(); 