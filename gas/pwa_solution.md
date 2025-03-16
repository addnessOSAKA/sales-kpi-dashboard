# 営業チームKPIダッシュボード PWA実装案

## PWA（Progressive Web App）とは

PWAは、ウェブアプリケーションをネイティブアプリのような体験で提供する技術です。オフライン対応、ホーム画面へのインストール、プッシュ通知などの機能を備えています。

## PWA実装のメリット

1. **オフライン対応**: インターネット接続がなくても使用可能
2. **インストール可能**: ホーム画面に追加でき、ブラウザを開かずに起動可能
3. **高速読み込み**: Service Workerによるキャッシュで高速に動作
4. **プッシュ通知**: ユーザーに重要な情報を通知可能
5. **クロスプラットフォーム**: iOS、Android、デスクトップで同じコードベース

## 実装案

### 1. PWA基本構成

#### 1.1 マニフェストファイル

```json
// manifest.json
{
  "name": "営業チームKPIダッシュボード",
  "short_name": "営業KPI",
  "description": "営業チームの活動状況や成果を可視化するKPIダッシュボード",
  "start_url": "/index.html",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3498db",
  "icons": [
    {
      "src": "images/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "images/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### 1.2 Service Worker

```javascript
// service-worker.js
const CACHE_NAME = 'sales-kpi-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/chart.js',
  '/js/api-service.js',
  '/js/config.js',
  '/js/export-utils.js',
  '/js/notification-utils.js',
  '/js/daily-input.js',
  '/images/logo.png',
  // その他必要なリソース
];

// インストール時にリソースをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
  );
});

// フェッチリクエストの処理
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュがあればそれを返す
        if (response) {
          return response;
        }
        
        // キャッシュがなければネットワークからフェッチ
        return fetch(event.request)
          .then(response => {
            // 有効なレスポンスでなければそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // レスポンスをクローンしてキャッシュに追加
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
  );
});

// 古いキャッシュの削除
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

### 2. オフラインデータ管理

#### 2.1 IndexedDBを使用したデータ保存

```javascript
// db-service.js
class DbService {
  constructor() {
    this.dbName = 'salesKpiDatabase';
    this.dbVersion = 1;
    this.db = null;
    this.initDb();
  }
  
  initDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = event => {
        const db = event.target.result;
        
        // 日次データストア
        if (!db.objectStoreNames.contains('dailyData')) {
          const store = db.createObjectStore('dailyData', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('memberId', 'memberId', { unique: false });
        }
        
        // 週次データストア
        if (!db.objectStoreNames.contains('weeklyData')) {
          const store = db.createObjectStore('weeklyData', { keyPath: 'period' });
        }
        
        // 月次データストア
        if (!db.objectStoreNames.contains('monthlyData')) {
          const store = db.createObjectStore('monthlyData', { keyPath: 'period' });
        }
        
        // 同期状態ストア
        if (!db.objectStoreNames.contains('syncStatus')) {
          const store = db.createObjectStore('syncStatus', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = event => {
        this.db = event.target.result;
        resolve(this.db);
      };
      
      request.onerror = event => {
        reject('データベース初期化エラー: ' + event.target.errorCode);
      };
    });
  }
  
  // 日次データの保存
  saveDailyData(data) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        this.initDb()
          .then(() => this.saveDailyData(data))
          .then(resolve)
          .catch(reject);
        return;
      }
      
      const transaction = this.db.transaction(['dailyData', 'syncStatus'], 'readwrite');
      const store = transaction.objectStore('dailyData');
      const syncStore = transaction.objectStore('syncStatus');
      
      // データを保存
      const request = store.put(data);
      
      request.onsuccess = () => {
        // 同期状態を「未同期」に設定
        syncStore.put({
          id: `daily_${data.id}`,
          type: 'dailyData',
          dataId: data.id,
          synced: false,
          timestamp: new Date().getTime()
        });
        
        resolve(data);
      };
      
      request.onerror = event => {
        reject('データ保存エラー: ' + event.target.errorCode);
      };
    });
  }
  
  // 日次データの取得
  getDailyData(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        this.initDb()
          .then(() => this.getDailyData(id))
          .then(resolve)
          .catch(reject);
        return;
      }
      
      const transaction = this.db.transaction(['dailyData'], 'readonly');
      const store = transaction.objectStore('dailyData');
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = event => {
        reject('データ取得エラー: ' + event.target.errorCode);
      };
    });
  }
  
  // 日付範囲での日次データ取得
  getDailyDataByDateRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        this.initDb()
          .then(() => this.getDailyDataByDateRange(startDate, endDate))
          .then(resolve)
          .catch(reject);
        return;
      }
      
      const transaction = this.db.transaction(['dailyData'], 'readonly');
      const store = transaction.objectStore('dailyData');
      const index = store.index('date');
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.openCursor(range);
      
      const results = [];
      
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = event => {
        reject('データ取得エラー: ' + event.target.errorCode);
      };
    });
  }
  
  // 未同期データの取得
  getUnsyncedData() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        this.initDb()
          .then(() => this.getUnsyncedData())
          .then(resolve)
          .catch(reject);
        return;
      }
      
      const transaction = this.db.transaction(['syncStatus'], 'readonly');
      const store = transaction.objectStore('syncStatus');
      const request = store.openCursor();
      
      const unsyncedItems = [];
      
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          if (!cursor.value.synced) {
            unsyncedItems.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(unsyncedItems);
        }
      };
      
      request.onerror = event => {
        reject('データ取得エラー: ' + event.target.errorCode);
      };
    });
  }
  
  // その他必要なメソッド
}
```

