/**
 * 営業チームKPIダッシュボード APIサービス
 * このファイルはAPIとの連携処理を行います
 */

class ApiService {
  constructor(config = API_CONFIG) {
    this.config = config;
    this.cache = {};
    this.lastFetch = {};
    this.isGoogleApiInitialized = false;
  }

  /**
   * APIからデータを取得する
   * @param {string} endpoint - エンドポイント名
   * @returns {Promise<Object>} 取得したデータ
   */
  async fetchData(endpoint) {
    try {
      // キャッシュが有効で、キャッシュ期限内の場合はキャッシュから返す
      if (this.shouldUseCache(endpoint)) {
        console.log(`キャッシュからデータを取得: ${endpoint}`);
        return this.cache[endpoint];
      }

      // スプレッドシート連携が有効な場合はGoogle Sheets APIを使用
      if (this.isSpreadsheetEnabled()) {
        console.log(`スプレッドシートからデータを取得: ${endpoint}`);
        const data = await this.fetchFromSpreadsheet(endpoint);
        
        // キャッシュを更新
        this.updateCache(endpoint, data);
        
        return data;
      }
      
      // 通常のAPIまたはローカルJSONファイルからデータを取得
      const url = `${this.config.baseUrl}${this.config.endpoints[endpoint]}`;
      console.log(`APIからデータを取得: ${url}`);

      const response = await fetch(url, this.getRequestOptions());
      
      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // キャッシュを更新
      this.updateCache(endpoint, data);
      
      return data;
    } catch (error) {
      console.error('データ取得エラー:', error);
      notificationUtils.showError(`データ取得エラー: ${error.message}`);
      
      // エラー時はキャッシュがあればキャッシュから返す、なければデフォルトデータを返す
      return this.cache[endpoint] || this.getDefaultData(endpoint);
    }
  }

  /**
   * スプレッドシート連携が有効かどうかを判定する
   * @returns {boolean} スプレッドシート連携が有効かどうか
   */
  isSpreadsheetEnabled() {
    return this.config.spreadsheet && 
           this.config.spreadsheet.enabled && 
           this.config.spreadsheet.id && 
           this.config.spreadsheet.apiKey;
  }

