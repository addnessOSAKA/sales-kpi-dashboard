/**
 * 営業チームKPIダッシュボード 通知ユーティリティ
 * このファイルは通知機能を提供します
 */

class NotificationUtils {
  constructor(config = NOTIFICATION_CONFIG) {
    this.config = config;
    this.notifications = [];
    this.notificationContainer = null;
    this.initNotificationContainer();
  }

  /**
   * 通知コンテナを初期化する
   */
  initNotificationContainer() {
    // 既存のコンテナがあれば削除
    const existingContainer = document.getElementById('notification-container');
    if (existingContainer) {
      document.body.removeChild(existingContainer);
    }
    
    // 通知コンテナを作成
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'notification-container';
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      width: 300px;
    `;
    
    document.body.appendChild(this.notificationContainer);
  }

  /**
   * 通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {string} type - 通知タイプ（'success', 'warning', 'error', 'info'）
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showNotification(message, type = 'info', duration = 5000) {
    // 通知IDを生成
    const id = `notification-${Date.now()}`;
    
    // 通知要素を作成
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      background-color: ${this.getBackgroundColor(type)};
      color: white;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      position: relative;
    `;
    
    // 閉じるボタンを作成
    const closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 5px;
      right: 10px;
      cursor: pointer;
      font-size: 18px;
    `;
    closeButton.addEventListener('click', () => this.removeNotification(id));
    
    // メッセージを設定
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    
    // 要素を追加
    notification.appendChild(closeButton);
    notification.appendChild(messageElement);
    this.notificationContainer.appendChild(notification);
    
    // 通知を表示
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // 通知を保存
    this.notifications.push({
      id,
      element: notification,
      timer: setTimeout(() => this.removeNotification(id), duration)
    });
    
    return id;
  }

  /**
   * 通知を削除する
   * @param {string} id - 通知ID
   */
  removeNotification(id) {
    // 通知を検索
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return;
    
    const notification = this.notifications[index];
    
    // タイマーをクリア
    clearTimeout(notification.timer);
    
    // フェードアウト
    notification.element.style.opacity = '0';
    
    // 要素を削除
    setTimeout(() => {
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      this.notifications.splice(index, 1);
    }, 300);
  }

  /**
   * 通知の背景色を取得する
   * @param {string} type - 通知タイプ
   * @returns {string} 背景色
   */
  getBackgroundColor(type) {
    switch (type) {
      case 'success':
        return '#27ae60';
      case 'warning':
        return '#f39c12';
      case 'error':
        return '#e74c3c';
      case 'info':
      default:
        return '#3498db';
    }
  }

  /**
   * 成功通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showSuccess(message, duration = 5000) {
    return this.showNotification(message, 'success', duration);
  }

  /**
   * 警告通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showWarning(message, duration = 5000) {
    return this.showNotification(message, 'warning', duration);
  }

  /**
   * エラー通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showError(message, duration = 5000) {
    return this.showNotification(message, 'error', duration);
  }

  /**
   * 情報通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showInfo(message, duration = 5000) {
    return this.showNotification(message, 'info', duration);
  }

  /**
   * 目標達成状況に基づいて通知を表示する
   * @param {Object} data - KPIデータ
   */
  checkGoalAchievement(data) {
    if (!data || !data.weekly || !data.weekly.current) return;
    
    const metrics = data.weekly.current.metrics;
    
    // 目標達成通知
    if (this.config.goalAlert.enabled) {
      Object.keys(metrics).forEach(key => {
        const metric = metrics[key];
        const percentage = (metric.value / metric.target) * 100;
        
        if (percentage >= this.config.goalAlert.threshold) {
          const metricName = this.getMetricDisplayName(key);
          this.showSuccess(`${metricName}が目標の${percentage.toFixed(1)}%を達成しました！`);
        }
      });
    }
    
    // 目標未達通知
    if (this.config.warningAlert.enabled) {
      Object.keys(metrics).forEach(key => {
        const metric = metrics[key];
        const percentage = (metric.value / metric.target) * 100;
        
        if (percentage < this.config.warningAlert.threshold) {
          const metricName = this.getMetricDisplayName(key);
          this.showWarning(`${metricName}が目標の${percentage.toFixed(1)}%しか達成していません。`);
        }
      });
    }
  }

  /**
   * メトリック名の表示名を取得する
   * @param {string} key - メトリックキー
   * @returns {string} 表示名
   */
  getMetricDisplayName(key) {
    const displayNames = {
      approach: 'アプローチ数',
      meeting: '面談数',
      negotiation: '商談数',
      proposal: '提案数',
      contract: '契約数',
      amount: '契約金額'
    };
    
    return displayNames[key] || key;
  }
}

// 通知ユーティリティのインスタンスを作成
const notificationUtils = new NotificationUtils(); 