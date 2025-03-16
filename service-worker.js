/**
 * 営業チームKPIダッシュボード Service Worker
 * オフラインサポートとキャッシュ管理を提供します
 */

const CACHE_NAME = 'sales-kpi-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/settings.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/api-service.js',
  '/js/config.js',
  '/js/export-utils.js',
  '/js/notification-utils.js',
  '/js/settings.js',
  '/data/weekly-data.json',
  '/data/monthly-data.json',
  '/data/members-data.json',
  '/data/sample-data.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
];

// インストール時にリソースをキャッシュ
self.addEventListener('install', event => {
  console.log('Service Workerをインストール中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('初期リソースのキャッシュが完了しました');
        return self.skipWaiting();
      })
  );
});

// 新しいService Workerがアクティブになったときに古いキャッシュを削除
self.addEventListener('activate', event => {
  console.log('Service Workerをアクティブ化中...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Workerがアクティブになりました');
      return self.clients.claim();
    })
  );
});

// フェッチリクエストの処理
self.addEventListener('fetch', event => {
  // Google APIリクエストはキャッシュしない
  if (event.request.url.includes('googleapis.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュがあればそれを返す
        if (response) {
          return response;
        }
        
        // リクエストのクローンを作成（リクエストは一度しか使えないため）
        const fetchRequest = event.request.clone();
        
        // ネットワークからフェッチ
        return fetch(fetchRequest)
          .then(response => {
            // 有効なレスポンスでなければそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // レスポンスのクローンを作成（レスポンスは一度しか使えないため）
            const responseToCache = response.clone();
            
            // レスポンスをキャッシュに追加
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('フェッチに失敗しました:', error);
            // オフライン時にAPIリクエストの場合はフォールバックデータを返す
            if (event.request.url.includes('/data/') && event.request.url.endsWith('.json')) {
              return caches.match('/data/sample-data.json');
            }
          });
      })
  );
});

// バックグラウンド同期
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('バックグラウンド同期を実行中...');
    event.waitUntil(syncData());
  }
});

// プッシュ通知
self.addEventListener('push', event => {
  const data = event.data.json();
  console.log('プッシュ通知を受信:', data);
  
  const options = {
    body: data.body,
    icon: 'images/icon-192x192.png',
    badge: 'images/badge-72x72.png',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知クリック
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// データ同期関数
async function syncData() {
  // IndexedDBからの未同期データの取得と送信を実装
  // 実際の実装はアプリケーションの要件に合わせて調整
  console.log('データ同期が完了しました');
} 