#### 2.2 バックグラウンド同期

```javascript
// sync-service.js
class SyncService {
  constructor(dbService, apiService) {
    this.dbService = dbService;
    this.apiService = apiService;
    this.registerSync();
  }
  
  registerSync() {
    // Service Worker APIのバックグラウンド同期が利用可能か確認
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then(registration => {
          // 定期的な同期を登録
          return registration.periodicSync.register('sync-data', {
            minInterval: 60 * 60 * 1000 // 1時間ごと
          });
        })
        .catch(err => {
          console.log('定期同期の登録に失敗しました:', err);
          // 代替手段として手動同期を設定
          this.setupManualSync();
        });
    } else {
      console.log('バックグラウンド同期がサポートされていません');
      // 代替手段として手動同期を設定
      this.setupManualSync();
    }
  }
  
  setupManualSync() {
    // オンラインになったときに同期を実行
    window.addEventListener('online', () => {
      this.syncData();
    });
    
    // 定期的に同期を試行
    setInterval(() => {
      if (navigator.onLine) {
        this.syncData();
      }
    }, 15 * 60 * 1000); // 15分ごと
  }
  
  syncData() {
    return this.dbService.getUnsyncedData()
      .then(unsyncedItems => {
        if (unsyncedItems.length === 0) {
          console.log('同期するデータがありません');
          return Promise.resolve();
        }
        
        console.log(`${unsyncedItems.length}件のデータを同期します`);
        
        // 各未同期データを処理
        const syncPromises = unsyncedItems.map(item => {
          return this.dbService.getDailyData(item.dataId)
            .then(data => {
              // APIサービスを使用してデータを送信
              return this.apiService.saveDailyData(data)
                .then(() => {
                  // 同期成功を記録
                  return this.dbService.markAsSynced(item.id);
                })
                .catch(error => {
                  console.error('データ同期エラー:', error);
                  return Promise.reject(error);
                });
            });
        });
        
        return Promise.all(syncPromises);
      })
      .then(() => {
        console.log('同期が完了しました');
      })
      .catch(error => {
        console.error('同期中にエラーが発生しました:', error);
      });
  }
}
```

### 3. プッシュ通知

```javascript
// notification-service.js
class NotificationService {
  constructor() {
    this.initNotifications();
  }
  
  initNotifications() {
    // プッシュ通知がサポートされているか確認
    if (!('Notification' in window)) {
      console.log('このブラウザはプッシュ通知をサポートしていません');
      return;
    }
    
    // 通知の許可を要求
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
  
  // 目標達成通知
  sendGoalAchievedNotification(metric, value, target) {
    if (Notification.permission !== 'granted') {
      return;
    }
    
    const achievementRate = (value / target) * 100;
    
    if (achievementRate >= 100) {
      const notification = new Notification('目標達成おめでとうございます！', {
        body: `${metric}の目標を達成しました！ (${value}/${target}, ${achievementRate.toFixed(1)}%)`,
        icon: '/images/success-icon.png'
      });
      
      notification.onclick = function() {
        window.focus();
        this.close();
      };
    }
  }
  
  // リマインダー通知
  sendReminderNotification() {
    if (Notification.permission !== 'granted') {
      return;
    }
    
    const now = new Date();
    const hours = now.getHours();
    
    // 営業日の終わりに通知
    if (hours === 17 && now.getDay() >= 1 && now.getDay() <= 5) {
      const notification = new Notification('日次データ入力リマインダー', {
        body: '今日の営業活動データを入力してください',
        icon: '/images/reminder-icon.png'
      });
      
      notification.onclick = function() {
        window.focus();
        window.location.href = '/index.html#data-input';
        this.close();
      };
    }
  }
}
```

### 4. オフライン対応UI

