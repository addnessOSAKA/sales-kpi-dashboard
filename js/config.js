/**
 * 営業チームKPIダッシュボード設定ファイル
 * このファイルはAPIとの連携設定を行います
 */

// API設定
const API_CONFIG = {
  // API接続先URL（スプレッドシート連携時に変更）
  baseUrl: 'data', // ローカルJSONファイル用のパス
  
  // APIエンドポイント（スプレッドシート連携時に変更）
  endpoints: {
    weekly: '/weekly-data.json',
    monthly: '/monthly-data.json',
    members: '/members-data.json',
    summary: '/sample-data.json' // 全データを含むファイル
  },
  
  // API認証情報（スプレッドシート連携時に設定）
  auth: {
    apiKey: '', // APIキー
    clientId: '', // クライアントID
    clientSecret: '' // クライアントシークレット
  },
  
  // データ更新間隔（ミリ秒）
  refreshInterval: 300000, // 5分ごとに更新
  
  // データキャッシュ設定
  cache: {
    enabled: true, // キャッシュを有効にする
    expiry: 600000 // 10分間キャッシュを保持
  },
  
  // スプレッドシート連携設定
  spreadsheet: {
    enabled: false, // スプレッドシート連携を有効にする場合はtrueに設定
    apiKey: '', // Google Sheets APIキー
    id: '', // スプレッドシートID
    sheets: {
      weekly: 'Weekly', // 週次データのシート名
      monthly: 'Monthly', // 月次データのシート名
      members: 'Members', // 担当者データのシート名
      summary: '' // サマリーデータのシート名（空の場合は他のシートから自動生成）
    }
  }
};

// 表示設定
const DISPLAY_CONFIG = {
  // 日付フォーマット
  dateFormat: {
    weekly: 'YYYY年M月第W週',
    monthly: 'YYYY年M月',
    yearly: 'YYYY年'
  },
  
  // チャートカラー設定
  chartColors: {
    approach: '#3498db', // アプローチ数
    meeting: '#f39c12',  // 面談数
    negotiation: '#2ecc71', // 商談数
    proposal: '#9b59b6',  // 提案数
    contract: '#e74c3c',  // 契約数
    amount: '#27ae60'     // 契約金額
  },
  
  // 目標達成率の色分け
  progressColors: {
    good: '#27ae60',    // 90%以上
    warning: '#f39c12', // 60%以上90%未満
    danger: '#e74c3c'   // 60%未満
  },
  
  // デフォルト表示期間
  defaultPeriod: {
    weekly: '2025年3月第3週',
    monthly: '2025年3月',
    yearly: '2025年'
  },
  
  // デフォルト表示タブ
  defaultView: 'weekly' // 'weekly', 'monthly', 'members'
};

// エクスポート設定
const EXPORT_CONFIG = {
  // エクスポート形式
  formats: ['csv', 'excel', 'pdf'],
  
  // PDFエクスポート設定
  pdf: {
    pageSize: 'A4',
    orientation: 'landscape',
    title: '営業チームKPIダッシュボード',
    footer: '© 2025 営業部'
  }
};

// 通知設定
const NOTIFICATION_CONFIG = {
  // 目標達成通知
  goalAlert: {
    enabled: true,
    threshold: 90 // 90%以上で通知
  },
  
  // 目標未達通知
  warningAlert: {
    enabled: true,
    threshold: 60 // 60%未満で通知
  }
}; 