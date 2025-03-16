/**
 * 営業チームKPIダッシュボード メインスクリプト
 */

document.addEventListener('DOMContentLoaded', function() {
  // 通知ユーティリティのインスタンスを作成
  const notificationUtils = new NotificationUtils();
  
  // 設定の読み込み
  loadSettings();
  
  // APIサービスのインスタンスを作成
  const apiService = new ApiService(API_CONFIG);
  
  // エクスポートユーティリティのインスタンスを作成
  const exportUtils = new ExportUtils();
  
  // DOM要素
  const viewSelector = document.getElementById('viewSelector');
  const periodSelector = document.getElementById('periodSelector');
  const weeklyDashboard = document.getElementById('weekly-dashboard');
  const monthlyDashboard = document.getElementById('monthly-dashboard');
  const membersDashboard = document.getElementById('members-dashboard');
  const exportButtons = document.querySelectorAll('.export-btn');
  
  // チャートインスタンス
  let weeklyTrendChart = null;
  let weeklyActivityChart = null;
  let monthlyTrendChart = null;
  let conversionRateChart = null;
  let contractAmountChart = null;
  let memberPerformanceChart = null;
  let efficiencyChart = null;
  
  // 現在のビュー
  let currentView = 'weekly';
  let dashboardData = null;
  
  // サンプルデータ
  const sampleData = {
    weekly: {
      trends: {
        labels: ['第4週', '第3週', '第2週', '第1週', '今週'],
        datasets: [
          {
            label: 'アプローチ数',
            data: [120, 132, 125, 140, 148],
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.4
          },
          {
            label: '面談数',
            data: [95, 105, 98, 110, 114],
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            tension: 0.4
          },
          {
            label: '商談数',
            data: [65, 72, 68, 74, 76],
            borderColor: '#f39c12',
            backgroundColor: 'rgba(243, 156, 18, 0.1)',
            tension: 0.4
          },
          {
            label: '契約数',
            data: [12, 14, 13, 15, 14],
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            tension: 0.4
          }
        ]
      },
      activities: {
        labels: ['アプローチ', '面談', '商談', '提案', '契約'],
        datasets: [{
          data: [148, 114, 76, 37, 14],
          backgroundColor: [
            '#3498db',
            '#2ecc71',
            '#f39c12',
            '#9b59b6',
            '#e74c3c'
          ]
        }]
      },
      goals: [
        { title: 'アプローチ数', current: 148, target: 160, percentage: 92.5 },
        { title: '面談数', current: 114, target: 120, percentage: 95.0 },
        { title: '商談数', current: 76, target: 90, percentage: 84.4 },
        { title: '提案数', current: 37, target: 50, percentage: 74.0 },
        { title: '契約数', current: 14, target: 20, percentage: 70.0 },
        { title: '契約金額', current: 37.8, target: 40.0, percentage: 94.5, format: 'currency' }
      ]
    },
    monthly: {
      trends: {
        labels: ['10月', '11月', '12月', '1月', '2月', '3月'],
        datasets: [
          {
            label: 'アプローチ数',
            data: [450, 470, 460, 480, 490, 496],
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.4
          },
          {
            label: '面談数',
            data: [380, 390, 385, 395, 400, 408],
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            tension: 0.4
          },
          {
            label: '商談数',
            data: [240, 245, 242, 248, 250, 254],
            borderColor: '#f39c12',
            backgroundColor: 'rgba(243, 156, 18, 0.1)',
            tension: 0.4
          },
          {
            label: '契約数',
            data: [35, 38, 36, 39, 38, 37],
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            tension: 0.4
          }
        ]
      },
      conversion: {
        labels: ['アプローチ→面談', '面談→商談', '商談→提案', '提案→契約'],
        datasets: [{
          label: '転換率',
          data: [82.3, 62.3, 50.4, 28.9],
          backgroundColor: [
            '#3498db',
            '#2ecc71',
            '#f39c12',
            '#e74c3c'
          ]
        }]
      },
      contractAmounts: {
        labels: ['100万円未満', '100-300万円', '300-500万円', '500-1000万円', '1000万円以上'],
        datasets: [{
          label: '契約数',
          data: [8, 12, 9, 5, 3],
          backgroundColor: '#3498db'
        }]
      },
      funnel: [
        { title: 'アプローチ→面談 転換率', current: 408, total: 496, percentage: 82.3 },
        { title: '面談→商談 転換率', current: 254, total: 408, percentage: 62.3 },
        { title: '商談→提案 転換率', current: 128, total: 254, percentage: 50.4 },
        { title: '提案→契約 転換率', current: 37, total: 128, percentage: 28.9 },
        { title: '全体成約率（アプローチ→契約）', current: 37, total: 496, percentage: 7.5 }
      ]
    },
    members: {
      performance: {
        labels: ['山内', '内村', '谷川', '出口'],
        datasets: [
          {
            label: '契約金額',
            data: [32.5, 25.8, 19.7, 18.0],
            backgroundColor: '#3498db'
          },
          {
            label: '目標金額',
            data: [30.0, 26.8, 21.2, 20.0],
            backgroundColor: '#e74c3c'
          }
        ]
      },
      efficiency: {
        labels: ['山内', '内村', '谷川', '出口'],
        datasets: [
          {
            label: 'アプローチ→契約率',
            data: [9.2, 7.8, 6.5, 6.1],
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.4
          },
          {
            label: '平均契約金額',
            data: [3.6, 3.2, 2.8, 2.6],
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      data: [
        { name: '山内', amount: 32.5, target: 30.0, percentage: 108.3 },
        { name: '内村', amount: 25.8, target: 26.8, percentage: 96.3 },
        { name: '谷川', amount: 19.7, target: 21.2, percentage: 92.9 },
        { name: '出口', amount: 18.0, target: 20.0, percentage: 90.0 }
      ],
      goals: [
        { title: '山内', current: 32.5, target: 30.0, percentage: 108.3, format: 'currency' },
        { title: '内村', current: 25.8, target: 26.8, percentage: 96.3, format: 'currency' },
        { title: '谷川', current: 19.7, target: 21.2, percentage: 92.9, format: 'currency' },
        { title: '出口', current: 18.0, target: 20.0, percentage: 90.0, format: 'currency' }
      ]
    }
  };
  
  // データの読み込み
  loadData();
  
  // 自動更新の設定
  setupAutoRefresh();
  
  // イベントリスナー
  viewSelector.addEventListener('change', handleViewChange);
  periodSelector.addEventListener('change', handlePeriodChange);
  
  // メンバータブのイベントリスナー
  const memberTabs = document.querySelectorAll('.member-tab');
  memberTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      memberTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      updateMemberData(this.textContent);
    });
  });
  
  // エクスポートボタンのイベントリスナー
  exportButtons.forEach(button => {
    button.addEventListener('click', function() {
      const format = this.getAttribute('data-format');
      exportCurrentView(format);
    });
  });
  
  // ウィンドウのリサイズイベントリスナーを追加
  window.addEventListener('resize', function() {
    // チャートを再描画
    if (currentView === 'weekly') {
      updateWeeklyCharts();
    } else if (currentView === 'monthly') {
      updateMonthlyCharts();
    } else if (currentView === 'members') {
      updateMemberCharts();
    }
  });
  
  /**
   * 設定を読み込む
   */
  function loadSettings() {
    try {
      const savedSettings = localStorage.getItem('kpiDashboardSettings');
      
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // API設定を更新
        if (window.API_CONFIG) {
          // スプレッドシート設定
          API_CONFIG.spreadsheet = settings.spreadsheet;
          
          // データ更新間隔
          API_CONFIG.refreshInterval = settings.refreshInterval || 300000;
          
          // キャッシュ設定
          API_CONFIG.cache = settings.cache || { enabled: true, expiry: 600000 };
        }
        
        // 通知設定を更新
        if (window.NOTIFICATION_CONFIG) {
          NOTIFICATION_CONFIG.goalAlert = settings.notification?.goalAlert || 
            { enabled: true, threshold: 90 };
          NOTIFICATION_CONFIG.warningAlert = settings.notification?.warningAlert || 
            { enabled: true, threshold: 60 };
        }
      }
    } catch (error) {
      console.error('設定の読み込み中にエラーが発生しました:', error);
    }
  }
  
  /**
   * データを読み込む
   */
  async function loadData() {
    try {
      // APIからデータを取得
      // 本来はAPIから取得するが、サンプルデータを使用
      dashboardData = sampleData;
      
      // ダッシュボードを更新
      updateDashboard();
      
      // 目標達成状況をチェック
      notificationUtils.checkGoalAchievement(dashboardData);
      
      // すべてのチャートを初期化（非表示のタブも含む）
      initializeAllCharts();
      
    } catch (error) {
      console.error('データの読み込み中にエラーが発生しました:', error);
      notificationUtils.showError('データの読み込みに失敗しました');
    }
  }
  
  /**
   * 自動更新を設定
   */
  function setupAutoRefresh() {
    if (API_CONFIG.refreshInterval > 0) {
      setInterval(async () => {
        try {
          // データを再取得
          // 本来はAPIから取得するが、サンプルデータを使用
          dashboardData = sampleData;
          
          // ダッシュボードを更新
          updateDashboard();
          
          // 目標達成状況をチェック
          notificationUtils.checkGoalAchievement(dashboardData);
          
          notificationUtils.showSuccess('データを更新しました');
        } catch (error) {
          console.error('データの自動更新中にエラーが発生しました:', error);
          notificationUtils.showError('データの自動更新に失敗しました');
        }
      }, API_CONFIG.refreshInterval);
    }
  }
  
  /**
   * ビュー変更ハンドラー
   */
  function handleViewChange() {
    const newView = viewSelector.value;
    
    // 現在のビューを非表示
    document.getElementById(`${currentView}-dashboard`).classList.remove('active');
    
    // 新しいビューを表示
    document.getElementById(`${newView}-dashboard`).classList.add('active');
    
    // 現在のビューを更新
    currentView = newView;
    
    // ダッシュボードを更新
    updateDashboard();
    
    // 通知を表示
    notificationUtils.showInfo(`${getViewName(currentView)}ビューを表示しています`);
  }
  
  /**
   * 期間変更ハンドラー
   */
  function handlePeriodChange() {
    const selectedPeriod = periodSelector.value;
    
    // 選択された期間に基づいてデータを取得
    loadPeriodData(selectedPeriod);
    
    // 通知を表示
    notificationUtils.showInfo(`期間を${selectedPeriod}に変更しました`);
  }
  
  /**
   * 期間データを読み込む
   * @param {string} period - 選択された期間
   */
  async function loadPeriodData(period) {
    try {
      // 期間に基づいてエンドポイントを決定
      let endpoint;
      if (currentView === 'weekly') {
        endpoint = 'weekly';
      } else if (currentView === 'monthly') {
        endpoint = 'monthly';
      } else {
        endpoint = 'members';
      }
      
      // APIからデータを取得
      // 本来はAPIから取得するが、サンプルデータを使用
      dashboardData = sampleData;
      
      // ダッシュボードを更新
      updateDashboard();
      
      // すべてのチャートを更新
      initializeAllCharts();
      
    } catch (error) {
      console.error('期間データの読み込み中にエラーが発生しました:', error);
      notificationUtils.showError('期間データの読み込みに失敗しました');
    }
  }
  
  /**
   * ダッシュボードを更新
   */
  function updateDashboard() {
    if (!dashboardData) return;
    
    try {
      if (currentView === 'weekly') {
        updateWeeklyDashboard();
      } else if (currentView === 'monthly') {
        updateMonthlyDashboard();
      } else if (currentView === 'members') {
        updateMembersDashboard();
      }
    } catch (error) {
      console.error('ダッシュボードの更新中にエラーが発生しました:', error);
      notificationUtils.showError('ダッシュボードの更新に失敗しました');
    }
  }
  
  /**
   * 週次ダッシュボードを更新
   */
  function updateWeeklyDashboard() {
    // KPIカードの更新
    updateKPICards(weeklyDashboard, dashboardData.weekly);
    
    // チャートの更新
    updateWeeklyCharts();
    
    // 目標達成状況の更新
    updateGoals('weeklyGoals', dashboardData.weekly.goals);
  }
  
  /**
   * 月次ダッシュボードを更新
   */
  function updateMonthlyDashboard() {
    // KPIカードの更新
    updateKPICards(monthlyDashboard, dashboardData.monthly);
    
    // チャートの更新
    updateMonthlyCharts();
    
    // 営業フェーズ効率分析の更新
    updateSalesFunnel(dashboardData.monthly.funnel);
  }
  
  /**
   * 担当者別ダッシュボードを更新
   */
  function updateMembersDashboard() {
    // KPIカードの更新
    updateMemberKPICards(dashboardData.members);
    
    // チャートの更新
    updateMemberCharts();
    
    // 担当者別目標達成状況の更新
    updateMemberGoals(dashboardData.members.goals);
  }
  
  /**
   * KPIカードを更新
   * @param {HTMLElement} container - カードを含むコンテナ
   * @param {Object} data - 表示するデータ
   */
  function updateKPICards(container, data) {
    // KPIカードの更新処理
    // 実際のアプリケーションでは、ここでKPIカードの値を更新
  }
  
  /**
   * すべてのチャートを初期化
   */
  function initializeAllCharts() {
    try {
      // 週次チャートの初期化
      updateWeeklyCharts();
      
      // 月次チャートの初期化
      updateMonthlyCharts();
      
      // 担当者別チャートの初期化
      updateMemberCharts();
    } catch (error) {
      console.error('チャートの初期化中にエラーが発生しました:', error);
      notificationUtils.showError('チャートの初期化に失敗しました');
    }
  }
  
  /**
   * 週次チャートを更新
   */
  function updateWeeklyCharts() {
    try {
      // 週次トレンドチャート
      const weeklyTrendCtx = document.getElementById('weeklyTrendChart');
      if (!weeklyTrendCtx) return;
      
      const ctx = weeklyTrendCtx.getContext('2d');
      
      // 既存のチャートを破棄
      if (weeklyTrendChart) {
        weeklyTrendChart.destroy();
      }
      
      // 新しいチャートを作成
      weeklyTrendChart = new Chart(ctx, {
        type: 'line',
        data: dashboardData.weekly.trends,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          },
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10
            }
          }
        }
      });
      
      // 週次活動比率チャート
      const weeklyActivityCtx = document.getElementById('weeklyActivityChart');
      if (!weeklyActivityCtx) return;
      
      const activityCtx = weeklyActivityCtx.getContext('2d');
      
      // 既存のチャートを破棄
      if (weeklyActivityChart) {
        weeklyActivityChart.destroy();
      }
      
      // 新しいチャートを作成
      weeklyActivityChart = new Chart(activityCtx, {
        type: 'doughnut',
        data: dashboardData.weekly.activities,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'right',
            }
          },
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10
            }
          }
        }
      });
    } catch (error) {
      console.error('週次チャートの更新中にエラーが発生しました:', error);
    }
  }
  
  /**
   * 月次チャートを更新
   */
  function updateMonthlyCharts() {
    try {
      // 月次トレンドチャート
      const monthlyTrendCtx = document.getElementById('monthlyTrendChart');
      if (!monthlyTrendCtx) return;
      
      const ctx = monthlyTrendCtx.getContext('2d');
      
      // 既存のチャートを破棄
      if (monthlyTrendChart) {
        monthlyTrendChart.destroy();
      }
      
      // 新しいチャートを作成
      monthlyTrendChart = new Chart(ctx, {
        type: 'line',
        data: dashboardData.monthly.trends,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          },
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10
            }
          }
        }
      });
      
      // コンバージョン率チャート
      const conversionRateCtx = document.getElementById('conversionRateChart');
      if (!conversionRateCtx) return;
      
      const convCtx = conversionRateCtx.getContext('2d');
      
      // 既存のチャートを破棄
      if (conversionRateChart) {
        conversionRateChart.destroy();
      }
      
      // 新しいチャートを作成
      conversionRateChart = new Chart(convCtx, {
        type: 'bar',
        data: dashboardData.monthly.conversion,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
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
          },
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10
            }
          }
        }
      });
      
      // 契約金額分布チャート
      const contractAmountCtx = document.getElementById('contractAmountChart');
      if (!contractAmountCtx) return;
      
      const contractCtx = contractAmountCtx.getContext('2d');
      
      // 既存のチャートを破棄
      if (contractAmountChart) {
        contractAmountChart.destroy();
      }
      
      // 新しいチャートを作成
      contractAmountChart = new Chart(contractCtx, {
        type: 'bar',
        data: dashboardData.monthly.contractAmounts,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          },
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10
            }
          }
        }
      });
    } catch (error) {
      console.error('月次チャートの更新中にエラーが発生しました:', error);
    }
  }
  
  /**
   * 担当者別チャートを更新
   */
  function updateMemberCharts() {
    try {
      // 担当者別パフォーマンスチャート
      const memberPerformanceCtx = document.getElementById('memberPerformanceChart');
      if (!memberPerformanceCtx) return;
      
      const ctx = memberPerformanceCtx.getContext('2d');
      
      // 既存のチャートを破棄
      if (memberPerformanceChart) {
        memberPerformanceChart.destroy();
      }
      
      // 新しいチャートを作成
      memberPerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: dashboardData.members.performance,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'top',
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '¥' + value + 'M';
                }
              }
            }
          },
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10
            }
          }
        }
      });
      
      // 効率性チャート
      const efficiencyCtx = document.getElementById('efficiencyChart');
      if (!efficiencyCtx) return;
      
      const effCtx = efficiencyCtx.getContext('2d');
      
      // 既存のチャートを破棄
      if (efficiencyChart) {
        efficiencyChart.destroy();
      }
      
      // 新しいチャートを作成
      efficiencyChart = new Chart(effCtx, {
        type: 'line',
        data: dashboardData.members.efficiency,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              position: 'left',
              ticks: {
                callback: function(value) {
                  return value + '%';
                }
              }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              grid: {
                drawOnChartArea: false
              },
              ticks: {
                callback: function(value) {
                  return '¥' + value + 'M';
                }
              }
            }
          },
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10
            }
          }
        }
      });
    } catch (error) {
      console.error('担当者別チャートの更新中にエラーが発生しました:', error);
    }
  }
  
  /**
   * 目標達成状況を更新
   * @param {string} containerId - 目標コンテナのID
   * @param {Array} goals - 目標データ
   */
  function updateGoals(containerId, goals) {
    // 目標達成状況の更新処理
    // 実際のアプリケーションでは、ここで目標達成状況を更新
  }
  
  /**
   * 営業フェーズ効率分析を更新
   * @param {Object} funnel - ファネルデータ
   */
  function updateSalesFunnel(funnel) {
    // 営業フェーズ効率分析の更新処理
    // 実際のアプリケーションでは、ここで営業フェーズ効率分析を更新
  }
  
  /**
   * 担当者別KPIカードを更新
   * @param {Object} membersData - 担当者データ
   */
  function updateMemberKPICards(membersData) {
    // 担当者別KPIカードの更新処理
    // 実際のアプリケーションでは、ここで担当者別KPIカードを更新
  }
  
  /**
   * 担当者別目標達成状況を更新
   * @param {Array} goals - 目標データ
   */
  function updateMemberGoals(goals) {
    // 担当者別目標達成状況の更新処理
    // 実際のアプリケーションでは、ここで担当者別目標達成状況を更新
  }
  
  /**
   * 担当者データを更新
   * @param {string} memberName - 担当者名
   */
  function updateMemberData(memberName) {
    if (memberName === '全員') {
      // 全員のデータを表示
      updateMembersDashboard();
      notificationUtils.showInfo('全担当者のデータを表示しています');
    } else {
      // 特定の担当者のデータを表示
      const memberData = dashboardData.members.data.find(m => m.name === memberName);
      if (memberData) {
        // 担当者データの表示処理
        // ...
        notificationUtils.showInfo(`${memberName}さんのデータを表示しています`);
      }
    }
  }
  
  /**
   * 現在のビューをエクスポート
   * @param {string} format - エクスポート形式
   */
  function exportCurrentView(format) {
    try {
      let data;
      let filename;
      
      if (currentView === 'weekly') {
        data = dashboardData.weekly;
        filename = `週次レポート_${periodSelector.value}`;
      } else if (currentView === 'monthly') {
        data = dashboardData.monthly;
        filename = `月次レポート_${periodSelector.value}`;
      } else {
        data = dashboardData.members;
        filename = `担当者別レポート_${periodSelector.value}`;
      }
      
      // データをエクスポート
      exportUtils.exportData(data, format, filename);
      
      notificationUtils.showSuccess(`${getViewName(currentView)}データを${format.toUpperCase()}形式でエクスポートしました`);
    } catch (error) {
      console.error('データのエクスポート中にエラーが発生しました:', error);
      notificationUtils.showError('データのエクスポートに失敗しました');
    }
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
      default:
        return '';
    }
  }
}); 