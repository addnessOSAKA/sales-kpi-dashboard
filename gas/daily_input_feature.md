# 営業チームKPIダッシュボード 日次データ入力機能

## 機能概要

アプリケーション上で直接日次の営業活動データを入力し、自動的に週次・月次データに集計する機能を追加します。これにより、スプレッドシートでの管理の手間を減らし、リアルタイムでのデータ更新が可能になります。

## 実装案

### 1. 日次データ入力画面の追加

#### 1.1 入力フォーム

- **日付選択**: カレンダーから日付を選択
- **担当者選択**: ドロップダウンから担当者を選択
- **活動データ入力**:
  - アプローチ数
  - 面談数
  - 商談数
  - 提案数
  - 契約数
  - 契約金額
- **備考欄**: テキストエリアで自由記述
- **保存ボタン**: 入力データを保存

#### 1.2 一括入力機能

- CSVファイルのアップロードによる一括データ入力
- テンプレートのダウンロード機能

### 2. データ保存方法

#### 2.1 ローカルストレージ版

- **IndexedDB**: ブラウザのIndexedDBにデータを保存
- **LocalStorage**: 小規模データの場合はLocalStorageに保存
- **エクスポート機能**: 蓄積したデータをCSV/JSONでエクスポート可能

#### 2.2 サーバー連携版

- **Firebase Realtime Database**: リアルタイムデータベースにデータを保存
- **Google Sheets API**: 入力データを自動的にスプレッドシートに反映
- **カスタムバックエンド**: 独自のバックエンドサーバーでデータを管理

### 3. 自動集計機能

- **日次→週次集計**: 日次データを自動的に週次データに集計
- **週次→月次集計**: 週次データを自動的に月次データに集計
- **担当者別集計**: 担当者ごとのパフォーマンスを自動集計

### 4. データ検証機能

- **入力値の検証**: 数値範囲、必須項目のチェック
- **重複データの検出**: 同じ日付・担当者の重複入力を防止
- **エラー通知**: 入力エラーを即座にフィードバック

## UI設計案

### メインダッシュボードに「データ入力」タブを追加

```
+----------------+----------------+----------------+----------------+
|    週次        |    月次        |   担当者別     |  データ入力    |
+----------------+----------------+----------------+----------------+
|                                                                   |
|  [日付選択: YYYY/MM/DD]  [担当者選択: ▼]                         |
|                                                                   |
|  +-----------------------------------------------------------+   |
|  |  活動データ                                               |   |
|  |                                                           |   |
|  |  アプローチ数: [    ]  面談数: [    ]  商談数: [    ]    |   |
|  |                                                           |   |
|  |  提案数: [    ]  契約数: [    ]  契約金額: [        ]    |   |
|  |                                                           |   |
|  |  備考: [                                              ]   |   |
|  |                                                           |   |
|  +-----------------------------------------------------------+   |
|                                                                   |
|  [保存]  [クリア]  [CSVアップロード]  [テンプレートダウンロード] |
|                                                                   |
+-------------------------------------------------------------------+
```

### 日次データ一覧・編集画面

```
+-------------------------------------------------------------------+
|  日次データ一覧                                      [新規入力]    |
+-------------------------------------------------------------------+
|  [期間: YYYY/MM/DD - YYYY/MM/DD]  [担当者: ▼]  [検索: _______]   |
+-------------------------------------------------------------------+
|  日付  |  担当者  |  アプローチ  |  面談  |  商談  |  提案  | ... |
+--------+----------+--------------+--------+--------+--------+-----+
| 3/15   | 山内     |     8        |   5    |   3    |   1    | ... |
+--------+----------+--------------+--------+--------+--------+-----+
| 3/15   | 内村     |     7        |   4    |   2    |   1    | ... |
+--------+----------+--------------+--------+--------+--------+-----+
| 3/14   | 山内     |     9        |   6    |   4    |   2    | ... |
+--------+----------+--------------+--------+--------+--------+-----+
|  ...   |  ...     |    ...       |  ...   |  ...   |  ...   | ... |
+--------+----------+--------------+--------+--------+--------+-----+
|                                                   [エクスポート]   |
+-------------------------------------------------------------------+
```

## 技術的な実装方法

### 1. フロントエンド実装

