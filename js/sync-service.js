/**
 * 営業チームKPIダッシュボード 同期サービス
 * オンライン/オフライン状態の管理とデータ同期を提供します
 */

class SyncService {
  constructor(dbService, apiService) {
    this.dbService = dbService || window.dbService;
    this.apiService = apiService || window.apiService;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.listeners = {
      statusChange: []
    };
    
    this.init();
  }
  
  /**
   * 同期サービスを初期化する
   */
  init() {
    // オンライン/オフライン状態の監視
    window.addEventListener('online', () => {
      this.setOnlineStatus(true);
      this.syncData();
    });
    
    window.addEventListener('offline', () => {
      this.setOnlineStatus(false);
    });
    
    // 定期的な同期の設定
    this.setupPeriodicSync();
    
    // 初期状態の設定
    this.setOnlineStatus(navigator.onLine);
  }
  
  /**
   * オンライン状態を設定する
   * @param {boolean} isOnline - オンライン状態
   */
  setOnlineStatus(isOnline) {
    const statusChanged = this.isOnline !== isOnline;
    this.isOnline = isOnline;
    
    if (statusChanged) {
      console.log(`接続状態が変更されました: ${isOnline ? 'オンライン' : 'オフライン'}`);
      this.notifyStatusChange();
    }
  }
  
  /**
   * 状態変更を通知する
   */
  notifyStatusChange() {
    this.listeners.statusChange.forEach(callback => {
      try {
        callback(this.isOnline);
      } catch (error) {
        console.error('状態変更通知エラー:', error);
      }
    });
  }
  
  /**
   * 状態変更リスナーを追加する
   * @param {Function} callback - 状態変更時に呼び出されるコールバック関数
   */
  addStatusChangeListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.statusChange.push(callback);
    }
  }
  
  /**
   * 状態変更リスナーを削除する
   * @param {Function} callback - 削除するコールバック関数
   */
  removeStatusChangeListener(callback) {
    const index = this.listeners.statusChange.indexOf(callback);
    if (index !== -1) {
      this.listeners.statusChange.splice(index, 1);
    }
  }
  
  /**
   * 定期的な同期を設定する
   */
  setupPeriodicSync() {
    // Service Worker APIのバックグラウンド同期が利用可能か確認
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then(registration => {
          // バックグラウンド同期を登録
          return registration.sync.register('sync-data');
        })
        .catch(err => {
          console.log('バックグラウンド同期の登録に失敗しました:', err);
          // 代替手段として手動同期を設定
          this.setupManualSync();
        });
    } else {
      console.log('バックグラウンド同期がサポートされていません');
      // 代替手段として手動同期を設定
      this.setupManualSync();
    }
  }
  
  /**
   * 手動同期を設定する
   */
  setupManualSync() {
    // 定期的に同期を試行
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncData();
      }
    }, 5 * 60 * 1000); // 5分ごと
  }
  
  /**
   * データを同期する
   * @returns {Promise} 同期操作の結果
   */
  syncData() {
    if (this.syncInProgress || !this.isOnline) {
      return Promise.resolve(false);
    }
    
    this.syncInProgress = true;
    console.log('データ同期を開始します...');
    
    return this.dbService.getUnsyncedData()
      .then(unsyncedItems => {
        if (unsyncedItems.length === 0) {
          console.log('同期するデータがありません');
          return Promise.resolve(true);
        }
        
        console.log(`${unsyncedItems.length}件のデータを同期します`);
        
        // 各未同期データを処理
        const syncPromises = unsyncedItems.map(item => {
          return this.syncItem(item);
        });
        
        return Promise.all(syncPromises);
      })
      .then(results => {
        console.log('データ同期が完了しました');
        return true;
      })
      .catch(error => {
        console.error('データ同期中にエラーが発生しました:', error);
        return false;
      })
      .finally(() => {
        this.syncInProgress = false;
      });
  }
  
  /**
   * 単一のアイテムを同期する
   * @param {Object} item - 同期するアイテム
   * @returns {Promise} 同期操作の結果
   */
  syncItem(item) {
    switch (item.type) {
      case 'dailyData':
        return this.dbService.getDailyData(item.dataId)
          .then(data => {
            if (!data) {
              throw new Error(`データが見つかりません: ${item.dataId}`);
            }
            
            return this.apiService.saveDailyData(data)
              .then(() => {
                return this.dbService.markAsSynced(item.id);
              });
          });
        
      case 'project':
        return this.dbService.getProject(item.dataId)
          .then(project => {
            if (!project) {
              throw new Error(`案件が見つかりません: ${item.dataId}`);
            }
            
            return this.apiService.saveProject(project)
              .then(() => {
                return this.dbService.markAsSynced(item.id);
              });
          });
        
      case 'weeklyData':
        return this.dbService.getWeeklyData(item.dataId)
          .then(data => {
            if (!data) {
              throw new Error(`週次データが見つかりません: ${item.dataId}`);
            }
            
            return this.apiService.saveWeeklyData(data)
              .then(() => {
                return this.dbService.markAsSynced(item.id);
              });
          });
        
      default:
        console.warn(`未知の同期タイプ: ${item.type}`);
        return Promise.resolve();
    }
  }
  
  /**
   * APIからデータを取得してローカルに保存する
   * @returns {Promise} 取得操作の結果
   */
  fetchAndSaveData() {
    if (!this.isOnline) {
      return Promise.reject(new Error('オフライン状態です'));
    }
    
    return this.apiService.fetchAllData()
      .then(data => {
        return this.dbService.saveApiData(data);
      });
  }
}

// グローバルインスタンスとしてエクスポート
window.syncService = new SyncService(); 