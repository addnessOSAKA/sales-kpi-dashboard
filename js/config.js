/**
 * 営業チームKPIダッシュボード 設定ファイル
 * アプリケーションの設定を管理します
 */

// アプリケーション設定
window.appConfig = {
  // アプリケーション情報
  appName: '営業チームKPIダッシュボード',
  version: '1.0.0',
  
  // API設定
  api: {
    baseUrl: '', // APIのベースURL
    key: '',     // APIキー
  },
  
  // Google Sheets連携設定
  googleSheets: {
    spreadsheetId: '' // スプレッドシートID
  },
  
  // Firebase設定
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  },
  
  // データ更新間隔（ミリ秒）
  refreshInterval: 5 * 60 * 1000, // 5分
  
  // オフライン機能設定
  offline: {
    enabled: true,
    syncInterval: 10 * 60 * 1000, // 10分
    maxRetries: 3,
    retryDelay: 30 * 1000 // 30秒
  },
  
  // 通知設定
  notifications: {
    displayDuration: 3000, // 3秒
    position: 'top-right',
    sound: true
  },
  
  // 表示設定
  display: {
    dateFormat: 'YYYY年MM月DD日',
    currencyFormat: '¥#,###',
    defaultPeriod: {
      weekly: 'current',
      monthly: 'current'
    },
    pagination: {
      itemsPerPage: 10,
      maxPagesShown: 5
    }
  },
  
  // チャート設定
  charts: {
    colors: [
      '#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6',
      '#1abc9c', '#d35400', '#34495e', '#16a085', '#c0392b'
    ],
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  },
  
  // 目標設定
  goals: {
    approach: 160,
    meeting: 120,
    negotiation: 90,
    proposal: 50,
    contract: 20,
    amount: 40000000
  },
  
  // しきい値設定
  thresholds: {
    danger: 70,  // 70%未満は危険
    warning: 90, // 70-90%は警告
    good: 100    // 90%以上は良好
  },
  
  // 認証設定
  auth: {
    requireAuth: true,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24時間
    roles: ['user', 'manager', 'admin']
  }
};

// 設定の読み込み（ローカルストレージから）
function loadConfig() {
  try {
    const savedConfig = localStorage.getItem('appConfig');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      
      // 保存された設定を現在の設定にマージ
      window.appConfig = {
        ...window.appConfig,
        ...parsedConfig
      };
      
      console.log('設定を読み込みました');
    }
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
  }
}

// 設定の保存（ローカルストレージに）
function saveConfig(config) {
  try {
    localStorage.setItem('appConfig', JSON.stringify(config));
    console.log('設定を保存しました');
    return true;
  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
    return false;
  }
}

// 設定の更新
function updateConfig(newConfig) {
  // 現在の設定と新しい設定をマージ
  window.appConfig = {
    ...window.appConfig,
    ...newConfig
  };
  
  // 設定を保存
  return saveConfig(window.appConfig);
}

// 設定のリセット
function resetConfig() {
  try {
    localStorage.removeItem('appConfig');
    console.log('設定をリセットしました');
    
    // ページをリロード
    window.location.reload();
    
    return true;
  } catch (error) {
    console.error('設定のリセットに失敗しました:', error);
    return false;
  }
}

// 設定をグローバルに公開
window.configUtils = {
  loadConfig,
  saveConfig,
  updateConfig,
  resetConfig
};

// 初期化時に設定を読み込む
loadConfig(); 