```javascript
// 日次データ入力フォームのコンポーネント
class DailyInputForm {
  constructor() {
    this.initForm();
    this.bindEvents();
  }
  
  initForm() {
    // フォーム要素の初期化
    this.dateInput = document.getElementById('date-input');
    this.memberSelect = document.getElementById('member-select');
    // ...他のフォーム要素
    
    // 今日の日付をデフォルト値に設定
    this.dateInput.value = this.formatDate(new Date());
    
    // 担当者リストを取得して設定
    this.loadMemberList();
  }
  
  bindEvents() {
    // 保存ボタンのイベントリスナー
    document.getElementById('save-button').addEventListener('click', () => {
      this.saveData();
    });
    
    // CSVアップロードのイベントリスナー
    document.getElementById('csv-upload').addEventListener('change', (e) => {
      this.handleCsvUpload(e.target.files[0]);
    });
    
    // その他のイベントリスナー
  }
  
  saveData() {
    // 入力データの検証
    if (!this.validateInputs()) {
      return;
    }
    
    // データオブジェクトの作成
    const dailyData = {
      date: this.dateInput.value,
      memberId: this.memberSelect.value,
      approach: parseInt(document.getElementById('approach-input').value, 10),
      meeting: parseInt(document.getElementById('meeting-input').value, 10),
      negotiation: parseInt(document.getElementById('negotiation-input').value, 10),
      proposal: parseInt(document.getElementById('proposal-input').value, 10),
      contract: parseInt(document.getElementById('contract-input').value, 10),
      amount: parseFloat(document.getElementById('amount-input').value),
      notes: document.getElementById('notes-input').value
    };
    
    // データの保存（実装方法に応じて変更）
    this.storageService.saveDailyData(dailyData)
      .then(() => {
        this.showSuccessMessage('データが保存されました');
        this.clearForm();
      })
      .catch(error => {
        this.showErrorMessage('データの保存に失敗しました: ' + error.message);
      });
  }
  
  // その他のメソッド
}

// データストレージサービス（IndexedDB版）
class StorageService {
  constructor() {
    this.dbName = 'salesKpiDatabase';
    this.dbVersion = 1;
    this.initDatabase();
  }
  
  initDatabase() {
    const request = indexedDB.open(this.dbName, this.dbVersion);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 日次データストア
      if (!db.objectStoreNames.contains('dailyData')) {
        const store = db.createObjectStore('dailyData', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('memberId', 'memberId', { unique: false });
        store.createIndex('dateMember', ['date', 'memberId'], { unique: true });
      }
      
      // その他必要なストア
    };
    
    request.onsuccess = (event) => {
      this.db = event.target.result;
      console.log('Database initialized successfully');
    };
    
    request.onerror = (event) => {
      console.error('Database initialization error:', event.target.error);
    };
  }
  
  saveDailyData(data) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['dailyData'], 'readwrite');
      const store = transaction.objectStore('dailyData');
      
      // 一意のIDを生成（日付と担当者の組み合わせ）
      data.id = `${data.date}_${data.memberId}`;
      
      const request = store.put(data);
      
      request.onsuccess = () => resolve(data);
      request.onerror = (event) => reject(event.target.error);
    });
  }
  
  // その他のメソッド（データ取得、集計など）
}

// 自動集計サービス
class AggregationService {
  constructor(storageService) {
    this.storageService = storageService;
  }
  
  aggregateWeeklyData(startDate, endDate) {
    // 指定期間の日次データを取得して週次データに集計
    return this.storageService.getDailyDataByDateRange(startDate, endDate)
      .then(dailyData => {
        // 集計ロジック
        const aggregated = {
          period: this.formatWeekPeriod(startDate, endDate),
          metrics: {
            approach: { value: 0, target: 0, change: 0 },
            meeting: { value: 0, target: 0, change: 0 },
            negotiation: { value: 0, target: 0, change: 0 },
            proposal: { value: 0, target: 0, change: 0 },
            contract: { value: 0, target: 0, change: 0 },
            amount: { value: 0, target: 0, change: 0 }
          }
        };
        
        // データの集計
        dailyData.forEach(data => {
          aggregated.metrics.approach.value += data.approach;
          aggregated.metrics.meeting.value += data.meeting;
          aggregated.metrics.negotiation.value += data.negotiation;
          aggregated.metrics.proposal.value += data.proposal;
          aggregated.metrics.contract.value += data.contract;
          aggregated.metrics.amount.value += data.amount;
        });
        
        // 目標値と変化率の計算（仮の実装）
        // 実際には目標値の設定方法に応じて実装
        
        return aggregated;
      });
  }
  
  // 月次データ集計、担当者別集計などのメソッド
}
```

### 2. バックエンド連携（オプション）

```javascript
// Firebase Realtime Database連携
class FirebaseStorageService {
  constructor() {
    // Firebase初期化
    this.initFirebase();
  }
  
  initFirebase() {
    // Firebase設定
    const firebaseConfig = {
      // Firebaseの設定情報
    };
    
    firebase.initializeApp(firebaseConfig);
    this.database = firebase.database();
  }
  
  saveDailyData(data) {
    // データの保存
    return this.database.ref('dailyData/' + data.date + '_' + data.memberId).set(data);
  }
  
  // その他のメソッド
}

// Google Sheets API連携
class SheetsApiService {
  constructor(apiKey, spreadsheetId) {
    this.apiKey = apiKey;
    this.spreadsheetId = spreadsheetId;
    this.initGoogleApi();
  }
  
  initGoogleApi() {
    // Google API初期化
    gapi.load('client', () => {
      gapi.client.init({
        apiKey: this.apiKey,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
      }).then(() => {
        console.log('Google Sheets API initialized');
      });
    });
  }
  
  saveDailyData(data) {
    // スプレッドシートにデータを追加
    return gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'DailyData!A:H',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      values: [
        [
          data.date,
          data.memberId,
          data.approach,
          data.meeting,
          data.negotiation,
          data.proposal,
          data.contract,
          data.amount,
          data.notes
        ]
      ]
    });
  }
  
  // その他のメソッド
}
```

## 導入ステップ

1. **基本機能の実装**:
   - 日次データ入力フォームの作成
   - IndexedDBによるローカルデータ保存
   - 基本的な集計機能

2. **拡張機能の追加**:
   - CSVインポート/エクスポート
   - データ検証の強化
   - UIの改善

3. **バックエンド連携**（オプション）:
   - Firebase連携
   - Google Sheets API連携
   - カスタムバックエンド構築

## メリット

1. **リアルタイム更新**: データ入力後すぐにダッシュボードに反映
2. **使いやすさ**: スプレッドシートを開かずにアプリ内で完結
3. **データ整合性**: 入力検証によるエラー防止
4. **柔軟な保存**: オンライン/オフライン両方で使用可能

## 注意点

1. **データバックアップ**: 定期的なエクスポート機能の提供
2. **セキュリティ**: 特にバックエンド連携時の認証・アクセス制御
3. **同期問題**: 複数ユーザーによる同時編集の競合解決
4. **移行計画**: 既存のスプレッドシートデータの移行方法 