/**
 * 営業チームKPIダッシュボード メインスクリプト
 * アプリケーションの初期化と機能統合を行います
 */

document.addEventListener('DOMContentLoaded', function() {
  // サービスワーカーの登録
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/営業管理KPI/service-worker.js')
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
  const viewSelector = document.getElementById('viewSelector');
  const weeklyDashboard = document.getElementById('weekly-dashboard');
  const monthlyDashboard = document.getElementById('monthly-dashboard');
  const membersDashboard = document.getElementById('members-dashboard');
  const dailyDataDashboard = document.getElementById('daily-data-dashboard');
  const projectsDashboard = document.getElementById('projects-dashboard');
  
  // 期間選択要素
  const periodSelector = document.getElementById('periodSelector');
  
  // 現在のビュー
  let currentView = 'weekly';
  
  // 現在の期間
  let currentPeriod = periodSelector ? periodSelector.value : '2025年3月第3週';
  
  // イベントリスナー
  if (viewSelector) {
    viewSelector.addEventListener('change', handleViewChange);
  }
  
  // 期間選択のイベントリスナー
  if (periodSelector) {
    periodSelector.addEventListener('change', handlePeriodChange);
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
    try {
      console.log('ビュー変更: ', viewSelector.value);
      const newView = viewSelector.value;
      
      // 現在のビューを非表示
      hideAllDashboards();
      
      // 新しいビューを表示
      showDashboard(newView);
      
      // 現在のビューを更新
      currentView = newView;
      
      // 通知を表示
      if (window.notificationUtils) {
        window.notificationUtils.showInfo(`${getViewName(currentView)}ビューを表示しています`);
      } else {
        console.log(`${getViewName(currentView)}ビューを表示しています`);
      }
    } catch (error) {
      console.error('ビュー変更エラー:', error);
    }
  }
  
  /**
   * すべてのダッシュボードを非表示にする
   */
  function hideAllDashboards() {
    try {
      console.log('すべてのダッシュボードを非表示にします');
      const dashboards = document.querySelectorAll('.tab-container');
      dashboards.forEach(dashboard => {
        dashboard.classList.remove('active');
        dashboard.style.display = 'none';
      });
    } catch (error) {
      console.error('ダッシュボード非表示エラー:', error);
    }
  }
  
  /**
   * 指定したダッシュボードを表示する
   * @param {string} view - 表示するビュー
   */
  function showDashboard(view) {
    try {
      console.log('ダッシュボードを表示します:', view);
      const dashboard = document.getElementById(`${view}-dashboard`);
      if (dashboard) {
        dashboard.classList.add('active');
        dashboard.style.display = 'block';
      } else {
        console.error(`ダッシュボードが見つかりません: ${view}-dashboard`);
      }
    } catch (error) {
      console.error('ダッシュボード表示エラー:', error);
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
  loadData();
  
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
    try {
      console.log('チャート初期化を開始します');
      // Chart.jsの設定
      Chart.defaults.font.family = "'Noto Sans JP', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
      Chart.defaults.font.size = 12;
      Chart.defaults.color = '#333';
      
      // アニメーション設定
      Chart.defaults.animation = {
        duration: 800,
        easing: 'easeOutQuart',
        mode: 'active'
      };
      
      // 週次チャートの初期化
      initializeWeeklyCharts();
      
      // 月次チャートの初期化
      initializeMonthlyCharts();
      
      // 担当者別チャートの初期化
      initializeMemberCharts();
      
      console.log('チャート初期化が完了しました');
    } catch (error) {
      console.error('チャート初期化エラー:', error);
    }
  }
  
  /**
   * 週次チャートを初期化する
   */
  function initializeWeeklyCharts() {
    try {
      // データが読み込まれていない場合は何もしない
      if (!window.weeklyData) {
        console.log('週次データが読み込まれていないため、チャートを初期化できません');
        return;
      }
      
      // 週次データから値を取得
      const weeklyData = window.weeklyData;
      const weeklyGoals = window.weeklyGoals || {
        approach: 160,
        meeting: 120,
        negotiation: 90,
        proposal: 50,
        contract: 20,
        amount: 40000000
      };
      
      // 過去8週間のデータを取得
      fetch('data/weekly-data.json')
        .then(response => response.json())
        .then(data => {
          const weeksData = data.weekly.slice(0, 8);
          
          // 週次推移チャート
          const weeklyTrendCtx = document.getElementById('weeklyTrendChart');
          if (weeklyTrendCtx) {
            const weeklyTrendChart = new Chart(weeklyTrendCtx, {
              type: 'line',
              data: {
                labels: weeksData.map(week => {
                  const [year, month, weekNum] = week.period.split('-');
                  return `${year}年${month}月第${weekNum}週`;
                }).reverse(),
                datasets: [
                  {
                    label: 'アプローチ数',
                    data: weeksData.map(week => week.approach).reverse(),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    fill: true
                  },
                  {
                    label: '面談数',
                    data: weeksData.map(week => week.meeting).reverse(),
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    fill: true
                  },
                  {
                    label: '商談数',
                    data: weeksData.map(week => week.negotiation).reverse(),
                    borderColor: '#f1c40f',
                    backgroundColor: 'rgba(241, 196, 15, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    fill: true
                  },
                  {
                    label: '提案数',
                    data: weeksData.map(week => week.proposal).reverse(),
                    borderColor: '#e67e22',
                    backgroundColor: 'rgba(230, 126, 34, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    fill: true
                  },
                  {
                    label: '契約数',
                    data: weeksData.map(week => week.contract).reverse(),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    fill: true
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                  duration: 1000,
                  easing: 'easeOutQuad'
                },
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: false,
                    text: '週次推移'
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false
                  }
                },
                hover: {
                  mode: 'nearest',
                  intersect: true
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      drawBorder: false
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                }
              }
            });
          }
          
          // 週次活動比率チャート
          const weeklyActivityCtx = document.getElementById('weeklyActivityChart');
          if (weeklyActivityCtx) {
            const weeklyActivityChart = new Chart(weeklyActivityCtx, {
              type: 'doughnut',
              data: {
                labels: ['アプローチ', '面談', '商談', '提案', '契約'],
                datasets: [{
                  data: [
                    weeklyData.approach,
                    weeklyData.meeting,
                    weeklyData.negotiation,
                    weeklyData.proposal,
                    weeklyData.contract
                  ],
                  backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#f1c40f',
                    '#e67e22',
                    '#e74c3c'
                  ],
                  borderWidth: 1
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                  animateRotate: true,
                  animateScale: true,
                  duration: 1000,
                  easing: 'easeOutCubic'
                },
                plugins: {
                  legend: {
                    position: 'right',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${value}件 (${percentage}%)`;
                      }
                    }
                  }
                },
                cutout: '60%'
              }
            });
          }
          
          // KPIカードの更新
          updateKPICards(weeklyData, weeksData[1]);
          
          console.log('週次チャートが初期化されました');
        })
        .catch(error => {
          console.error('週次チャート初期化エラー:', error);
        });
    } catch (error) {
      console.error('週次チャートの初期化中にエラーが発生しました:', error);
    }
  }
  
  /**
   * KPIカードを更新する
   * @param {Object} currentData - 現在の期間のデータ
   * @param {Object} previousData - 前の期間のデータ
   */
  function updateKPICards(currentData, previousData) {
    try {
      if (!currentData || !previousData) return;
      
      // アプローチ数
      updateKPICard('approach', currentData.approach, previousData.approach);
      
      // 面談数
      updateKPICard('meeting', currentData.meeting, previousData.meeting);
      
      // 商談数
      updateKPICard('negotiation', currentData.negotiation, previousData.negotiation);
      
      // 提案数
      updateKPICard('proposal', currentData.proposal, previousData.proposal);
      
      // 契約数
      updateKPICard('contract', currentData.contract, previousData.contract);
      
      // 契約金額
      updateKPICard('amount', formatAmount(currentData.amount), formatAmount(previousData.amount), true);
    } catch (error) {
      console.error('KPIカード更新エラー:', error);
    }
  }
  
  /**
   * 個別のKPIカードを更新する
   * @param {string} type - KPIタイプ
   * @param {number} currentValue - 現在の値
   * @param {number} previousValue - 前の値
   * @param {boolean} isAmount - 金額かどうか
   */
  function updateKPICard(type, currentValue, previousValue, isAmount = false) {
    const card = document.querySelector(`.kpi-card[data-type="${type}"]`);
    if (!card) return;
    
    const valueElement = card.querySelector('.kpi-value');
    const changeElement = card.querySelector('.kpi-change');
    
    if (valueElement) {
      valueElement.textContent = currentValue;
    }
    
    if (changeElement) {
      const diff = isAmount 
        ? (parseInt(currentValue.replace(/,/g, '')) - parseInt(previousValue.replace(/,/g, ''))) / parseInt(previousValue.replace(/,/g, '')) * 100
        : (currentValue - previousValue) / previousValue * 100;
      
      const isPositive = diff >= 0;
      const diffText = Math.abs(diff).toFixed(1);
      
      changeElement.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="${isPositive ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"></polyline>
        </svg>
        <span>${isPositive ? '+' : '-'}${diffText}% vs 先週</span>
      `;
      
      changeElement.className = `kpi-change ${isPositive ? 'positive' : 'negative'}`;
    }
  }
  
  /**
   * 金額をフォーマットする
   * @param {number} amount - 金額
   * @returns {string} フォーマットされた金額
   */
  function formatAmount(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  
  /**
   * 月次チャートを初期化する
   */
  function initializeMonthlyCharts() {
    try {
      // 月次推移チャート
      const monthlyTrendCtx = document.getElementById('monthlyTrendChart');
      if (monthlyTrendCtx) {
        const monthlyTrendChart = new Chart(monthlyTrendCtx, {
        type: 'line',
          data: {
            labels: ['4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月'],
            datasets: [
              {
                label: 'アプローチ数',
                data: [420, 435, 450, 460, 470, 480, 485, 490, 485, 480, 490, 496],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                borderWidth: 2,
                fill: true
              },
              {
                label: '面談数',
                data: [350, 360, 365, 370, 380, 385, 390, 395, 400, 395, 400, 408],
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                tension: 0.4,
                borderWidth: 2,
                fill: true
              },
              {
                label: '商談数',
                data: [220, 225, 230, 235, 240, 242, 245, 248, 250, 248, 252, 254],
                borderColor: '#f1c40f',
                backgroundColor: 'rgba(241, 196, 15, 0.1)',
                tension: 0.4,
                borderWidth: 2,
                fill: true
              },
              {
                label: '提案数',
                data: [110, 112, 115, 118, 120, 122, 124, 125, 126, 125, 127, 128],
                borderColor: '#e67e22',
                backgroundColor: 'rgba(230, 126, 34, 0.1)',
                tension: 0.4,
                borderWidth: 2,
                fill: true
              },
              {
                label: '契約数',
                data: [30, 32, 33, 34, 35, 36, 37, 38, 39, 38, 38, 37],
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                tension: 0.4,
                borderWidth: 2,
                fill: true
              }
            ]
          },
        options: {
          responsive: true,
            maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
              title: {
                display: false,
                text: '月次推移'
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      }
      
      // コンバージョン率チャート
      const conversionRateCtx = document.getElementById('conversionRateChart');
      if (conversionRateCtx) {
        const conversionRateChart = new Chart(conversionRateCtx, {
        type: 'bar',
          data: {
            labels: ['アプローチ→面談', '面談→商談', '商談→提案', '提案→契約', '全体成約率'],
            datasets: [{
              label: '現在の転換率',
              data: [82.3, 62.3, 50.4, 28.9, 7.5],
              backgroundColor: '#3498db',
              borderWidth: 0
            },
            {
              label: '前月比',
              data: [80.5, 60.8, 49.2, 30.1, 7.2],
              backgroundColor: '#95a5a6',
              borderWidth: 0
            }]
          },
        options: {
          responsive: true,
            maintainAspectRatio: false,
          plugins: {
            legend: {
                position: 'top',
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return value + '%';
                }
              }
            }
          }
        });
      }
      
      // 契約金額分布チャート
      const contractAmountCtx = document.getElementById('contractAmountChart');
      if (contractAmountCtx) {
        const contractAmountChart = new Chart(contractAmountCtx, {
          type: 'pie',
          data: {
            labels: ['100万円未満', '100-300万円', '300-500万円', '500-1000万円', '1000万円以上'],
            datasets: [{
              data: [15, 25, 30, 20, 10],
              backgroundColor: [
                '#3498db',
                '#2ecc71',
                '#f1c40f',
                '#e67e22',
                '#e74c3c'
              ],
              borderWidth: 1
            }]
          },
        options: {
          responsive: true,
            maintainAspectRatio: false,
          plugins: {
            legend: {
                position: 'right',
              }
          }
        }
      });
      }
      
      console.log('月次チャートが初期化されました');
    } catch (error) {
      console.error('月次チャートの初期化中にエラーが発生しました:', error);
    }
  }
  
  /**
   * 担当者別チャートを初期化する
   */
  function initializeMemberCharts() {
    try {
      // 担当者別契約実績チャート
      const memberPerformanceCtx = document.getElementById('memberPerformanceChart');
      if (memberPerformanceCtx) {
        const memberPerformanceChart = new Chart(memberPerformanceCtx, {
        type: 'bar',
          data: {
            labels: ['山内', '内村', '谷川', '出口'],
            datasets: [
              {
                label: '契約金額（百万円）',
                data: [32.5, 25.8, 19.7, 18.0],
                backgroundColor: '#3498db',
                borderWidth: 0
              },
              {
                label: '目標金額（百万円）',
                data: [30.0, 26.8, 21.2, 20.0],
                backgroundColor: '#95a5a6',
                borderWidth: 0,
                type: 'line',
                fill: false,
                tension: 0
              }
            ]
          },
        options: {
          responsive: true,
            maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              },
              title: {
                display: false,
                text: '担当者別契約実績'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
                title: {
                  display: true,
                  text: '金額（百万円）'
                }
            }
          }
        }
      });
      }
      
      // 効率性指標チャート
      const efficiencyCtx = document.getElementById('efficiencyChart');
      if (efficiencyCtx) {
        const efficiencyChart = new Chart(efficiencyCtx, {
          type: 'radar',
          data: {
            labels: ['アプローチ効率', '面談効率', '商談効率', '提案効率', '契約効率'],
            datasets: [
              {
                label: '山内',
                data: [85, 90, 75, 80, 95],
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: '#3498db',
                borderWidth: 2,
                pointBackgroundColor: '#3498db'
              },
              {
                label: '内村',
                data: [90, 85, 80, 70, 75],
                backgroundColor: 'rgba(46, 204, 113, 0.2)',
                borderColor: '#2ecc71',
                borderWidth: 2,
                pointBackgroundColor: '#2ecc71'
              },
              {
                label: '谷川',
                data: [70, 75, 85, 90, 65],
                backgroundColor: 'rgba(241, 196, 15, 0.2)',
                borderColor: '#f1c40f',
                borderWidth: 2,
                pointBackgroundColor: '#f1c40f'
              },
              {
                label: '出口',
                data: [75, 80, 70, 75, 85],
                backgroundColor: 'rgba(230, 126, 34, 0.2)',
                borderColor: '#e67e22',
                borderWidth: 2,
                pointBackgroundColor: '#e67e22'
              }
            ]
          },
        options: {
          responsive: true,
            maintainAspectRatio: false,
            scales: {
              r: {
                angleLines: {
                  display: true
                },
                suggestedMin: 0,
                suggestedMax: 100
              }
            }
          }
        });
      }
      
      console.log('担当者別チャートが初期化されました');
    } catch (error) {
      console.error('担当者別チャートの初期化中にエラーが発生しました:', error);
    }
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
  
  /**
   * 期間変更ハンドラー
   */
  function handlePeriodChange() {
    try {
      console.log('期間変更: ', periodSelector.value);
      const newPeriod = periodSelector.value;
      
      // 現在の期間を更新
      currentPeriod = newPeriod;
      
      // データを更新
      loadDataForPeriod(currentPeriod);
      
      // 通知を表示
      if (window.notificationUtils) {
        window.notificationUtils.showInfo(`期間を${currentPeriod}に変更しました`);
      } else {
        console.log(`期間を${currentPeriod}に変更しました`);
      }
    } catch (error) {
      console.error('期間変更エラー:', error);
    }
  }
  
  /**
   * 指定された期間のデータを読み込む
   * @param {string} period - 期間
   */
  function loadDataForPeriod(period) {
    try {
      console.log(`${period}のデータを読み込みます`);
      
      // 現在のビューに応じたデータ読み込み
      switch (currentView) {
        case 'weekly':
          loadWeeklyData(period);
          break;
        case 'monthly':
          loadMonthlyData(period);
          break;
        case 'members':
          loadMembersData(period);
          break;
        case 'daily':
          loadDailyData(period);
          break;
        case 'projects':
          loadProjectsData(period);
          break;
        default:
          console.error('不明なビュータイプ:', currentView);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
  }
  
  /**
   * 週次データを読み込む
   * @param {string} period - 期間
   */
  function loadWeeklyData(period) {
    try {
      // 週次データの読み込み処理
      console.log(`週次データを読み込み中: ${period}`);
      
      // データ取得
      fetch('data/weekly-data.json')
        .then(response => response.json())
        .then(data => {
          // 期間に合わせたデータをフィルタリング
          const weeklyData = data.weekly.find(w => w.period === convertPeriodToDataFormat(period)) || data.weekly[0];
          
          // グローバル変数に保存
          window.weeklyData = weeklyData;
          window.weeklyGoals = data.goals;
          
          // チャートを更新
          updateWeeklyCharts();
          
          console.log('週次データの読み込みが完了しました', weeklyData);
        })
        .catch(error => {
          console.error('週次データの読み込みに失敗しました:', error);
        });
    } catch (error) {
      console.error('週次データ読み込みエラー:', error);
    }
  }
  
  /**
   * 月次データを読み込む
   * @param {string} period - 期間
   */
  function loadMonthlyData(period) {
    try {
      // 月次データの読み込み処理
      console.log(`月次データを読み込み中: ${period}`);
      
      // データ取得
      fetch('data/monthly-data.json')
        .then(response => response.json())
        .then(data => {
          // 期間から月を抽出
          const month = extractMonthFromPeriod(period);
          
          // 月に合わせたデータをフィルタリング
          const monthlyData = data.monthly.find(m => m.period.includes(month)) || data.monthly[0];
          
          // グローバル変数に保存
          window.monthlyData = monthlyData;
          window.monthlyGoals = data.goals;
          window.conversionRates = data.conversion;
          window.contractDistribution = data.contract_distribution;
          
          // チャートを更新
          updateMonthlyCharts();
          
          console.log('月次データの読み込みが完了しました', monthlyData);
        })
        .catch(error => {
          console.error('月次データの読み込みに失敗しました:', error);
        });
    } catch (error) {
      console.error('月次データ読み込みエラー:', error);
    }
  }
  
  /**
   * 担当者別データを読み込む
   * @param {string} period - 期間
   */
  function loadMembersData(period) {
    try {
      // 担当者別データの読み込み処理
      console.log(`担当者別データを読み込み中: ${period}`);
      
      // データ取得
      fetch('data/members-data.json')
        .then(response => response.json())
        .then(data => {
          // グローバル変数に保存
          window.membersData = data.members;
          window.membersGoals = data.goals;
          window.efficiencyData = data.efficiency;
          
          // チャートを更新
          updateMemberCharts();
          
          console.log('担当者別データの読み込みが完了しました', data.members);
        })
        .catch(error => {
          console.error('担当者別データの読み込みに失敗しました:', error);
        });
    } catch (error) {
      console.error('担当者別データ読み込みエラー:', error);
    }
  }
  
  /**
   * 日次データを読み込む
   * @param {string} period - 期間
   */
  function loadDailyData(period) {
    try {
      // 日次データの読み込み処理
      console.log(`日次データを読み込み中: ${period}`);
      
      // データ取得
      fetch('data/daily-data.json')
        .then(response => response.json())
        .then(data => {
          // 期間に合わせた日付範囲を取得
          const dateRange = getDateRangeFromPeriod(period);
          
          // 日付範囲でフィルタリング
          const filteredData = data.daily_records.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= dateRange.start && recordDate <= dateRange.end;
          });
          
          // グローバル変数に保存
          window.dailyData = filteredData;
          window.dailyGoals = data.goals.daily;
          
          // 日次データビューを更新
          updateDailyDataView();
          
          console.log('日次データの読み込みが完了しました', filteredData);
        })
        .catch(error => {
          console.error('日次データの読み込みに失敗しました:', error);
        });
    } catch (error) {
      console.error('日次データ読み込みエラー:', error);
    }
  }
  
  /**
   * 案件データを読み込む
   * @param {string} period - 期間
   */
  function loadProjectsData(period) {
    try {
      // 案件データの読み込み処理
      console.log(`案件データを読み込み中: ${period}`);
      
      // データ取得
      fetch('data/projects-data.json')
        .then(response => response.json())
        .then(data => {
          // グローバル変数に保存
          window.projectsData = data.projects;
          
          // 案件ビューを更新
          updateProjectsView();
          
          console.log('案件データの読み込みが完了しました', data.projects);
        })
        .catch(error => {
          console.error('案件データの読み込みに失敗しました:', error);
        });
    } catch (error) {
      console.error('案件データ読み込みエラー:', error);
    }
  }
  
  /**
   * 期間文字列をデータ形式に変換
   * @param {string} period - 期間文字列（例: "2025年3月第3週"）
   * @returns {string} データ形式の期間（例: "2025-03-3"）
   */
  function convertPeriodToDataFormat(period) {
    try {
      // 例: "2025年3月第3週" -> "2025-03-3"
      const match = period.match(/(\d{4})年(\d{1,2})月第(\d)週/);
      if (match) {
        const year = match[1];
        const month = match[2].padStart(2, '0');
        const week = match[3];
        return `${year}-${month}-${week}`;
      }
      return '';
    } catch (error) {
      console.error('期間変換エラー:', error);
      return '';
    }
  }
  
  /**
   * 期間から月を抽出
   * @param {string} period - 期間文字列（例: "2025年3月第3週"）
   * @returns {string} 月（例: "2025-03"）
   */
  function extractMonthFromPeriod(period) {
    try {
      // 例: "2025年3月第3週" -> "2025-03"
      const match = period.match(/(\d{4})年(\d{1,2})月/);
      if (match) {
        const year = match[1];
        const month = match[2].padStart(2, '0');
        return `${year}-${month}`;
      }
      return '';
    } catch (error) {
      console.error('月抽出エラー:', error);
      return '';
    }
  }
  
  /**
   * 期間から日付範囲を取得
   * @param {string} period - 期間文字列（例: "2025年3月第3週"）
   * @returns {Object} 開始日と終了日
   */
  function getDateRangeFromPeriod(period) {
    try {
      // 例: "2025年3月第3週"
      const match = period.match(/(\d{4})年(\d{1,2})月第(\d)週/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // JavaScriptの月は0始まり
        const week = parseInt(match[3]);
        
        // 月の最初の日
        const firstDayOfMonth = new Date(year, month, 1);
        
        // 月の最初の週の日曜日を見つける
        let firstSunday = new Date(firstDayOfMonth);
        while (firstSunday.getDay() !== 0) {
          firstSunday.setDate(firstSunday.getDate() - 1);
        }
        
        // 指定された週の開始日（日曜日）
        const startDate = new Date(firstSunday);
        startDate.setDate(firstSunday.getDate() + (week - 1) * 7);
        
        // 週の終了日（土曜日）
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        return {
          start: startDate,
          end: endDate
        };
      }
      
      // デフォルトは現在の週
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return {
        start: startOfWeek,
        end: endOfWeek
      };
    } catch (error) {
      console.error('日付範囲取得エラー:', error);
      
      // エラー時はデフォルト値を返す
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      };
    }
  }
  
  /**
   * 週次チャートを更新する
   */
  function updateWeeklyCharts() {
    try {
      // 週次チャートの更新処理
      console.log('週次チャートを更新します');
      
      // 既存のチャートを破棄して再作成
      const weeklyTrendChart = Chart.getChart('weeklyTrendChart');
      if (weeklyTrendChart) {
        weeklyTrendChart.destroy();
      }
      
      const weeklyActivityChart = Chart.getChart('weeklyActivityChart');
      if (weeklyActivityChart) {
        weeklyActivityChart.destroy();
      }
      
      // チャートを再初期化
      initializeWeeklyCharts();
    } catch (error) {
      console.error('週次チャート更新エラー:', error);
    }
  }
  
  /**
   * 月次チャートを更新する
   */
  function updateMonthlyCharts() {
    try {
      // 月次チャートの更新処理
      console.log('月次チャートを更新します');
      
      // 既存のチャートを破棄して再作成
      const monthlyTrendChart = Chart.getChart('monthlyTrendChart');
      if (monthlyTrendChart) {
        monthlyTrendChart.destroy();
      }
      
      const conversionRateChart = Chart.getChart('conversionRateChart');
      if (conversionRateChart) {
        conversionRateChart.destroy();
      }
      
      const contractAmountChart = Chart.getChart('contractAmountChart');
      if (contractAmountChart) {
        contractAmountChart.destroy();
      }
      
      // チャートを再初期化
      initializeMonthlyCharts();
    } catch (error) {
      console.error('月次チャート更新エラー:', error);
    }
  }
  
  /**
   * 担当者別チャートを更新する
   */
  function updateMemberCharts() {
    try {
      // 担当者別チャートの更新処理
      console.log('担当者別チャートを更新します');
      
      // 既存のチャートを破棄して再作成
      const memberPerformanceChart = Chart.getChart('memberPerformanceChart');
      if (memberPerformanceChart) {
        memberPerformanceChart.destroy();
      }
      
      const efficiencyChart = Chart.getChart('efficiencyChart');
      if (efficiencyChart) {
        efficiencyChart.destroy();
      }
      
      // チャートを再初期化
      initializeMemberCharts();
    } catch (error) {
      console.error('担当者別チャート更新エラー:', error);
    }
  }
  
  /**
   * 日次データビューを更新する
   */
  function updateDailyDataView() {
    try {
      // 日次データの表示を更新
      console.log('日次データビューを更新します');
      
      // 日次データテーブルを更新
      const dailyDataTable = document.getElementById('daily-data-table');
      if (dailyDataTable) {
        // テーブルデータを更新する処理
        // 実際のデータ取得処理はAPIサービスやDBサービスを使用
      }
    } catch (error) {
      console.error('日次データビュー更新エラー:', error);
    }
  }
  
  /**
   * 案件ビューを更新する
   */
  function updateProjectsView() {
    try {
      // 案件データの表示を更新
      console.log('案件ビューを更新します');
      
      // 案件リストを更新
      const projectsList = document.getElementById('projects-list');
      if (projectsList) {
        // 案件リストを更新する処理
        // 実際のデータ取得処理はAPIサービスやDBサービスを使用
      }
    } catch (error) {
      console.error('案件ビュー更新エラー:', error);
    }
  }
  
  /**
   * データを読み込む
   */
  function loadData() {
    try {
      console.log('データを読み込みます');
      
      // 現在のビューに応じたデータを読み込む
      loadDataForPeriod(currentPeriod);
      
      // 日次データを読み込む
      loadDailyData(currentPeriod);
      
      // 週次データを読み込む
      loadWeeklyData(currentPeriod);
      
      // 月次データを読み込む
      loadMonthlyData(currentPeriod);
      
      // 担当者データを読み込む
      loadMembersData(currentPeriod);
      
      // 案件データを読み込む
      loadProjectsData(currentPeriod);
      
      console.log('データの読み込みが完了しました');
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    }
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