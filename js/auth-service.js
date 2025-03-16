/**
 * 営業チームKPIダッシュボード 認証サービス
 * ユーザー認証とセッション管理を担当するサービス
 */

class AuthService {
  constructor() {
    this.dbService = new DBService();
    this.notificationUtils = new NotificationUtils();
    this.currentUser = null;
    this.authStateListeners = [];
    
    // Firebase設定
    this.firebaseConfig = window.appConfig.firebase || {
      apiKey: "",
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: ""
    };
    
    this.initFirebase();
    this.initAuthUI();
    this.checkAuthState();
  }
  
  /**
   * Firebaseの初期化
   */
  initFirebase() {
    // Firebase SDKが読み込まれているか確認
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDKが読み込まれていません。認証機能は利用できません。');
      return;
    }
    
    // Firebase初期化（既に初期化されていない場合）
    if (!firebase.apps.length) {
      firebase.initializeApp(this.firebaseConfig);
    }
    
    this.auth = firebase.auth();
    
    // 認証状態の変更を監視
    this.auth.onAuthStateChanged(user => {
      this.handleAuthStateChange(user);
    });
  }
  
  /**
   * 認証UIの初期化
   */
  initAuthUI() {
    // FirebaseUI SDKが読み込まれているか確認
    if (typeof firebaseui === 'undefined') {
      console.error('FirebaseUI SDKが読み込まれていません。認証UIは利用できません。');
      return;
    }
    
    try {
      // FirebaseUIの初期化
      if (!this.ui && firebase.auth) {
        this.ui = new firebaseui.auth.AuthUI(firebase.auth());
      }
      
      // ログインボタンのイベントリスナー
      const loginBtn = document.getElementById('login-btn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          this.showLoginModal();
        });
      }
      
      // ログアウトボタンのイベントリスナー
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          this.logout();
        });
      }
      
      // プロファイルボタンのイベントリスナー
      const profileBtn = document.getElementById('user-profile-btn');
      if (profileBtn) {
        profileBtn.addEventListener('click', () => {
          this.showUserProfile();
        });
      }
      
      // プロファイル設定保存ボタンのイベントリスナー
      const profileSettingsForm = document.getElementById('profile-settings-form');
      if (profileSettingsForm) {
        profileSettingsForm.addEventListener('submit', (event) => {
          event.preventDefault();
          this.saveUserSettings();
        });
      }
      
      console.log('認証UIが初期化されました');
    } catch (error) {
      console.error('認証UI初期化エラー:', error);
    }
  }
  
  /**
   * 認証状態の変更を処理
   * @param {Object} user - 認証されたユーザー情報
   */
  handleAuthStateChange(user) {
    this.currentUser = user;
    
    // UIの更新
    this.updateAuthUI();
    
    // リスナーに通知
    this.notifyAuthStateListeners();
    
    if (user) {
      // ユーザー情報をローカルDBに保存
      this.saveUserToLocalDB(user);
    }
  }
  
  /**
   * ログイン成功時の処理
   * @param {Object} authResult - 認証結果
   */
  handleSignInSuccess(authResult) {
    const user = authResult.user;
    const isNewUser = authResult.additionalUserInfo.isNewUser;
    
    if (isNewUser) {
      // 新規ユーザーの場合、初期設定を行う
      this.setupNewUser(user);
    }
    
    // ログイン成功通知
    this.notificationUtils.show('ログイン成功', `${user.displayName || user.email}としてログインしました`, 'success');
    
    // モーダルを閉じる
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
      authModal.style.display = 'none';
    }
  }
  
  /**
   * 新規ユーザーの初期設定
   * @param {Object} user - ユーザー情報
   */
  async setupNewUser(user) {
    try {
      // ユーザープロファイルの作成
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        role: 'user', // デフォルトロール
        createdAt: new Date().toISOString(),
        settings: {
          theme: 'light',
          notifications: true,
          defaultView: 'weekly'
        }
      };
      
      // ローカルDBに保存
      await this.dbService.saveUser(userProfile);
      
      // サーバーにも保存（オンライン時）
      if (navigator.onLine) {
        // APIサービスを使用してサーバーに保存
        // 実装は省略
      }
    } catch (error) {
      console.error('新規ユーザー設定エラー:', error);
      this.notificationUtils.show('エラー', 'ユーザー設定の保存中にエラーが発生しました', 'error');
    }
  }
  
  /**
   * ユーザー情報をローカルDBに保存
   * @param {Object} user - ユーザー情報
   */
  async saveUserToLocalDB(user) {
    try {
      // 既存のユーザープロファイルを取得
      let userProfile = await this.dbService.getUser(user.uid);
      
      if (!userProfile) {
        // プロファイルが存在しない場合は新規作成
        userProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          role: 'user',
          createdAt: new Date().toISOString(),
          settings: {
            theme: 'light',
            notifications: true,
            defaultView: 'weekly'
          }
        };
      } else {
        // 既存のプロファイルを更新
        userProfile.email = user.email;
        userProfile.displayName = user.displayName || userProfile.displayName;
        userProfile.photoURL = user.photoURL || userProfile.photoURL;
        userProfile.lastLoginAt = new Date().toISOString();
      }
      
      // ローカルDBに保存
      await this.dbService.saveUser(userProfile);
    } catch (error) {
      console.error('ユーザー情報保存エラー:', error);
    }
  }
  
  /**
   * 認証状態に基づいてUIを更新
   */
  updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfileBtn = document.getElementById('user-profile-btn');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    
    if (this.currentUser) {
      // ログイン状態
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'block';
      if (userProfileBtn) userProfileBtn.style.display = 'block';
      
      // ユーザー情報表示
      if (userAvatar) {
        userAvatar.src = this.currentUser.photoURL || 'images/default-avatar.png';
        userAvatar.style.display = 'block';
      }
      
      if (userName) {
        userName.textContent = this.currentUser.displayName || this.currentUser.email;
        userName.style.display = 'block';
      }
      
      // 権限に基づいた要素の表示/非表示
      this.updateUIByRole();
    } else {
      // 未ログイン状態
      if (loginBtn) loginBtn.style.display = 'block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (userProfileBtn) userProfileBtn.style.display = 'none';
      
      if (userAvatar) userAvatar.style.display = 'none';
      if (userName) userName.style.display = 'none';
    }
  }
  
  /**
   * ユーザーロールに基づいてUIを更新
   */
  async updateUIByRole() {
    if (!this.currentUser) return;
    
    try {
      // ユーザープロファイルを取得
      const userProfile = await this.dbService.getUser(this.currentUser.uid);
      
      if (!userProfile) return;
      
      const adminElements = document.querySelectorAll('.admin-only');
      const managerElements = document.querySelectorAll('.manager-only');
      
      // 管理者要素の表示/非表示
      adminElements.forEach(el => {
        el.style.display = userProfile.role === 'admin' ? 'block' : 'none';
      });
      
      // マネージャー要素の表示/非表示（マネージャーと管理者に表示）
      managerElements.forEach(el => {
        el.style.display = ['manager', 'admin'].includes(userProfile.role) ? 'block' : 'none';
      });
    } catch (error) {
      console.error('ロールベースUI更新エラー:', error);
    }
  }
  
  /**
   * ログインモーダルを表示
   */
  showLoginModal() {
    const authModal = document.getElementById('auth-modal');
    if (!authModal) {
      console.error('認証モーダルが見つかりません');
      this.notificationUtils.showError('認証モーダルが見つかりません');
      return;
    }
    
    // モーダルを表示
    authModal.style.display = 'block';
    
    // FirebaseUI設定
    const uiContainer = document.getElementById('firebaseui-auth-container');
    if (!uiContainer) {
      console.error('Firebase UI コンテナが見つかりません');
      return;
    }
    
    if (this.ui) {
      const uiConfig = {
        signInOptions: [
          firebase.auth.GoogleAuthProvider.PROVIDER_ID,
          firebase.auth.EmailAuthProvider.PROVIDER_ID
        ],
        signInFlow: 'popup',
        callbacks: {
          signInSuccessWithAuthResult: (authResult) => {
            this.handleSignInSuccess(authResult);
            authModal.style.display = 'none';
            return false; // リダイレクトしない
          },
          signInFailure: (error) => {
            console.error('ログインエラー:', error);
            this.notificationUtils.showError('ログインに失敗しました');
          }
        },
        tosUrl: '#',
        privacyPolicyUrl: '#'
      };
      
      // FirebaseUIを開始
      this.ui.start('#firebaseui-auth-container', uiConfig);
    }
    
    // 閉じるボタンのイベントリスナー
    const closeBtn = authModal.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        authModal.style.display = 'none';
      };
    }
    
    // モーダル外クリックで閉じる
    window.onclick = (event) => {
      if (event.target === authModal) {
        authModal.style.display = 'none';
      }
    };
  }
  
  /**
   * ログアウト処理
   */
  async logout() {
    try {
      await this.auth.signOut();
      this.notificationUtils.show('ログアウト', 'ログアウトしました', 'info');
      
      // ローカルストレージからセッション情報をクリア
      localStorage.removeItem('auth_session');
      
      // UIの更新
      this.updateAuthUI();
    } catch (error) {
      console.error('ログアウトエラー:', error);
      this.notificationUtils.show('エラー', 'ログアウト中にエラーが発生しました', 'error');
    }
  }
  
  /**
   * 現在のユーザー情報を取得
   * @returns {Object|null} ユーザー情報
   */
  getCurrentUser() {
    return this.currentUser;
  }
  
  /**
   * 現在のユーザーのプロファイルを取得
   * @returns {Promise<Object|null>} ユーザープロファイル
   */
  async getCurrentUserProfile() {
    if (!this.currentUser) return null;
    
    try {
      return await this.dbService.getUser(this.currentUser.uid);
    } catch (error) {
      console.error('ユーザープロファイル取得エラー:', error);
      return null;
    }
  }
  
  /**
   * 認証状態の変更リスナーを追加
   * @param {Function} listener - コールバック関数
   */
  addAuthStateListener(listener) {
    if (typeof listener === 'function') {
      this.authStateListeners.push(listener);
      
      // 現在の認証状態を即座に通知
      listener(this.currentUser);
    }
  }
  
  /**
   * 認証状態の変更リスナーを削除
   * @param {Function} listener - 削除するリスナー
   */
  removeAuthStateListener(listener) {
    const index = this.authStateListeners.indexOf(listener);
    if (index !== -1) {
      this.authStateListeners.splice(index, 1);
    }
  }
  
  /**
   * すべての認証状態リスナーに通知
   */
  notifyAuthStateListeners() {
    this.authStateListeners.forEach(listener => {
      try {
        listener(this.currentUser);
      } catch (error) {
        console.error('認証状態リスナーエラー:', error);
      }
    });
  }
  
  /**
   * 認証状態をチェック
   */
  checkAuthState() {
    // ローカルストレージからセッション情報を取得
    const sessionData = localStorage.getItem('auth_session');
    
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        
        // セッションの有効期限をチェック
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          // セッションが有効な場合、ユーザー情報を設定
          this.currentUser = session.user;
          this.updateAuthUI();
          this.notifyAuthStateListeners();
        } else {
          // 期限切れの場合、セッション情報を削除
          localStorage.removeItem('auth_session');
        }
      } catch (error) {
        console.error('セッションデータ解析エラー:', error);
        localStorage.removeItem('auth_session');
      }
    }
  }
  
  /**
   * ユーザーが特定のロールを持っているか確認
   * @param {string} role - 確認するロール
   * @returns {Promise<boolean>} ロールを持っているかどうか
   */
  async hasRole(role) {
    if (!this.currentUser) return false;
    
    try {
      const userProfile = await this.dbService.getUser(this.currentUser.uid);
      
      if (!userProfile) return false;
      
      // 管理者は全ての権限を持つ
      if (userProfile.role === 'admin') return true;
      
      // マネージャーは一部の権限を持つ
      if (userProfile.role === 'manager' && ['user', 'manager'].includes(role)) {
        return true;
      }
      
      // それ以外は完全一致のみ
      return userProfile.role === role;
    } catch (error) {
      console.error('ロール確認エラー:', error);
      return false;
    }
  }
  
  /**
   * ユーザープロファイルを更新
   * @param {Object} profileData - 更新するプロファイルデータ
   * @returns {Promise<boolean>} 更新成功したかどうか
   */
  async updateUserProfile(profileData) {
    if (!this.currentUser) return false;
    
    try {
      // 現在のプロファイルを取得
      const currentProfile = await this.dbService.getUser(this.currentUser.uid);
      
      if (!currentProfile) return false;
      
      // プロファイルを更新
      const updatedProfile = {
        ...currentProfile,
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      
      // ローカルDBに保存
      await this.dbService.saveUser(updatedProfile);
      
      // サーバーにも保存（オンライン時）
      if (navigator.onLine) {
        // APIサービスを使用してサーバーに保存
        // 実装は省略
      }
      
      this.notificationUtils.show('プロファイル更新', 'プロファイルが更新されました', 'success');
      return true;
    } catch (error) {
      console.error('プロファイル更新エラー:', error);
      this.notificationUtils.show('エラー', 'プロファイル更新中にエラーが発生しました', 'error');
      return false;
    }
  }
  
  /**
   * ユーザープロファイルモーダルを表示
   */
  async showUserProfile() {
    const profileModal = document.getElementById('profile-modal');
    if (!profileModal) {
      console.error('プロファイルモーダルが見つかりません');
      this.notificationUtils.showError('プロファイルモーダルが見つかりません');
      return;
    }
    
    const user = this.getCurrentUser();
    if (!user) {
      this.notificationUtils.showWarning('ログインしていません');
      return;
    }
    
    try {
      // プロファイル情報を設定
      const profileAvatar = document.getElementById('profile-avatar');
      const profileName = document.getElementById('profile-name');
      const profileEmail = document.getElementById('profile-email');
      const profileRole = document.getElementById('profile-role');
      
      if (profileAvatar) {
        profileAvatar.src = user.photoURL || 'images/default-avatar.png';
      }
      
      if (profileName) {
        profileName.textContent = user.displayName || user.email;
      }
      
      if (profileEmail) {
        profileEmail.textContent = user.email;
      }
      
      // ユーザープロファイルを取得して表示
      const profile = await this.getCurrentUserProfile();
      
      if (profile && profileRole) {
        const roleNames = {
          'admin': '管理者',
          'manager': 'マネージャー',
          'user': '一般ユーザー'
        };
        const roleSpan = profileRole.querySelector('span');
        if (roleSpan) {
          roleSpan.textContent = roleNames[profile.role] || '一般ユーザー';
        }
      }
      
      // 設定フォームに値を設定
      const themeSelect = document.getElementById('theme-select');
      const defaultViewSelect = document.getElementById('default-view-select');
      const notificationsCheckbox = document.getElementById('notifications-checkbox');
      
      if (profile && profile.settings) {
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
      profileModal.style.display = 'block';
      
      // 閉じるボタンのイベントリスナー
      const closeBtn = profileModal.querySelector('.close-btn');
      if (closeBtn) {
        closeBtn.onclick = () => {
          profileModal.style.display = 'none';
        };
      }
      
      // モーダル外クリックで閉じる
      window.onclick = (event) => {
        if (event.target === profileModal) {
          profileModal.style.display = 'none';
        }
      };
    } catch (error) {
      console.error('プロファイル表示エラー:', error);
      this.notificationUtils.showError('プロファイル情報の表示に失敗しました');
    }
  }
  
  /**
   * ユーザー設定を保存
   */
  async saveUserSettings() {
    const user = this.getCurrentUser();
    if (!user) {
      this.notificationUtils.showWarning('ログインしていません');
      return;
    }
    
    try {
      const themeSelect = document.getElementById('theme-select');
      const defaultViewSelect = document.getElementById('default-view-select');
      const notificationsCheckbox = document.getElementById('notifications-checkbox');
      
      const settings = {
        theme: themeSelect ? themeSelect.value : 'light',
        defaultView: defaultViewSelect ? defaultViewSelect.value : 'weekly',
        notifications: notificationsCheckbox ? notificationsCheckbox.checked : true
      };
      
      // プロファイルを取得
      const profile = await this.getCurrentUserProfile();
      if (!profile) {
        throw new Error('プロファイルが見つかりません');
      }
      
      // 設定を更新
      profile.settings = settings;
      
      // プロファイルを保存
      await this.updateUserProfile(profile);
      
      // 設定を適用
      this.applyUserSettings(settings);
      
      // 通知
      this.notificationUtils.showSuccess('設定が保存されました');
      
      // モーダルを閉じる
      const profileModal = document.getElementById('profile-modal');
      if (profileModal) {
        profileModal.style.display = 'none';
      }
      
      return true;
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      this.notificationUtils.showError('設定の保存に失敗しました');
      return false;
    }
  }
  
  /**
   * ユーザー設定を適用
   * @param {Object} settings - ユーザー設定
   */
  applyUserSettings(settings) {
    if (!settings) return;
    
    try {
      console.log('ユーザー設定を適用します:', settings);
      
      // テーマの適用
      if (settings.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
        
        if (settings.theme === 'dark') {
          document.body.classList.add('dark-theme');
        } else {
          document.body.classList.remove('dark-theme');
        }
        
        // システム設定に合わせる場合
        if (settings.theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            document.body.classList.add('dark-theme');
          } else {
            document.body.classList.remove('dark-theme');
          }
        }
      }
      
      // デフォルトビューの適用
      if (settings.defaultView) {
        const viewSelector = document.getElementById('viewSelector');
        if (viewSelector && viewSelector.value !== settings.defaultView) {
          viewSelector.value = settings.defaultView;
          
          // ビュー変更イベントを発火
          const event = new Event('change');
          viewSelector.dispatchEvent(event);
        }
      }
      
      // 通知設定の適用
      if (settings.notifications !== undefined) {
        if (settings.notifications && Notification.permission !== 'granted') {
          Notification.requestPermission();
        }
      }
      
      console.log('ユーザー設定が適用されました');
    } catch (error) {
      console.error('設定適用エラー:', error);
    }
  }
}

// グローバルインスタンスを作成
window.authService = new AuthService(); 