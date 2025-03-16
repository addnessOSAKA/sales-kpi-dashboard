/**
 * 営業チームKPIダッシュボード メインスクリプト
 * アプリケーションの初期化と機能統合を行います
 */

document.addEventListener('DOMContentLoaded', function() {
  // サービスワーカーの登録
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker 登録成功:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker 登録失敗:', error);
      });
  }
  
  // 接続状態の監視
  const connectionStatus = document.getElementById('connection-status');
  
  function updateConnectionStatus() {
    if (navigator.onLine) {
      connectionStatus.textContent = 'オンライン';
      connectionStatus.classList.remove('offline');
      connectionStatus.classList.add('online');
    } else {
      connectionStatus.textContent = 'オフライン';
      connectionStatus.classList.remove('online');
      connectionStatus.classList.add('offline');
    }
  }
  
  // 初期状態を設定
  updateConnectionStatus();
  
  // オンライン/オフライン状態の変化を監視
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
  
  // PWAインストールボタンの設定
  let deferredPrompt;
  const installButton = document.getElementById('install-app');
  
  window.addEventListener('beforeinstallprompt', (e) => {
    // インストールプロンプトを表示せずに保存
    e.preventDefault();
    deferredPrompt = e;
    
    // インストールボタンを表示
    if (installButton) {
      installButton.style.display = 'block';
      
      installButton.addEventListener('click', () => {
        // インストールプロンプトを表示
        deferredPrompt.prompt();
        
        // ユーザーの選択を待機
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('ユーザーがPWAのインストールを承認しました');
            window.notificationUtils.showSuccess('アプリがインストールされました');
          } else {
            console.log('ユーザーがPWAのインストールを拒否しました');
          }
          
          // プロンプトを破棄
          deferredPrompt = null;
          
          // インストールボタンを非表示
          installButton.style.display = 'none';
        });
      });
    }
  });
  
  // PWAがインストールされた場合
  window.addEventListener('appinstalled', (e) => {
    console.log('アプリがインストールされました');
    
    // インストールボタンを非表示
    if (installButton) {
      installButton.style.display = 'none';
    }
  });
  
  // 認証関連の設定
  initAuthUI();
  
  // 各サービスの初期化
  initializeServices();
  
  // ビュー要素
  const viewSelector = document.getElementById('view-selector');
  const weeklyDashboard = document.getElementById('weekly-dashboard');
  const monthlyDashboard = document.getElementById('monthly-dashboard');
  const membersDashboard = document.getElementById('members-dashboard');
  const dailyDataDashboard = document.getElementById('daily-data-dashboard');
  const projectsDashboard = document.getElementById('projects-dashboard');
  
  // 現在のビュー
  let currentView = 'weekly';
  
  // イベントリスナー
  if (viewSelector) {
    viewSelector.addEventListener('change', handleViewChange);
  }
  
  // データ更新ボタン
  const refreshButton = document.getElementById('refresh-data');
  if (refreshButton) {
    refreshButton.addEventListener('click', refreshData);
  }
  
  // 設定ボタン
  const settingsButton = document.getElementById('settings-btn');
  if (settingsButton) {
    settingsButton.addEventListener('click', openSettings);
  }
  
  // ウィンドウのリサイズイベントリスナー
  window.addEventListener('resize', handleResize);
  
  /**
   * サービスを初期化する
   */
  function initializeServices() {
    try {
      // IndexedDBサービスの初期化
      if (!window.dbService) {
        window.dbService = new DbService();
      }
      
      // APIサービスの初期化
      if (!window.apiService) {
        window.apiService = new ApiService();
      }
      
      // 同期サービスの初期化
      if (!window.syncService) {
        window.syncService = new SyncService(window.dbService, window.apiService);
        window.syncService.init();
      }
      
      // 通知ユーティリティの初期化
      if (!window.notificationUtils) {
        window.notificationUtils = new NotificationUtils();
      }
      
      // エクスポートユーティリティの初期化
      if (!window.exportUtils) {
        window.exportUtils = new ExportUtils();
      }
      
      console.log('すべてのサービスが初期化されました');
      
      // すべての機能を初期化
      initializeAllFeatures();
    } catch (error) {
      console.error('サービスの初期化中にエラーが発生しました:', error);
    }
  }
  
  /**
   * すべての機能を初期化する
   */
  function initializeAllFeatures() {
    try {
      // チャート関連の機能を初期化
      initializeCharts();
      
      // PWAインストール機能を初期化
      initializeInstallPrompt();
      
      // エクスポート機能を初期化
      initializeExportFeatures();
      
      // 共有機能を初期化
      initializeShareFeature();
      
      // 通知許可を要求
      requestNotificationPermission();
      
      // オフラインモードの表示を更新
      updateOfflineUI();
      
      // 同期状態の表示を更新
      updateSyncUI();
      
      console.log('すべての機能が初期化されました');
    } catch (error) {
      console.error('機能の初期化中にエラーが発生しました:', error);
    }
  }
  
  /**
   * ビュー変更ハンドラー
   */
  function handleViewChange() {
    const newView = viewSelector.value;
    
    // 現在のビューを非表示
    hideAllDashboards();
    
    // 新しいビューを表示
    showDashboard(newView);
    
    // 現在のビューを更新
    currentView = newView;
    
    // 通知を表示
    window.notificationUtils.showInfo(`${getViewName(currentView)}ビューを表示しています`);
  }
  
  /**
   * すべてのダッシュボードを非表示にする
   */
  function hideAllDashboards() {
    const dashboards = document.querySelectorAll('.dashboard');
    dashboards.forEach(dashboard => {
      dashboard.style.display = 'none';
    });
  }
  
  /**
   * 指定したダッシュボードを表示する
   * @param {string} view - 表示するビュー
   */
  function showDashboard(view) {
    const dashboard = document.getElementById(`${view}-dashboard`);
    if (dashboard) {
      dashboard.style.display = 'block';
    }
  }
  
  /**
   * データを更新する
   */
  function refreshData() {
    try {
      // オンライン状態を確認
      if (navigator.onLine) {
        // APIからデータを取得して同期
        window.syncService.fetchAndSaveData()
          .then(() => {
            window.notificationUtils.showSuccess('データが更新されました');
          })
          .catch(error => {
            console.error('データ更新エラー:', error);
            window.notificationUtils.showError('データの更新に失敗しました');
          });
      } else {
        window.notificationUtils.showWarning('オフライン状態です。オンラインに接続してから再試行してください');
      }
    } catch (error) {
      console.error('データ更新中にエラーが発生しました:', error);
      window.notificationUtils.showError('データの更新に失敗しました');
    }
  }
  
  /**
   * 設定画面を開く
   */
  function openSettings() {
    // 設定モーダルを表示
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'block';
      
      // 現在の設定を読み込む
      loadCurrentSettings();
      
      // 閉じるボタンのイベントリスナー
      const closeButton = settingsModal.querySelector('.close-btn');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          settingsModal.style.display = 'none';
        });
      }
      
      // 保存ボタンのイベントリスナー
      const saveButton = settingsModal.querySelector('#save-settings');
      if (saveButton) {
        saveButton.addEventListener('click', saveSettings);
      }
      
      // リセットボタンのイベントリスナー
      const resetButton = settingsModal.querySelector('#reset-settings');
      if (resetButton) {
        resetButton.addEventListener('click', resetSettings);
      }
    }
  }
  
  /**
   * 現在の設定を読み込む
   */
  function loadCurrentSettings() {
    // 設定フォームに現在の設定値を設定
    const apiBaseUrlInput = document.getElementById('api-base-url');
    const apiKeyInput = document.getElementById('api-key');
    const spreadsheetIdInput = document.getElementById('spreadsheet-id');
    const refreshIntervalInput = document.getElementById('refresh-interval');
    const notificationsEnabledInput = document.getElementById('notifications-enabled');
    
    if (apiBaseUrlInput) {
      apiBaseUrlInput.value = window.appConfig.apiBaseUrl || '';
    }
    
    if (apiKeyInput) {
      apiKeyInput.value = window.appConfig.apiKey || '';
    }
    
    if (spreadsheetIdInput) {
      spreadsheetIdInput.value = window.appConfig.spreadsheetId || '';
    }
    
    if (refreshIntervalInput) {
      const minutes = (window.appConfig.refreshInterval || 300000) / 60000;
      refreshIntervalInput.value = minutes;
    }
    
    if (notificationsEnabledInput) {
      notificationsEnabledInput.checked = window.appConfig.notifications?.enabled !== false;
    }
  }
  
  /**
   * 設定を保存する
   */
  function saveSettings() {
    try {
      // フォームから設定値を取得
      const apiBaseUrl = document.getElementById('api-base-url').value;
      const apiKey = document.getElementById('api-key').value;
      const spreadsheetId = document.getElementById('spreadsheet-id').value;
      const refreshInterval = parseInt(document.getElementById('refresh-interval').value, 10) * 60000;
      const notificationsEnabled = document.getElementById('notifications-enabled').checked;
      
      // 設定を更新
      const newConfig = {
        apiBaseUrl,
        apiKey,
        spreadsheetId,
        refreshInterval,
        notifications: {
          enabled: notificationsEnabled,
          duration: window.appConfig.notifications?.duration || 3000
        }
      };
      
      // 設定を保存
      window.configUtils.updateConfig(newConfig);
      
      // 設定モーダルを閉じる
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal) {
        settingsModal.style.display = 'none';
      }
      
      // 通知を表示
      window.notificationUtils.showSuccess('設定が保存されました');
      
      // サービスを再初期化
      initializeServices();
      
      // データを更新
      refreshData();
    } catch (error) {
      console.error('設定の保存中にエラーが発生しました:', error);
      window.notificationUtils.showError('設定の保存に失敗しました');
    }
  }
  
  /**
   * 設定をリセットする
   */
  function resetSettings() {
    if (confirm('設定をリセットしてもよろしいですか？')) {
      try {
        // 設定をリセット
        window.configUtils.resetConfig();
        
        // 通知を表示
        window.notificationUtils.showSuccess('設定がリセットされました');
      } catch (error) {
        console.error('設定のリセット中にエラーが発生しました:', error);
        window.notificationUtils.showError('設定のリセットに失敗しました');
      }
    }
  }
  
  /**
   * リサイズハンドラー
   */
  function handleResize() {
    // チャートのリサイズ処理
    // Chart.jsは自動的にリサイズされるため、特別な処理は不要
  }
  
  /**
   * ビュー名を取得
   * @param {string} view - ビュー識別子
   * @returns {string} ビュー名
   */
  function getViewName(view) {
    switch (view) {
      case 'weekly':
        return '週次';
      case 'monthly':
        return '月次';
      case 'members':
        return '担当者別';
      case 'daily-data':
        return '日次データ';
      case 'projects':
        return '案件管理';
      default:
        return '';
    }
  }
  
  // 初期ビューを表示
  hideAllDashboards();
  showDashboard(currentView);
  
  // データの初期読み込み
  refreshData();
  
  // 自動更新の設定
  setupAutoRefresh();
  
  /**
   * 自動更新を設定
   */
  function setupAutoRefresh() {
    const refreshInterval = window.appConfig.refreshInterval || 5 * 60 * 1000; // デフォルト5分
    
    if (refreshInterval > 0) {
      setInterval(refreshData, refreshInterval);
      console.log(`データの自動更新が${refreshInterval / 60000}分間隔で設定されました`);
    }
  }
  
  /**
   * チャート関連の機能を初期化する
   */
  function initializeCharts() {
    // Chart.jsの設定
    Chart.defaults.font.family = "'Noto Sans JP', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#333';
    
    // 週次チャートの初期化
    initializeWeeklyCharts();
    
    // 月次チャートの初期化
    initializeMonthlyCharts();
    
    // 担当者別チャートの初期化
    initializeMemberCharts();
  }
  
  /**
   * 週次チャートを初期化する
   */
  function initializeWeeklyCharts() {
    // 週次チャートの初期化処理
    // 実際のアプリケーションでは、ここで週次チャートを初期化
  }
  
  /**
   * 月次チャートを初期化する
   */
  function initializeMonthlyCharts() {
    // 月次チャートの初期化処理
    // 実際のアプリケーションでは、ここで月次チャートを初期化
  }
  
  /**
   * 担当者別チャートを初期化する
   */
  function initializeMemberCharts() {
    // 担当者別チャートの初期化処理
    // 実際のアプリケーションでは、ここで担当者別チャートを初期化
  }
  
  /**
   * アプリのインストール機能を初期化する
   */
  function initializeInstallPrompt() {
    // PWAインストールボタンの設定
    const installButton = document.getElementById('install-app');
    if (!installButton) return;
    
    // 初期状態では非表示
    installButton.style.display = 'none';
    
    // インストールプロンプトイベントを監視
    window.addEventListener('beforeinstallprompt', (e) => {
      // インストールプロンプトを表示せずに保存
      e.preventDefault();
      window.deferredPrompt = e;
      
      // インストールボタンを表示
      installButton.style.display = 'block';
    });
    
    // インストールボタンのクリックイベント
    installButton.addEventListener('click', async () => {
      if (!window.deferredPrompt) return;
      
      // インストールプロンプトを表示
      window.deferredPrompt.prompt();
      
      // ユーザーの選択を待機
      const { outcome } = await window.deferredPrompt.userChoice;
      
      // 結果に応じた処理
      if (outcome === 'accepted') {
        window.notificationUtils.showSuccess('アプリがインストールされました');
      }
      
      // プロンプトを破棄
      window.deferredPrompt = null;
      
      // インストールボタンを非表示
      installButton.style.display = 'none';
    });
    
    // PWAがインストールされた場合
    window.addEventListener('appinstalled', () => {
      // インストールボタンを非表示
      installButton.style.display = 'none';
      
      // プロンプトを破棄
      window.deferredPrompt = null;
      
      // 通知を表示
      window.notificationUtils.showSuccess('アプリがインストールされました');
    });
  }
  
  /**
   * エクスポート機能を初期化する
   */
  function initializeExportFeatures() {
    // エクスポートボタンのイベントリスナーを設定
    const exportButtons = document.querySelectorAll('.export-btn');
    exportButtons.forEach(button => {
      button.addEventListener('click', () => {
        const format = button.getAttribute('data-format') || 'csv';
        const viewType = button.getAttribute('data-view') || currentView;
        
        // エクスポートユーティリティを使用してエクスポート
        if (window.exportUtils) {
          window.exportUtils.exportCurrentView(viewType);
        } else {
          window.notificationUtils.showError('エクスポート機能が利用できません');
        }
      });
    });
  }
  
  /**
   * 共有機能を初期化する
   */
  function initializeShareFeature() {
    // 共有ボタンのイベントリスナーを設定
    const shareButton = document.getElementById('share-btn');
    if (!shareButton) return;
    
    // Web Share APIがサポートされているか確認
    if (navigator.share) {
      shareButton.style.display = 'block';
      
      shareButton.addEventListener('click', async () => {
        try {
          await navigator.share({
            title: '営業チームKPIダッシュボード',
            text: '営業チームのKPIを管理するためのダッシュボードです。',
            url: window.location.href
          });
          
          window.notificationUtils.showSuccess('共有しました');
        } catch (error) {
          console.error('共有エラー:', error);
          
          if (error.name !== 'AbortError') {
            window.notificationUtils.showError('共有に失敗しました');
          }
        }
      });
    } else {
      // Web Share APIがサポートされていない場合は非表示
      shareButton.style.display = 'none';
    }
  }
  
  /**
   * 通知許可を要求する
   */
  function requestNotificationPermission() {
    // 通知ボタンのイベントリスナーを設定
    const notificationButton = document.getElementById('notification-btn');
    if (!notificationButton) return;
    
    // 通知がサポートされているか確認
    if ('Notification' in window) {
      // 現在の通知許可状態を確認
      if (Notification.permission === 'granted') {
        notificationButton.textContent = '通知: オン';
        notificationButton.classList.add('active');
      } else if (Notification.permission === 'denied') {
        notificationButton.textContent = '通知: ブロック';
        notificationButton.classList.add('disabled');
      }
      
      // 通知ボタンのクリックイベント
      notificationButton.addEventListener('click', async () => {
        if (Notification.permission === 'denied') {
          window.notificationUtils.showWarning('ブラウザの設定から通知の許可を変更してください');
          return;
        }
        
        if (Notification.permission === 'granted') {
          // 通知をオフにする（実際には許可を取り消せないので、設定で無効化）
          window.appConfig.notifications.enabled = false;
          window.configUtils.saveConfig(window.appConfig);
          
          notificationButton.textContent = '通知: オフ';
          notificationButton.classList.remove('active');
          
          window.notificationUtils.showInfo('通知が無効になりました');
        } else {
          // 通知の許可を要求
          const permission = await Notification.requestPermission();
          
          if (permission === 'granted') {
            window.appConfig.notifications.enabled = true;
            window.configUtils.saveConfig(window.appConfig);
            
            notificationButton.textContent = '通知: オン';
            notificationButton.classList.add('active');
            
            // テスト通知を送信
            window.notificationUtils.sendPushNotification(
              '通知が有効になりました',
              '重要な更新があった場合に通知が届きます'
            );
          } else {
            notificationButton.textContent = '通知: ブロック';
            notificationButton.classList.add('disabled');
            
            window.notificationUtils.showWarning('通知が許可されませんでした');
          }
        }
      });
    } else {
      // 通知がサポートされていない場合は非表示
      notificationButton.style.display = 'none';
    }
  }
  
  /**
   * オフラインモードの表示を更新する
   */
  function updateOfflineUI() {
    // オフラインモードの表示を更新
    const offlineIndicator = document.getElementById('offline-indicator');
    if (!offlineIndicator) return;
    
    // オンライン/オフライン状態の変化を監視
    window.addEventListener('online', () => {
      offlineIndicator.style.display = 'none';
      
      // データを同期
      if (window.syncService) {
        window.syncService.syncData();
      }
      
      window.notificationUtils.showSuccess('オンラインに接続しました');
    });
    
    window.addEventListener('offline', () => {
      offlineIndicator.style.display = 'block';
      window.notificationUtils.showWarning('オフラインモードに切り替わりました');
    });
    
    // 初期状態を設定
    if (navigator.onLine) {
      offlineIndicator.style.display = 'none';
    } else {
      offlineIndicator.style.display = 'block';
    }
  }
  
  /**
   * 同期状態の表示を更新する
   */
  function updateSyncUI() {
    // 同期状態の表示を更新
    const syncIndicator = document.getElementById('sync-indicator');
    if (!syncIndicator || !window.syncService) return;
    
    // 同期状態の変化を監視
    window.syncService.addStatusChangeListener((isOnline) => {
      if (isOnline) {
        syncIndicator.classList.remove('syncing');
        syncIndicator.classList.add('synced');
        syncIndicator.title = '同期済み';
      } else {
        syncIndicator.classList.remove('synced');
        syncIndicator.classList.add('syncing');
        syncIndicator.title = '同期中...';
      }
    });
    
    // 同期ボタンのクリックイベント
    syncIndicator.addEventListener('click', () => {
      if (navigator.onLine) {
        window.syncService.syncData();
        window.notificationUtils.showInfo('同期を開始しました');
      } else {
        window.notificationUtils.showWarning('オフライン状態です。オンラインに接続してから再試行してください');
      }
    });
  }
});