```javascript
// app.js
class SalesKpiApp {
  constructor() {
    this.dbService = new DbService();
    this.apiService = new ApiService();
    this.syncService = new SyncService(this.dbService, this.apiService);
    this.notificationService = new NotificationService();
    
    this.initApp();
  }
  
  initApp() {
    // オンライン/オフライン状態の監視
    window.addEventListener('online', () => {
      this.updateOnlineStatus(true);
    });
    
    window.addEventListener('offline', () => {
      this.updateOnlineStatus(false);
    });
    
    // 初期状態を設定
    this.updateOnlineStatus(navigator.onLine);
    
    // Service Workerの登録
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Workerが登録されました:', registration);
        })
        .catch(error => {
          console.error('Service Worker登録エラー:', error);
        });
    }
    
    // アプリの初期化処理
    this.loadInitialData();
    this.setupEventListeners();
    
    // リマインダー通知のスケジュール設定
    setInterval(() => {
      this.notificationService.sendReminderNotification();
    }, 60 * 60 * 1000); // 1時間ごとにチェック
  }
  
  updateOnlineStatus(isOnline) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      if (isOnline) {
        statusElement.textContent = 'オンライン';
        statusElement.className = 'status-online';
        
        // オンラインになったらデータ同期を試行
        this.syncService.syncData();
      } else {
        statusElement.textContent = 'オフライン';
        statusElement.className = 'status-offline';
      }
    }
    
    // オフライン時に使用できない機能を無効化/表示
    const onlineOnlyElements = document.querySelectorAll('.online-only');
    onlineOnlyElements.forEach(element => {
      element.style.display = isOnline ? 'block' : 'none';
    });
    
    const offlineOnlyElements = document.querySelectorAll('.offline-only');
    offlineOnlyElements.forEach(element => {
      element.style.display = isOnline ? 'none' : 'block';
    });
  }
  
  loadInitialData() {
    // オンラインの場合はAPIからデータを取得
    if (navigator.onLine) {
      this.apiService.fetchAllData()
        .then(data => {
          // 取得したデータをローカルDBに保存
          return this.dbService.saveAllData(data);
        })
        .then(() => {
          // UIを更新
          this.updateUI();
        })
        .catch(error => {
          console.error('データ取得エラー:', error);
          // エラー時はローカルDBからデータを取得
          this.loadDataFromLocalDb();
        });
    } else {
      // オフラインの場合はローカルDBからデータを取得
      this.loadDataFromLocalDb();
    }
  }
  
  loadDataFromLocalDb() {
    Promise.all([
      this.dbService.getAllWeeklyData(),
      this.dbService.getAllMonthlyData(),
      this.dbService.getAllMembersData()
    ])
    .then(([weeklyData, monthlyData, membersData]) => {
      // UIを更新
      this.updateUI(weeklyData, monthlyData, membersData);
    })
    .catch(error => {
      console.error('ローカルデータ取得エラー:', error);
      // エラーメッセージを表示
      this.showErrorMessage('データの読み込みに失敗しました。ページを再読み込みしてください。');
    });
  }
  
  // その他必要なメソッド
}

// アプリの初期化
document.addEventListener('DOMContentLoaded', () => {
  const app = new SalesKpiApp();
});
```

### 5. インストール案内

```javascript
// install-prompt.js
class InstallPrompt {
  constructor() {
    this.deferredPrompt = null;
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // インストールプロンプトイベントを捕捉
    window.addEventListener('beforeinstallprompt', (e) => {
      // デフォルトのプロンプト表示を防止
      e.preventDefault();
      // イベントを保存
      this.deferredPrompt = e;
      // インストールボタンを表示
      this.showInstallButton();
    });
    
    // インストール完了イベント
    window.addEventListener('appinstalled', () => {
      // インストールボタンを非表示
      this.hideInstallButton();
      // インストール完了メッセージを表示
      this.showInstallSuccessMessage();
      // deferredPromptをクリア
      this.deferredPrompt = null;
    });
  }
  
  showInstallButton() {
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => {
        this.promptInstall();
      });
    }
  }
  
  hideInstallButton() {
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }
  
  promptInstall() {
    if (!this.deferredPrompt) {
      return;
    }
    
    // インストールプロンプトを表示
    this.deferredPrompt.prompt();
    
    // ユーザーの選択を待機
    this.deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('ユーザーがインストールを承諾しました');
      } else {
        console.log('ユーザーがインストールを拒否しました');
      }
      // deferredPromptをクリア
      this.deferredPrompt = null;
    });
  }
  
  showInstallSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'install-success-message';
    message.textContent = 'アプリがインストールされました！';
    document.body.appendChild(message);
    
    // 3秒後にメッセージを非表示
    setTimeout(() => {
      message.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(message);
      }, 500);
    }, 3000);
  }
}

// インストールプロンプトの初期化
document.addEventListener('DOMContentLoaded', () => {
  const installPrompt = new InstallPrompt();
});
```

## 実装ステップ

1. **基本PWA対応**:
   - マニフェストファイルの作成
   - Service Workerの実装
   - アイコンの準備

2. **オフラインデータ管理**:
   - IndexedDBの実装
   - データ同期機能の追加

3. **UI拡張**:
   - オフライン状態表示
   - インストールボタンの追加
   - 日次データ入力フォームの実装

4. **高度な機能**:
   - プッシュ通知
   - バックグラウンド同期
   - データエクスポート/インポート

## メリット

1. **常時アクセス可能**: オフラインでも使用可能
2. **高速な読み込み**: キャッシュによる高速化
3. **ネイティブアプリ体験**: ホーム画面からの起動、全画面表示
4. **自動更新**: 新バージョンの自動更新
5. **低コスト**: ネイティブアプリ開発より低コスト

## 注意点

1. **ブラウザ互換性**: 一部の古いブラウザではPWA機能が制限される
2. **ストレージ制限**: ブラウザによってはローカルストレージに制限がある
3. **バッテリー消費**: バックグラウンド同期やプッシュ通知はバッテリーを消費する
4. **セキュリティ**: HTTPS接続が必須 