  /**
   * Google Sheets APIを初期化する
   * @returns {Promise<void>}
   */
  async initGoogleApi() {
    if (this.isGoogleApiInitialized) return;
    
    return new Promise((resolve, reject) => {
      try {
        // Google API クライアントライブラリを読み込む
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          gapi.load('client', async () => {
            try {
              await gapi.client.init({
                apiKey: this.config.spreadsheet.apiKey,
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
              });
              
              this.isGoogleApiInitialized = true;
              console.log('Google Sheets API初期化完了');
              notificationUtils.showSuccess('Google Sheets APIに接続しました');
              resolve();
            } catch (error) {
              console.error('Google API初期化エラー:', error);
              notificationUtils.showError('Google Sheets APIの初期化に失敗しました');
              reject(error);
            }
          });
        };
        script.onerror = (error) => {
          console.error('Google APIスクリプト読み込みエラー:', error);
          notificationUtils.showError('Google APIの読み込みに失敗しました');
          reject(error);
        };
        
        document.body.appendChild(script);
      } catch (error) {
        console.error('Google API初期化エラー:', error);
        notificationUtils.showError('Google APIの初期化に失敗しました');
        reject(error);
      }
    });
  }

  /**
   * スプレッドシートからデータを取得する
   * @param {string} endpoint - エンドポイント名
   * @returns {Promise<Object>} 取得したデータ
   */
  async fetchFromSpreadsheet(endpoint) {
    try {
      // Google API初期化
      if (!this.isGoogleApiInitialized) {
        await this.initGoogleApi();
      }
      
      // スプレッドシートの設定を取得
      const spreadsheetId = this.config.spreadsheet.id;
      const sheetName = this.getSheetNameForEndpoint(endpoint);
      
      if (!sheetName) {
        throw new Error(`エンドポイント ${endpoint} に対応するシート名が設定されていません`);
      }
      
      // スプレッドシートからデータを取得
      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: sheetName
      });
      
      // スプレッドシートのデータを変換
      const data = this.convertSpreadsheetData(response.result.values, endpoint);
      
      return data;
    } catch (error) {
      console.error('スプレッドシートからのデータ取得エラー:', error);
      notificationUtils.showError('スプレッドシートからのデータ取得に失敗しました');
      throw error;
    }
  }

  /**
   * エンドポイントに対応するシート名を取得する
   * @param {string} endpoint - エンドポイント名
   * @returns {string|null} シート名
   */
  getSheetNameForEndpoint(endpoint) {
    if (!this.config.spreadsheet || !this.config.spreadsheet.sheets) {
      return null;
    }
    
    return this.config.spreadsheet.sheets[endpoint] || null;
  }

  /**
   * スプレッドシートのデータをアプリケーション用に変換する
   * @param {Array<Array<string>>} values - スプレッドシートの値
   * @param {string} endpoint - エンドポイント名
   * @returns {Object} 変換されたデータ
   */
  convertSpreadsheetData(values, endpoint) {
    if (!values || values.length === 0) {
      throw new Error('スプレッドシートにデータがありません');
    }
    
    // ヘッダー行を取得
    const headers = values[0];
    
    // データ行を取得
    const rows = values.slice(1);
    
    // エンドポイントに応じてデータを変換
    switch (endpoint) {
      case 'weekly':
        return this.convertWeeklyData(headers, rows);
      
      case 'monthly':
        return this.convertMonthlyData(headers, rows);
      
      case 'members':
        return this.convertMembersData(headers, rows);
      
      case 'summary':
        // summaryの場合は他のエンドポイントからデータを取得して結合
        return this.createSummaryData();
      
      default:
        // 汎用的な変換（オブジェクトの配列に変換）
        return this.convertGenericData(headers, rows);
    }
  }

  /**
   * 週次データに変換する
   * @param {Array<string>} headers - ヘッダー行
   * @param {Array<Array<string>>} rows - データ行
   * @returns {Object} 変換された週次データ
   */
  convertWeeklyData(headers, rows) {
    try {
      // 現在の期間のデータを取得（最新の行）
      const currentRow = rows[rows.length - 1];
      const currentPeriod = currentRow[headers.indexOf('period')];
      
      // メトリクスを構築
      const metrics = {
        approach: {
          value: parseInt(currentRow[headers.indexOf('approach_value')], 10),
          target: parseInt(currentRow[headers.indexOf('approach_target')], 10),
          change: parseFloat(currentRow[headers.indexOf('approach_change')])
        },
        meeting: {
          value: parseInt(currentRow[headers.indexOf('meeting_value')], 10),
          target: parseInt(currentRow[headers.indexOf('meeting_target')], 10),
          change: parseFloat(currentRow[headers.indexOf('meeting_change')])
        },
        negotiation: {
          value: parseInt(currentRow[headers.indexOf('negotiation_value')], 10),
          target: parseInt(currentRow[headers.indexOf('negotiation_target')], 10),
          change: parseFloat(currentRow[headers.indexOf('negotiation_change')])
        },
        proposal: {
          value: parseInt(currentRow[headers.indexOf('proposal_value')], 10),
          target: parseInt(currentRow[headers.indexOf('proposal_target')], 10),
          change: parseFloat(currentRow[headers.indexOf('proposal_change')])
        },
        contract: {
          value: parseInt(currentRow[headers.indexOf('contract_value')], 10),
          target: parseInt(currentRow[headers.indexOf('contract_target')], 10),
          change: parseFloat(currentRow[headers.indexOf('contract_change')])
        },
        amount: {
          value: parseFloat(currentRow[headers.indexOf('amount_value')]),
          target: parseFloat(currentRow[headers.indexOf('amount_target')]),
          change: parseFloat(currentRow[headers.indexOf('amount_change')])
        }
      };
      
      // トレンドデータを構築
      const periods = [];
      const approach = [];
      const meeting = [];
      const contract = [];
      
      // 過去8週間分のデータを取得
      const trendRows = rows.slice(-8);
      
      trendRows.forEach(row => {
        periods.push(row[headers.indexOf('period_short')] || row[headers.indexOf('period')]);
        approach.push(parseInt(row[headers.indexOf('approach_value')], 10));
        meeting.push(parseInt(row[headers.indexOf('meeting_value')], 10));
        contract.push(parseInt(row[headers.indexOf('contract_value')], 10));
      });
      
      return {
        current: {
          period: currentPeriod,
          metrics: metrics
        },
        trend: {
          periods: periods,
          approach: approach,
          meeting: meeting,
          contract: contract
        }
      };
    } catch (error) {
      console.error('週次データの変換エラー:', error);
      notificationUtils.showError('週次データの変換に失敗しました');
      throw error;
    }
  }

  /**
   * 月次データに変換する
   * @param {Array<string>} headers - ヘッダー行
   * @param {Array<Array<string>>} rows - データ行
   * @returns {Object} 変換された月次データ
   */
  convertMonthlyData(headers, rows) {
    try {
      // 現在の期間のデータを取得（最新の行）
      const currentRow = rows[rows.length - 1];
      const currentPeriod = currentRow[headers.indexOf('period')];
      
      // メトリクスを構築
      const metrics = {
        approach: {
          value: parseInt(currentRow[headers.indexOf('approach_value')], 10),
          target: parseInt(currentRow[headers.indexOf('approach_target')], 10),
          change: parseFloat(currentRow[headers.indexOf('approach_change')])
        },
        meeting: {
          value: parseInt(currentRow[headers.indexOf('meeting_value')], 10),
          target: parseInt(currentRow[headers.indexOf('meeting_target')], 10),
          change: parseFloat(currentRow[headers.indexOf('meeting_change')])
        },
        negotiation: {
          value: parseInt(currentRow[headers.indexOf('negotiation_value')], 10),
          target: parseInt(currentRow[headers.indexOf('negotiation_target')], 10),
          change: parseFloat(currentRow[headers.indexOf('negotiation_change')])
        },
        proposal: {
          value: parseInt(currentRow[headers.indexOf('proposal_value')], 10),
          target: parseInt(currentRow[headers.indexOf('proposal_target')], 10),
          change: parseFloat(currentRow[headers.indexOf('proposal_change')])
        },
        contract: {
          value: parseInt(currentRow[headers.indexOf('contract_value')], 10),
          target: parseInt(currentRow[headers.indexOf('contract_target')], 10),
          change: parseFloat(currentRow[headers.indexOf('contract_change')])
        },
        amount: {
          value: parseFloat(currentRow[headers.indexOf('amount_value')]),
          target: parseFloat(currentRow[headers.indexOf('amount_target')]),
          change: parseFloat(currentRow[headers.indexOf('amount_change')])
        }
      };
      
      // コンバージョン率を構築
      const conversion = {
        approach_to_meeting: {
          value: parseFloat(currentRow[headers.indexOf('approach_to_meeting')]),
          from: parseInt(currentRow[headers.indexOf('approach_value')], 10),
          to: parseInt(currentRow[headers.indexOf('meeting_value')], 10)
        },
        meeting_to_negotiation: {
          value: parseFloat(currentRow[headers.indexOf('meeting_to_negotiation')]),
          from: parseInt(currentRow[headers.indexOf('meeting_value')], 10),
          to: parseInt(currentRow[headers.indexOf('negotiation_value')], 10)
        },
        negotiation_to_proposal: {
          value: parseFloat(currentRow[headers.indexOf('negotiation_to_proposal')]),
          from: parseInt(currentRow[headers.indexOf('negotiation_value')], 10),
          to: parseInt(currentRow[headers.indexOf('proposal_value')], 10)
        },
        proposal_to_contract: {
          value: parseFloat(currentRow[headers.indexOf('proposal_to_contract')]),
          from: parseInt(currentRow[headers.indexOf('proposal_value')], 10),
          to: parseInt(currentRow[headers.indexOf('contract_value')], 10)
        },
        approach_to_contract: {
          value: parseFloat(currentRow[headers.indexOf('approach_to_contract')]),
          from: parseInt(currentRow[headers.indexOf('approach_value')], 10),
          to: parseInt(currentRow[headers.indexOf('contract_value')], 10)
        }
      };
      
      // 契約金額分布を構築
      const distributionCategories = currentRow[headers.indexOf('distribution_categories')].split(',');
      const distributionAmounts = currentRow[headers.indexOf('distribution_amounts')].split(',').map(Number);
      
      // トレンドデータを構築
      const periods = [];
      const approach = [];
      const contract = [];
      const amount = [];
      const approach_to_contract = [];
      
      // 過去6ヶ月分のデータを取得
      const trendRows = rows.slice(-6);
      
      trendRows.forEach(row => {
        periods.push(row[headers.indexOf('period_short')] || row[headers.indexOf('period')]);
        approach.push(parseInt(row[headers.indexOf('approach_value')], 10));
        contract.push(parseInt(row[headers.indexOf('contract_value')], 10));
        amount.push(parseFloat(row[headers.indexOf('amount_value')]));
        approach_to_contract.push(parseFloat(row[headers.indexOf('approach_to_contract')]));
      });
      
      return {
        current: {
          period: currentPeriod,
          metrics: metrics,
          conversion: conversion,
          contract_distribution: {
            categories: distributionCategories,
            amounts: distributionAmounts
          }
        },
        trend: {
          periods: periods,
          approach: approach,
          contract: contract,
          amount: amount
        },
        conversion_trend: {
          periods: periods,
          approach_to_contract: approach_to_contract
        }
      };
    } catch (error) {
      console.error('月次データの変換エラー:', error);
      notificationUtils.showError('月次データの変換に失敗しました');
      throw error;
    }
  }

  /**
   * 担当者データに変換する
   * @param {Array<string>} headers - ヘッダー行
   * @param {Array<Array<string>>} rows - データ行
   * @returns {Object} 変換された担当者データ
   */
  convertMembersData(headers, rows) {
    try {
      // 担当者ごとのデータを構築
      const all = {};
      const names = [];
      const contracts = [];
      const amounts = [];
      
      rows.forEach(row => {
        const memberName = row[headers.indexOf('name')];
        const memberKey = row[headers.indexOf('key')];
        
        names.push(memberName);
        contracts.push(parseInt(row[headers.indexOf('contract_value')], 10));
        amounts.push(parseFloat(row[headers.indexOf('amount_value')]));
        
        // 担当者ごとのメトリクスを構築
        const metrics = {
          approach: {
            value: parseInt(row[headers.indexOf('approach_value')], 10),
            target: parseInt(row[headers.indexOf('approach_target')], 10),
            change: parseFloat(row[headers.indexOf('approach_change')])
          },
          meeting: {
            value: parseInt(row[headers.indexOf('meeting_value')], 10),
            target: parseInt(row[headers.indexOf('meeting_target')], 10),
            change: parseFloat(row[headers.indexOf('meeting_change')])
          },
          negotiation: {
            value: parseInt(row[headers.indexOf('negotiation_value')], 10),
            target: parseInt(row[headers.indexOf('negotiation_target')], 10),
            change: parseFloat(row[headers.indexOf('negotiation_change')])
          },
          proposal: {
            value: parseInt(row[headers.indexOf('proposal_value')], 10),
            target: parseInt(row[headers.indexOf('proposal_target')], 10),
            change: parseFloat(row[headers.indexOf('proposal_change')])
          },
          contract: {
            value: parseInt(row[headers.indexOf('contract_value')], 10),
            target: parseInt(row[headers.indexOf('contract_target')], 10),
            change: parseFloat(row[headers.indexOf('contract_change')])
          },
          amount: {
            value: parseFloat(row[headers.indexOf('amount_value')]),
            target: parseFloat(row[headers.indexOf('amount_target')]),
            change: parseFloat(row[headers.indexOf('amount_change')])
          }
        };
        
        // 効率性データを構築
        const efficiency = {
          approach_to_meeting: parseFloat(row[headers.indexOf('approach_to_meeting')]),
          meeting_to_negotiation: parseFloat(row[headers.indexOf('meeting_to_negotiation')]),
          negotiation_to_proposal: parseFloat(row[headers.indexOf('negotiation_to_proposal')]),
          proposal_to_contract: parseFloat(row[headers.indexOf('proposal_to_contract')]),
          avg_negotiation_period: parseFloat(row[headers.indexOf('avg_negotiation_period')])
        };
        
        all[memberKey] = {
          name: memberName,
          metrics: metrics,
          efficiency: efficiency,
          amount: parseFloat(row[headers.indexOf('amount_value')]),
          target: parseFloat(row[headers.indexOf('amount_target')]),
          change: parseFloat(row[headers.indexOf('amount_change')])
        };
      });
      
      return {
        all: all,
        performance: {
          names: names,
          contracts: contracts,
          amounts: amounts
        }
      };
    } catch (error) {
      console.error('担当者データの変換エラー:', error);
      notificationUtils.showError('担当者データの変換に失敗しました');
      throw error;
    }
  }

  /**
   * 汎用的なデータ変換
   * @param {Array<string>} headers - ヘッダー行
   * @param {Array<Array<string>>} rows - データ行
   * @returns {Array<Object>} 変換されたデータ
   */
  convertGenericData(headers, rows) {
    return rows.map(row => {
      const item = {};
      headers.forEach((header, index) => {
        // 数値に変換できる場合は変換
        const value = row[index];
        if (!isNaN(value) && value !== '') {
          if (value.includes('.')) {
            item[header] = parseFloat(value);
          } else {
            item[header] = parseInt(value, 10);
          }
        } else {
          item[header] = value;
        }
      });
      return item;
    });
  }

  /**
   * サマリーデータを作成する
   * @returns {Promise<Object>} サマリーデータ
   */
  async createSummaryData() {
    try {
      // 各エンドポイントからデータを取得
      const weekly = await this.fetchData('weekly');
      const monthly = await this.fetchData('monthly');
      const members = await this.fetchData('members');
      
      // サマリーデータを構築
      return {
        weekly: weekly,
        monthly: monthly,
        members: members
      };
    } catch (error) {
      console.error('サマリーデータの作成エラー:', error);
      notificationUtils.showError('サマリーデータの作成に失敗しました');
      throw error;
    }
  }

  /**
   * リクエストオプションを取得する
   * @returns {Object} リクエストオプション
   */
  getRequestOptions() {
    // API認証情報がある場合は認証ヘッダーを追加
    if (this.config.auth.apiKey) {
      return {
        headers: {
          'Authorization': `Bearer ${this.config.auth.apiKey}`,
          'Content-Type': 'application/json'
        }
      };
    }
    
    return {
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * キャッシュを使用すべきかどうかを判定する
   * @param {string} endpoint - エンドポイント名
   * @returns {boolean} キャッシュを使用すべきかどうか
   */
  shouldUseCache(endpoint) {
    // キャッシュが無効の場合は常にfalse
    if (!this.config.cache.enabled) return false;
    
    // キャッシュにデータがない場合はfalse
    if (!this.cache[endpoint]) return false;
    
    // 最後のフェッチ時刻がない場合はfalse
    if (!this.lastFetch[endpoint]) return false;
    
    // 現在時刻と最後のフェッチ時刻の差分を計算
    const now = Date.now();
    const lastFetchTime = this.lastFetch[endpoint];
    const elapsed = now - lastFetchTime;
    
    // キャッシュ期限内ならtrue
    return elapsed < this.config.cache.expiry;
  }

  /**
   * キャッシュを更新する
   * @param {string} endpoint - エンドポイント名
   * @param {Object} data - キャッシュするデータ
   */
  updateCache(endpoint, data) {
    this.cache[endpoint] = data;
    this.lastFetch[endpoint] = Date.now();
  }

  /**
   * デフォルトデータを取得する
   * @param {string} endpoint - エンドポイント名
   * @returns {Object} デフォルトデータ
   */
  getDefaultData(endpoint) {
    // エンドポイントに応じたデフォルトデータを返す
    switch (endpoint) {
      case 'weekly':
        return {
          current: {
            period: DISPLAY_CONFIG.defaultPeriod.weekly,
            metrics: {
              approach: { value: 0, target: 0, change: 0 },
              meeting: { value: 0, target: 0, change: 0 },
              negotiation: { value: 0, target: 0, change: 0 },
              proposal: { value: 0, target: 0, change: 0 },
              contract: { value: 0, target: 0, change: 0 },
              amount: { value: 0, target: 0, change: 0 }
            }
          },
          trend: {
            periods: [],
            approach: [],
            meeting: [],
            negotiation: [],
            proposal: [],
            contract: [],
            amount: []
          }
        };
      
      case 'monthly':
        return {
          current: {
            period: DISPLAY_CONFIG.defaultPeriod.monthly,
            metrics: {
              approach: { value: 0, target: 0, change: 0 },
              meeting: { value: 0, target: 0, change: 0 },
              negotiation: { value: 0, target: 0, change: 0 },
              proposal: { value: 0, target: 0, change: 0 },
              contract: { value: 0, target: 0, change: 0 },
              amount: { value: 0, target: 0, change: 0 }
            },
            conversion: {
              approach_to_meeting: { value: 0, from: 0, to: 0 },
              meeting_to_negotiation: { value: 0, from: 0, to: 0 },
              negotiation_to_proposal: { value: 0, from: 0, to: 0 },
              proposal_to_contract: { value: 0, from: 0, to: 0 },
              approach_to_contract: { value: 0, from: 0, to: 0 }
            },
            contract_distribution: {
              categories: [],
              amounts: []
            }
          },
          trend: {
            periods: [],
            approach: [],
            meeting: [],
            negotiation: [],
            proposal: [],
            contract: [],
            amount: []
          },
          conversion_trend: {
            periods: [],
            approach_to_contract: []
          }
        };
      
      case 'members':
        return {
          all: {},
          performance: {
            names: [],
            contracts: [],
            amounts: []
          }
        };
      
      case 'summary':
        // 全データを含むデフォルト
        return {
          weekly: this.getDefaultData('weekly'),
          monthly: this.getDefaultData('monthly'),
          members: this.getDefaultData('members')
        };
      
      default:
        return {};
    }
  }

  /**
   * 定期的にデータを更新する
   * @param {Function} callback - データ更新後のコールバック関数
   */
  startAutoRefresh(callback) {
    // 既存のタイマーがあれば解除
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    // 定期的にデータを更新するタイマーを設定
    this.refreshTimer = setInterval(async () => {
      console.log('データを自動更新します');
      try {
        const data = await this.fetchData('summary');
        if (callback && typeof callback === 'function') {
          callback(data);
        }
      } catch (error) {
        console.error('データの自動更新中にエラーが発生しました:', error);
        notificationUtils.showError('データの自動更新に失敗しました');
      }
    }, this.config.refreshInterval);
    
    return this.refreshTimer;
  }

  /**
   * 自動更新を停止する
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// APIサービスのインスタンスを作成
const apiService = new ApiService(); 