/**
 * 認証UI関連の初期化
 */
function initAuthUI() {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userProfileBtn = document.getElementById('user-profile-btn');
  const authModal = document.getElementById('auth-modal');
  const closeAuthModal = document.getElementById('close-auth-modal');
  const profileModal = document.getElementById('profile-modal');
  const closeProfileModal = document.getElementById('close-profile-modal');
  const profileSettingsForm = document.getElementById('profile-settings-form');
  
  // ログインボタンクリック時の処理
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      if (window.authService) {
        window.authService.showLoginModal();
      } else {
        console.error('認証サービスが初期化されていません');
        showNotification('エラー', '認証サービスが利用できません', 'error');
      }
    });
  }
  
  // ログアウトボタンクリック時の処理
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (window.authService) {
        window.authService.logout();
      }
    });
  }
  
  // プロファイルボタンクリック時の処理
  if (userProfileBtn) {
    userProfileBtn.addEventListener('click', () => {
      showUserProfile();
    });
  }
  
  // 認証モーダルを閉じる
  if (closeAuthModal) {
    closeAuthModal.addEventListener('click', () => {
      if (authModal) {
        authModal.style.display = 'none';
      }
    });
  }
  
  // プロファイルモーダルを閉じる
  if (closeProfileModal) {
    closeProfileModal.addEventListener('click', () => {
      if (profileModal) {
        profileModal.style.display = 'none';
      }
    });
  }
  
  // モーダル外クリックで閉じる
  window.addEventListener('click', (event) => {
    if (event.target === authModal) {
      authModal.style.display = 'none';
    }
    if (event.target === profileModal) {
      profileModal.style.display = 'none';
    }
  });
  
  // プロファイル設定フォームの送信処理
  if (profileSettingsForm) {
    profileSettingsForm.addEventListener('submit', (event) => {
      event.preventDefault();
      saveUserSettings();
    });
  }
  
  // 認証状態の変更を監視
  if (window.authService) {
    window.authService.addAuthStateListener((user) => {
      updateUIForAuthState(user);
    });
  }
}

