/**
 * 営業チームKPIダッシュボード 通知ユーティリティ
 * アプリケーション内の通知機能を提供します
 */

class NotificationUtils {
  constructor() {
    this.config = window.appConfig || {};
    this.container = document.getElementById('notification-container');
    
    // 通知コンテナが存在しない場合は作成
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      document.body.appendChild(this.container);
    }
    
    // プッシュ通知の許可を確認
    this.checkNotificationPermission();
  }
  
  /**
   * プッシュ通知の許可を確認する
   */
  checkNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('このブラウザはプッシュ通知をサポートしていません');
      return;
    }
    
    if (Notification.permission === 'default') {
      // 後でユーザーアクションに応じて許可を要求
      console.log('プッシュ通知の許可が未設定です');
    }
  }
  
  /**
   * プッシュ通知の許可を要求する
   * @returns {Promise} 許可状態
   */
  requestNotificationPermission() {
    if (!('Notification' in window)) {
      return Promise.resolve('denied');
    }
    
    return Notification.requestPermission();
  }
  
  /**
   * 通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {string} type - 通知タイプ（'success', 'error', 'warning', 'info'）
   * @param {number} duration - 表示時間（ミリ秒）
   */
  show(message, type = 'info', duration = null) {
    if (!this.config.notifications || this.config.notifications.enabled === false) {
      console.log(`通知: ${message} (${type})`);
      return;
    }
    
    // 表示時間を設定
    const displayDuration = duration || (this.config.notifications && this.config.notifications.duration) || 3000;
    
    // 通知要素を作成
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // 通知を表示
    this.container.appendChild(notification);
    
    // アニメーション効果
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // 指定時間後に通知を削除
    setTimeout(() => {
      notification.classList.remove('show');
      notification.classList.add('hide');
      
      // アニメーション完了後に要素を削除
      setTimeout(() => {
        if (notification.parentNode) {
          this.container.removeChild(notification);
        }
      }, 300);
    }, displayDuration);
    
    return notification;
  }
  
  /**
   * 成功通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showSuccess(message, duration = null) {
    return this.show(message, 'success', duration);
  }
  
  /**
   * エラー通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showError(message, duration = null) {
    return this.show(message, 'error', duration);
  }
  
  /**
   * 警告通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showWarning(message, duration = null) {
    return this.show(message, 'warning', duration);
  }
  
  /**
   * 情報通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showInfo(message, duration = null) {
    return this.show(message, 'info', duration);
  }
  
  /**
   * プッシュ通知を送信する
   * @param {string} title - 通知タイトル
   * @param {string} message - 通知メッセージ
   * @param {Object} options - 通知オプション
   */
  sendPushNotification(title, message, options = {}) {
    if (!('Notification' in window)) {
      console.log('このブラウザはプッシュ通知をサポートしていません');
      return;
    }
    
    if (Notification.permission !== 'granted') {
      this.requestNotificationPermission().then(permission => {
        if (permission === 'granted') {
          this.sendPushNotification(title, message, options);
        }
      });
      return;
    }
    
    // デフォルトオプションとマージ
    const notificationOptions = {
      body: message,
      icon: 'images/icon-192x192.png',
      ...options
    };
    
    // 通知を作成
    const notification = new Notification(title, notificationOptions);
    
    // クリックイベント
    notification.onclick = function() {
      window.focus();
      if (options.onClick) {
        options.onClick();
      }
    };
    
    return notification;
  }
  
  /**
   * 目標達成通知を送信する
   * @param {string} metric - メトリクス名
   * @param {number} value - 達成値
   * @param {number} target - 目標値
   */
  sendGoalAchievedNotification(metric, value, target) {
    const metricNames = {
      approach: 'アプローチ数',
      meeting: '面談数',
      negotiation: '商談数',
      proposal: '提案数',
      contract: '契約数',
      amount: '契約金額'
    };
    
    const metricName = metricNames[metric] || metric;
    const percentage = Math.round((value / target) * 100);
    
    // アプリ内通知
    this.showSuccess(`${metricName}が目標を達成しました！ (${percentage}%)`);
    
    // プッシュ通知
    this.sendPushNotification(
      '目標達成！',
      `${metricName}が目標を達成しました！ (${percentage}%)`,
      {
        tag: `goal-${metric}`,
        badge: 'images/badge-72x72.png'
      }
    );
  }
  
  /**
   * 目標未達通知を送信する
   * @param {string} metric - メトリクス名
   * @param {number} value - 達成値
   * @param {number} target - 目標値
   * @param {number} threshold - 警告閾値（0-1）
   */
  sendGoalWarningNotification(metric, value, target, threshold = 0.7) {
    const metricNames = {
      approach: 'アプローチ数',
      meeting: '面談数',
      negotiation: '商談数',
      proposal: '提案数',
      contract: '契約数',
      amount: '契約金額'
    };
    
    const metricName = metricNames[metric] || metric;
    const percentage = Math.round((value / target) * 100);
    
    if ((value / target) < threshold) {
      // アプリ内通知
      this.showWarning(`${metricName}が目標を下回っています (${percentage}%)`);
      
      // プッシュ通知
      this.sendPushNotification(
        '目標未達警告',
        `${metricName}が目標を下回っています (${percentage}%)`,
        {
          tag: `warning-${metric}`,
          badge: 'images/badge-72x72.png'
        }
      );
    }
  }
}

// グローバルインスタンスとしてエクスポート
window.notificationUtils = new NotificationUtils(); 