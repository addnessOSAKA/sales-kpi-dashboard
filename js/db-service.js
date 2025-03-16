/**
 * 営業チームKPIダッシュボード データベースサービス
 * IndexedDBを使用したローカルデータ管理を提供します
 */

class DbService {
  constructor() {
    this.dbName = 'salesKpiDatabase';
    this.dbVersion = 2;
    this.db = null;
    this.initDb();
  }
  
  /**
   * データベースを初期化する
   * @returns {Promise} データベース初期化の結果
   */
  initDb() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }
      
      console.log('IndexedDBを初期化中...');
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = event => {
        const db = event.target.result;
        console.log('データベーススキーマをアップグレード中...');
        
        // 日次データストア
        if (!db.objectStoreNames.contains('dailyData')) {
          const store = db.createObjectStore('dailyData', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('memberId', 'memberId', { unique: false });
          store.createIndex('dateMember', ['date', 'memberId'], { unique: true });
          console.log('日次データストアを作成しました');
        }
        
        // 案件データストア
        if (!db.objectStoreNames.contains('projects')) {
          const store = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
          store.createIndex('companyName', 'companyName', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('assignedTo', 'assignedTo', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('案件データストアを作成しました');
        }
        
        // 週次データストア
        if (!db.objectStoreNames.contains('weeklyData')) {
          const store = db.createObjectStore('weeklyData', { keyPath: 'period' });
          console.log('週次データストアを作成しました');
        }
        
        // 月次データストア
        if (!db.objectStoreNames.contains('monthlyData')) {
          const store = db.createObjectStore('monthlyData', { keyPath: 'period' });
          console.log('月次データストアを作成しました');
        }
        
        // 担当者データストア
        if (!db.objectStoreNames.contains('members')) {
          const store = db.createObjectStore('members', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: true });
          console.log('担当者データストアを作成しました');
        }
        
        // 同期状態ストア
        if (!db.objectStoreNames.contains('syncStatus')) {
          const store = db.createObjectStore('syncStatus', { keyPath: 'id' });
          console.log('同期状態ストアを作成しました');
        }
        
        // ユーザーデータストア
        if (!db.objectStoreNames.contains('users')) {
          const store = db.createObjectStore('users', { keyPath: 'uid' });
          store.createIndex('email', 'email', { unique: true });
          store.createIndex('role', 'role', { unique: false });
          console.log('ユーザーデータストアを作成しました');
        }
        
        // ユーザー設定ストア
        if (!db.objectStoreNames.contains('userSettings')) {
          const store = db.createObjectStore('userSettings', { keyPath: 'uid' });
          console.log('ユーザー設定ストアを作成しました');
        }
      };
      
      request.onsuccess = event => {
        this.db = event.target.result;
        console.log('データベースが正常に初期化されました');
        resolve(this.db);
      };
      
      request.onerror = event => {
        console.error('データベース初期化エラー:', event.target.error);
        reject('データベース初期化エラー: ' + event.target.error);
      };
    });
  }
  
  /**
   * 日次データを保存する
   * @param {Object} data - 保存するデータ
   * @returns {Promise} 保存操作の結果
   */
  saveDailyData(data) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        this.initDb()
          .then(() => this.saveDailyData(data))
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // 一意のIDを生成（日付と担当者の組み合わせ）
      if (!data.id) {
        data.id = `${data.date}_${data.memberId}`;
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
        
        console.log('日次データを保存しました:', data.id);
        resolve(data);
      };
      
      request.onerror = event => {
        console.error('データ保存エラー:', event.target.error);
        reject('データ保存エラー: ' + event.target.error);
      };
    });
  }
  
  /**
   * 案件データを保存する
   * @param {Object} project - 保存する案件データ
   * @returns {Promise} 保存操作の結果
   */
  saveProject(project) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        this.initDb()
          .then(() => this.saveProject(project))
          .then(resolve)
          .catch(reject);
        return;
      }
      
      const transaction = this.db.transaction(['projects', 'syncStatus'], 'readwrite');
      const store = transaction.objectStore('projects');
      const syncStore = transaction.objectStore('syncStatus');
      
      // 新規案件の場合は作成日時を設定
      if (!project.id) {
        project.createdAt = new Date().toISOString();
      }
      
      // データを保存
      const request = store.put(project);
      
      request.onsuccess = event => {
        const projectId = event.target.result;
        
        // IDが自動生成された場合は、オブジェクトにIDを設定
        if (!project.id) {
          project.id = projectId;
        }
        
        // 同期状態を「未同期」に設定
        syncStore.put({
          id: `project_${project.id}`,
          type: 'project',
          dataId: project.id,
          synced: false,
          timestamp: new Date().getTime()
        });
        
        console.log('案件データを保存しました:', project.id);
        resolve(project);
      };
      
      request.onerror = event => {
        console.error('案件保存エラー:', event.target.error);
        reject('案件保存エラー: ' + event.target.error);
      };
    });
  }
  
  /**
   * 日次データを取得する
   * @param {string} id - 取得するデータのID
   * @returns {Promise} 取得したデータ
   */
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
        console.error('データ取得エラー:', event.target.error);
        reject('データ取得エラー: ' + event.target.error);
      };
    });
  }
  
  /**
   * 日付範囲で日次データを取得する
   * @param {string} startDate - 開始日（YYYY-MM-DD形式）
   * @param {string} endDate - 終了日（YYYY-MM-DD形式）
   * @returns {Promise} 取得したデータの配列
   */
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
        console.error('データ取得エラー:', event.target.error);
        reject('データ取得エラー: ' + event.target.error);
      };
    });
  }
  
  /**
   * 担当者IDで日次データを取得する
   * @param {string} memberId - 担当者ID
   * @returns {Promise} 取得したデータの配列
   */
  getDailyDataByMember(memberId) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        this.initDb()
          .then(() => this.getDailyDataByMember(memberId))
          .then(resolve)
          .catch(reject);
        return;
      }
      
      const transaction = this.db.transaction(['dailyData'], 'readonly');
      const store = transaction.objectStore('dailyData');
      const index = store.index('memberId');
      const request = index.getAll(memberId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = event => {
        console.error('データ取得エラー:', event.target.error);
        reject('データ取得エラー: ' + event.target.error);
      };
    });
  }
  
  /**
   * 週次データを保存する
   * @param {Object} data - 保存するデータ
   * @returns {Promise} 保存操作の結果
   */
  saveWeeklyData(data) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        this.initDb()
          .then(() => this.saveWeeklyData(data))
          .then(resolve)
          .catch(reject);
        return;
      }
      
      const transaction = this.db.transaction(['weeklyData', 'syncStatus'], 'readwrite');
      const store = transaction.objectStore('weeklyData');
      const syncStore = transaction.objectStore('syncStatus');
      
      // データを保存
      const request = store.put(data);
      
      request.onsuccess = () => {
        // 同期状態を「未同期」に設定
        syncStore.put({
          id: `weekly_${data.period}`,
          type: 'weeklyData',
          dataId: data.period,
          synced: false,
          timestamp: new Date().getTime()
        });
        
        console.log('週次データを保存しました:', data.period);
        resolve(data);
      };
      
      request.onerror = event => {
        console.error('データ保存エラー:', event.target.error);
        reject('データ保存エラー: ' + event.target.error);
      };
    });
  }
  
  /**
   * 未同期データを取得する
   * @returns {Promise} 未同期データの配列
   */
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
        console.error('データ取得エラー:', event.target.error);
        reject('データ取得エラー: ' + event.target.error);
      };
    });
  }
  
  /**
   * 同期状態を更新する
   * @param {string} id - 同期状態のID
   * @returns {Promise} 更新操作の結果
   */
  markAsSynced(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        this.initDb()
          .then(() => this.markAsSynced(id))
          .then(resolve)
          .catch(reject);
        return;
      }
      
      const transaction = this.db.transaction(['syncStatus'], 'readwrite');
      const store = transaction.objectStore('syncStatus');
      
      // 同期状態を取得
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const syncStatus = getRequest.result;
        if (!syncStatus) {
          reject(`同期状態が見つかりません: ${id}`);
          return;
        }
        
        // 同期状態を更新
        syncStatus.synced = true;
        syncStatus.syncedAt = new Date().getTime();
        
        // 更新した同期状態を保存
        const putRequest = store.put(syncStatus);
        
        putRequest.onsuccess = () => {
          console.log('同期状態を更新しました:', id);
          resolve(syncStatus);
        };
        
        putRequest.onerror = event => {
          console.error('同期状態更新エラー:', event.target.error);
          reject('同期状態更新エラー: ' + event.target.error);
        };
      };
      
      getRequest.onerror = event => {
        console.error('同期状態取得エラー:', event.target.error);
        reject('同期状態取得エラー: ' + event.target.error);
      };
    });
  }
  
  /**
   * APIから取得したデータをローカルに保存する
   * @param {Object} data - APIから取得したデータ
   * @returns {Promise} 保存操作の結果
   */
  saveApiData(data) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.db) {
          await this.initDb();
        }
        
        const promises = [];
        
        // 週次データの保存
        if (data.weekly) {
          const weeklyPromises = data.weekly.map(weekData => this.saveWeeklyData(weekData));
          promises.push(Promise.all(weeklyPromises));
        }
        
        // 月次データの保存
        if (data.monthly) {
          const monthlyPromises = data.monthly.map(monthData => {
            return new Promise((resolve, reject) => {
              const transaction = this.db.transaction(['monthlyData'], 'readwrite');
              const store = transaction.objectStore('monthlyData');
              const request = store.put(monthData);
              
              request.onsuccess = () => resolve(monthData);
              request.onerror = event => reject(event.target.error);
            });
          });
          promises.push(Promise.all(monthlyPromises));
        }
        
        // 担当者データの保存
        if (data.members) {
          const membersPromises = data.members.map(member => {
            return new Promise((resolve, reject) => {
              const transaction = this.db.transaction(['members'], 'readwrite');
              const store = transaction.objectStore('members');
              const request = store.put(member);
              
              request.onsuccess = () => resolve(member);
              request.onerror = event => reject(event.target.error);
            });
          });
          promises.push(Promise.all(membersPromises));
        }
        
        await Promise.all(promises);
        console.log('APIデータをローカルに保存しました');
        resolve(true);
      } catch (error) {
        console.error('APIデータ保存エラー:', error);
        reject(error);
      }
    });
  }
  
  /**
   * ユーザー情報を保存する
   * @param {Object} user - ユーザー情報
   * @returns {Promise} 保存処理の結果
   */
  saveUser(user) {
    return new Promise((resolve, reject) => {
      if (!user || !user.uid) {
        reject(new Error('ユーザー情報が不正です'));
        return;
      }
      
      this.getDbInstance().then(db => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        
        // タイムスタンプを追加
        if (!user.createdAt) {
          user.createdAt = new Date().toISOString();
        }
        user.updatedAt = new Date().toISOString();
        
        const request = store.put(user);
        
        request.onsuccess = () => {
          console.log('ユーザー情報を保存しました:', user.uid);
          
          // ユーザー設定も保存
          if (user.settings) {
            this.saveUserSettings(user.uid, user.settings)
              .then(() => resolve(user))
              .catch(error => {
                console.error('ユーザー設定の保存に失敗しました:', error);
                resolve(user); // 設定保存失敗でもユーザー情報は保存できたとみなす
              });
          } else {
            resolve(user);
          }
        };
        
        request.onerror = event => {
          console.error('ユーザー情報の保存に失敗しました:', event.target.error);
          reject(event.target.error);
        };
      }).catch(error => {
        console.error('データベース接続エラー:', error);
        reject(error);
      });
    });
  }
  
  /**
   * ユーザー情報を取得する
   * @param {string} uid - ユーザーID
   * @returns {Promise<Object>} ユーザー情報
   */
  getUser(uid) {
    return new Promise((resolve, reject) => {
      if (!uid) {
        reject(new Error('ユーザーIDが指定されていません'));
        return;
      }
      
      this.getDbInstance().then(db => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.get(uid);
        
        request.onsuccess = event => {
          const user = event.target.result;
          if (user) {
            // ユーザー設定も取得
            this.getUserSettings(uid)
              .then(settings => {
                if (settings) {
                  user.settings = settings;
                }
                resolve(user);
              })
              .catch(error => {
                console.error('ユーザー設定の取得に失敗しました:', error);
                resolve(user); // 設定取得失敗でもユーザー情報は返す
              });
          } else {
            resolve(null);
          }
        };
        
        request.onerror = event => {
          console.error('ユーザー情報の取得に失敗しました:', event.target.error);
          reject(event.target.error);
        };
      }).catch(error => {
        console.error('データベース接続エラー:', error);
        reject(error);
      });
    });
  }
  
  /**
   * ユーザー設定を保存する
   * @param {string} uid - ユーザーID
   * @param {Object} settings - ユーザー設定
   * @returns {Promise} 保存処理の結果
   */
  saveUserSettings(uid, settings) {
    return new Promise((resolve, reject) => {
      if (!uid) {
        reject(new Error('ユーザーIDが指定されていません'));
        return;
      }
      
      this.getDbInstance().then(db => {
        const transaction = db.transaction(['userSettings'], 'readwrite');
        const store = transaction.objectStore('userSettings');
        
        const settingsObj = {
          uid: uid,
          ...settings,
          updatedAt: new Date().toISOString()
        };
        
        const request = store.put(settingsObj);
        
        request.onsuccess = () => {
          console.log('ユーザー設定を保存しました:', uid);
          resolve(settingsObj);
        };
        
        request.onerror = event => {
          console.error('ユーザー設定の保存に失敗しました:', event.target.error);
          reject(event.target.error);
        };
      }).catch(error => {
        console.error('データベース接続エラー:', error);
        reject(error);
      });
    });
  }
  
  /**
   * ユーザー設定を取得する
   * @param {string} uid - ユーザーID
   * @returns {Promise<Object>} ユーザー設定
   */
  getUserSettings(uid) {
    return new Promise((resolve, reject) => {
      if (!uid) {
        reject(new Error('ユーザーIDが指定されていません'));
        return;
      }
      
      this.getDbInstance().then(db => {
        const transaction = db.transaction(['userSettings'], 'readonly');
        const store = transaction.objectStore('userSettings');
        const request = store.get(uid);
        
        request.onsuccess = event => {
          const settings = event.target.result;
          resolve(settings || null);
        };
        
        request.onerror = event => {
          console.error('ユーザー設定の取得に失敗しました:', event.target.error);
          reject(event.target.error);
        };
      }).catch(error => {
        console.error('データベース接続エラー:', error);
        reject(error);
      });
    });
  }
  
  /**
   * 全ユーザーリストを取得する
   * @param {string} role - 絞り込むロール（オプション）
   * @returns {Promise<Array>} ユーザーリスト
   */
  getAllUsers(role = null) {
    return new Promise((resolve, reject) => {
      this.getDbInstance().then(db => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        
        let request;
        if (role) {
          const index = store.index('role');
          request = index.getAll(role);
        } else {
          request = store.getAll();
        }
        
        request.onsuccess = event => {
          const users = event.target.result;
          resolve(users || []);
        };
        
        request.onerror = event => {
          console.error('ユーザーリストの取得に失敗しました:', event.target.error);
          reject(event.target.error);
        };
      }).catch(error => {
        console.error('データベース接続エラー:', error);
        reject(error);
      });
    });
  }
  
  /**
   * ユーザーを削除する
   * @param {string} uid - ユーザーID
   * @returns {Promise} 削除処理の結果
   */
  deleteUser(uid) {
    return new Promise((resolve, reject) => {
      if (!uid) {
        reject(new Error('ユーザーIDが指定されていません'));
        return;
      }
      
      this.getDbInstance().then(db => {
        // ユーザー情報の削除
        const userTransaction = db.transaction(['users'], 'readwrite');
        const userStore = userTransaction.objectStore('users');
        const userRequest = userStore.delete(uid);
        
        userRequest.onsuccess = () => {
          console.log('ユーザー情報を削除しました:', uid);
          
          // ユーザー設定の削除
          const settingsTransaction = db.transaction(['userSettings'], 'readwrite');
          const settingsStore = settingsTransaction.objectStore('userSettings');
          const settingsRequest = settingsStore.delete(uid);
          
          settingsRequest.onsuccess = () => {
            console.log('ユーザー設定を削除しました:', uid);
            resolve(true);
          };
          
          settingsRequest.onerror = event => {
            console.error('ユーザー設定の削除に失敗しました:', event.target.error);
            resolve(true); // 設定削除失敗でもユーザー情報は削除できたとみなす
          };
        };
        
        userRequest.onerror = event => {
          console.error('ユーザー情報の削除に失敗しました:', event.target.error);
          reject(event.target.error);
        };
      }).catch(error => {
        console.error('データベース接続エラー:', error);
        reject(error);
      });
    });
  }
}

// グローバルインスタンスとしてエクスポート
window.dbService = new DbService(); 