/**
 * 認証状態に基づいてUIを更新
 * @param {Object} user - 認証されたユーザー情報
 */
function updateUIForAuthState(user) {
  const adminElements = document.querySelectorAll('.admin-only');
  const managerElements = document.querySelectorAll('.manager-only');
  
  if (user) {
    // ユーザーがログインしている場合
    if (window.authService) {
      window.authService.getCurrentUserProfile().then(profile => {
        if (profile) {
          // 管理者要素の表示/非表示
          adminElements.forEach(el => {
            el.style.display = profile.role === 'admin' ? 'block' : 'none';
          });
          
          // マネージャー要素の表示/非表示
          managerElements.forEach(el => {
            el.style.display = ['manager', 'admin'].includes(profile.role) ? 'block' : 'none';
          });
          
          // ユーザー設定の適用
          applyUserSettings(profile.settings);
        }
      });
    }
  } else {
    // 未ログイン状態
    adminElements.forEach(el => {
      el.style.display = 'none';
    });
    
    managerElements.forEach(el => {
      el.style.display = 'none';
    });
  }
}

/**
 * ユーザープロファイルを表示
 */
async function showUserProfile() {
  if (!window.authService) return;
  
  const user = window.authService.getCurrentUser();
  if (!user) return;
  
  const profileModal = document.getElementById('profile-modal');
  const profileAvatar = document.getElementById('profile-avatar');
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileRole = document.getElementById('profile-role');
  const themeSelect = document.getElementById('theme-select');
  const defaultViewSelect = document.getElementById('default-view-select');
  const notificationsCheckbox = document.getElementById('notifications-checkbox');
  
  try {
    // ユーザープロファイルを取得
    const profile = await window.authService.getCurrentUserProfile();
    
    if (profile) {
      // プロファイル情報を表示
      if (profileAvatar) {
        profileAvatar.src = user.photoURL || 'images/default-avatar.png';
      }
      
      if (profileName) {
        profileName.textContent = user.displayName || user.email;
      }
      
      if (profileEmail) {
        profileEmail.textContent = user.email;
      }
      
      if (profileRole) {
        const roleNames = {
          'admin': '管理者',
          'manager': 'マネージャー',
          'user': '一般ユーザー'
        };
        profileRole.querySelector('span').textContent = roleNames[profile.role] || '一般ユーザー';
      }
      
      // 設定フォームに値を設定
      if (profile.settings) {
        if (themeSelect) {
          themeSelect.value = profile.settings.theme || 'light';
        }
        
        if (defaultViewSelect) {
          defaultViewSelect.value = profile.settings.defaultView || 'weekly';
        }
        
        if (notificationsCheckbox) {
          notificationsCheckbox.checked = profile.settings.notifications !== false;
        }
      }
      
      // モーダルを表示
      if (profileModal) {
        profileModal.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('プロファイル取得エラー:', error);
    showNotification('エラー', 'プロファイル情報の取得に失敗しました', 'error');
  }
}

/**
 * ユーザー設定を保存
 */
async function saveUserSettings() {
  if (!window.authService) return;
  
  const user = window.authService.getCurrentUser();
  if (!user) return;
  
  const themeSelect = document.getElementById('theme-select');
  const defaultViewSelect = document.getElementById('default-view-select');
  const notificationsCheckbox = document.getElementById('notifications-checkbox');
  
  try {
    const settings = {
      theme: themeSelect ? themeSelect.value : 'light',
      defaultView: defaultViewSelect ? defaultViewSelect.value : 'weekly',
      notifications: notificationsCheckbox ? notificationsCheckbox.checked : true
    };
    
    // 設定を保存
    const success = await window.authService.updateUserProfile({ settings });
    
    if (success) {
      // 設定を適用
      applyUserSettings(settings);
      
      // モーダルを閉じる
      const profileModal = document.getElementById('profile-modal');
      if (profileModal) {
        profileModal.style.display = 'none';
      }
      
      showNotification('設定保存', '設定が保存されました', 'success');
    }
  } catch (error) {
    console.error('設定保存エラー:', error);
    showNotification('エラー', '設定の保存に失敗しました', 'error');
  }
}

/**
 * ユーザー設定を適用
 * @param {Object} settings - ユーザー設定
 */
function applyUserSettings(settings) {
  if (!settings) return;
  
  // テーマの適用
  if (settings.theme) {
    document.documentElement.setAttribute('data-theme', settings.theme);
    
    if (settings.theme === 'system') {
      // システム設定に合わせる
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }
  
  // デフォルト表示の適用
  if (settings.defaultView) {
    const viewSelector = document.getElementById('viewSelector');
    if (viewSelector && viewSelector.value !== settings.defaultView) {
      viewSelector.value = settings.defaultView;
      // 表示を切り替え
      changeView(settings.defaultView);
    }
  }
}

/**
 * 通知を表示
 * @param {string} title - 通知タイトル
 * @param {string} message - 通知メッセージ
 * @param {string} type - 通知タイプ (success, error, warning, info)
 */
function showNotification(title, message, type = 'info') {
  if (window.notificationUtils) {
    window.notificationUtils.show(title, message, type);
  } else {
    console.log(`${type}: ${title} - ${message}`);
  }
} 