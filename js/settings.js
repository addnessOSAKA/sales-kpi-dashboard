/**
 * 営業チームKPIダッシュボード 設定画面
 * このファイルは設定画面の機能を提供します
 */

document.addEventListener('DOMContentLoaded', function() {
  // 通知ユーティリティのインスタンスを作成
  if (typeof notificationUtils === 'undefined') {
    window.notificationUtils = new NotificationUtils();
  }
  
  // 設定フォーム要素
  const dataSourceRadios = document.querySelectorAll('input[name="data-source"]');
  const localSettings = document.getElementById('local-settings');
  const spreadsheetSettings = document.getElementById('spreadsheet-settings');
  
  const apiKeyInput = document.getElementById('api-key');
  const spreadsheetIdInput = document.getElementById('spreadsheet-id');
  const weeklySheetInput = document.getElementById('weekly-sheet');
  const monthlySheetInput = document.getElementById('monthly-sheet');
  const membersSheetInput = document.getElementById('members-sheet');
  
  const refreshIntervalInput = document.getElementById('refresh-interval');
  const enableCacheInput = document.getElementById('enable-cache');
  const cacheExpiryInput = document.getElementById('cache-expiry');
  
  const enableGoalAlertInput = document.getElementById('enable-goal-alert');
  const goalThresholdInput = document.getElementById('goal-threshold');
  const enableWarningAlertInput = document.getElementById('enable-warning-alert');
  const warningThresholdInput = document.getElementById('warning-threshold');
  
  const testConnectionButton = document.getElementById('test-connection');
  const saveSettingsButton = document.getElementById('save-settings');
  const resetSettingsButton = document.getElementById('reset-settings');
  
  // データソース切り替え
  dataSourceRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'local') {
        localSettings.style.display = 'block';
        spreadsheetSettings.style.display = 'none';
      } else if (this.value === 'spreadsheet') {
        localSettings.style.display = 'none';
        spreadsheetSettings.style.display = 'block';
      }
    });
  });
  
  // 設定を読み込む
  loadSettings();
  
  // 接続テストボタン
  testConnectionButton.addEventListener('click', testConnection);
  
  // 設定保存ボタン
  saveSettingsButton.addEventListener('click', saveSettings);
  
  // 設定リセットボタン
  resetSettingsButton.addEventListener('click', resetSettings);
  
  /**
   * 設定を読み込む
   */
  function loadSettings() {
    try {
      // ローカルストレージから設定を読み込む
      const savedSettings = localStorage.getItem('kpiDashboardSettings');
      
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // データソース設定
        if (settings.dataSource === 'spreadsheet') {
          document.querySelector('input[name="data-source"][value="spreadsheet"]').checked = true;
          localSettings.style.display = 'none';
          spreadsheetSettings.style.display = 'block';
        } else {
          document.querySelector('input[name="data-source"][value="local"]').checked = true;
        }
        
        // スプレッドシート設定
        if (settings.spreadsheet) {
          apiKeyInput.value = settings.spreadsheet.apiKey || '';
          spreadsheetIdInput.value = settings.spreadsheet.id || '';
          weeklySheetInput.value = settings.spreadsheet.sheets?.weekly || 'Weekly';
          monthlySheetInput.value = settings.spreadsheet.sheets?.monthly || 'Monthly';
          membersSheetInput.value = settings.spreadsheet.sheets?.members || 'Members';
        }
        
        // データ更新設定
        refreshIntervalInput.value = Math.floor((settings.refreshInterval || 300000) / 60000);
        enableCacheInput.checked = settings.cache?.enabled !== false;
        cacheExpiryInput.value = Math.floor((settings.cache?.expiry || 600000) / 60000);
        
        // 通知設定
        enableGoalAlertInput.checked = settings.notification?.goalAlert?.enabled !== false;
        goalThresholdInput.value = settings.notification?.goalAlert?.threshold || 90;
        enableWarningAlertInput.checked = settings.notification?.warningAlert?.enabled !== false;
        warningThresholdInput.value = settings.notification?.warningAlert?.threshold || 60;
      }
    } catch (error) {
      console.error('設定の読み込み中にエラーが発生しました:', error);
      notificationUtils.showError('設定の読み込みに失敗しました');
    }
  }
  
  /**
   * 設定を保存する
   */
  function saveSettings() {
    try {
      const dataSource = document.querySelector('input[name="data-source"]:checked').value;
      
      // 設定オブジェクトを作成
      const settings = {
        dataSource: dataSource,
        spreadsheet: {
          enabled: dataSource === 'spreadsheet',
          apiKey: apiKeyInput.value,
          id: spreadsheetIdInput.value,
          sheets: {
            weekly: weeklySheetInput.value,
            monthly: monthlySheetInput.value,
            members: membersSheetInput.value
          }
        },
        refreshInterval: parseInt(refreshIntervalInput.value) * 60000,
        cache: {
          enabled: enableCacheInput.checked,
          expiry: parseInt(cacheExpiryInput.value) * 60000
        },
        notification: {
          goalAlert: {
            enabled: enableGoalAlertInput.checked,
            threshold: parseInt(goalThresholdInput.value)
          },
          warningAlert: {
            enabled: enableWarningAlertInput.checked,
            threshold: parseInt(warningThresholdInput.value)
          }
        }
      };
      
      // ローカルストレージに保存
      localStorage.setItem('kpiDashboardSettings', JSON.stringify(settings));
      
      // グローバル設定を更新
      updateGlobalConfig(settings);
      
      notificationUtils.showSuccess('設定を保存しました');
    } catch (error) {
      console.error('設定の保存中にエラーが発生しました:', error);
      notificationUtils.showError('設定の保存に失敗しました');
    }
  }
  
  /**
   * グローバル設定を更新する
   * @param {Object} settings - 設定オブジェクト
   */
  function updateGlobalConfig(settings) {
    // API設定を更新
    if (window.API_CONFIG) {
      // スプレッドシート設定
      API_CONFIG.spreadsheet = settings.spreadsheet;
      
      // データ更新間隔
      API_CONFIG.refreshInterval = settings.refreshInterval;
      
      // キャッシュ設定
      API_CONFIG.cache = settings.cache;
    }
    
    // 通知設定を更新
    if (window.NOTIFICATION_CONFIG) {
      NOTIFICATION_CONFIG.goalAlert = settings.notification.goalAlert;
      NOTIFICATION_CONFIG.warningAlert = settings.notification.warningAlert;
    }
  }
  
  /**
   * 設定をリセットする
   */
  function resetSettings() {
    if (confirm('設定を初期状態に戻しますか？')) {
      // ローカルストレージから設定を削除
      localStorage.removeItem('kpiDashboardSettings');
      
      // フォームをリセット
      document.querySelector('input[name="data-source"][value="local"]').checked = true;
      localSettings.style.display = 'block';
      spreadsheetSettings.style.display = 'none';
      
      apiKeyInput.value = '';
      spreadsheetIdInput.value = '';
      weeklySheetInput.value = 'Weekly';
      monthlySheetInput.value = 'Monthly';
      membersSheetInput.value = 'Members';
      
      refreshIntervalInput.value = 5;
      enableCacheInput.checked = true;
      cacheExpiryInput.value = 10;
      
      enableGoalAlertInput.checked = true;
      goalThresholdInput.value = 90;
      enableWarningAlertInput.checked = true;
      warningThresholdInput.value = 60;
      
      notificationUtils.showSuccess('設定をリセットしました');
    }
  }
  
  /**
   * スプレッドシート接続をテストする
   */
  async function testConnection() {
    try {
      // 入力値を検証
      if (!apiKeyInput.value) {
        notificationUtils.showError('Google API キーを入力してください');
        return;
      }
      
      if (!spreadsheetIdInput.value) {
        notificationUtils.showError('スプレッドシートIDを入力してください');
        return;
      }
      
      // テスト中の表示
      testConnectionButton.textContent = 'テスト中...';
      testConnectionButton.disabled = true;
      
      // テスト用の設定を作成
      const testConfig = {
        spreadsheet: {
          enabled: true,
          apiKey: apiKeyInput.value,
          id: spreadsheetIdInput.value,
          sheets: {
            weekly: weeklySheetInput.value,
            monthly: monthlySheetInput.value,
            members: membersSheetInput.value
          }
        }
      };
      
      // テスト用のAPIサービスを作成
      const testApiService = new ApiService(testConfig);
      
      // 接続テスト
      await testApiService.initGoogleApi();
      
      // シートの存在確認
      const sheetNames = [weeklySheetInput.value, monthlySheetInput.value, membersSheetInput.value];
      const missingSheets = [];
      
      for (const sheetName of sheetNames) {
        try {
          const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetIdInput.value,
            range: `${sheetName}!A1:A1`
          });
        } catch (error) {
          missingSheets.push(sheetName);
        }
      }
      
      if (missingSheets.length > 0) {
        notificationUtils.showWarning(`接続は成功しましたが、以下のシートが見つかりませんでした: ${missingSheets.join(', ')}`);
      } else {
        notificationUtils.showSuccess('スプレッドシートへの接続に成功しました');
      }
    } catch (error) {
      console.error('接続テスト中にエラーが発生しました:', error);
      notificationUtils.showError(`接続テストに失敗しました: ${error.message}`);
    } finally {
      // ボタンを元に戻す
      testConnectionButton.textContent = '接続テスト';
      testConnectionButton.disabled = false;
    }
  }
}); 