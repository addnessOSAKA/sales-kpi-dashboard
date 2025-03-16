/**
 * 営業チームKPIダッシュボード 案件管理機能
 * 案件の作成、編集、削除、一覧表示機能を提供します
 */

class ProjectManager {
  constructor() {
    this.dbService = window.dbService;
    this.apiService = window.apiService;
    this.syncService = window.syncService;
    this.currentPage = 1;
    this.pageSize = 10;
    this.totalItems = 0;
    this.filteredProjects = [];
    this.members = [];
    
    this.initElements();
    this.bindEvents();
    this.loadMembers();
  }
  
  /**
   * DOM要素を初期化する
   */
  initElements() {
    // フォーム要素
    this.companyNameInput = document.getElementById('company-name');
    this.projectNameInput = document.getElementById('project-name');
    this.projectStatusSelect = document.getElementById('project-status');
    this.projectMemberSelect = document.getElementById('project-member');
    this.projectBudgetInput = document.getElementById('project-budget');
    this.projectDescriptionInput = document.getElementById('project-description');
    this.projectIdInput = document.getElementById('project-id');
    this.projectForm = document.getElementById('project-data-form');
    
    // フィルター要素
    this.statusFilter = document.getElementById('project-status-filter');
    this.memberFilter = document.getElementById('project-member-filter');
    this.searchInput = document.getElementById('project-search');
    this.filterBtn = document.getElementById('project-filter-btn');
    this.exportBtn = document.getElementById('export-projects-btn');
    
    // テーブル要素
    this.projectTable = document.getElementById('project-table');
    this.pagination = document.getElementById('project-pagination');
    
    // タブ要素
    this.tabButtons = document.querySelectorAll('.projects-tabs .tab-btn');
    this.tabContents = document.querySelectorAll('#projects-dashboard .tab-content');
  }
  
  /**
   * イベントリスナーをバインドする
   */
  bindEvents() {
    // フォーム送信イベント
    this.projectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProject();
    });
    
    // フィルターボタンクリックイベント
    this.filterBtn.addEventListener('click', () => {
      this.currentPage = 1;
      this.loadProjects();
    });
    
    // 検索入力イベント
    this.searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        this.currentPage = 1;
        this.loadProjects();
      }
    });
    
    // エクスポートボタンクリックイベント
    this.exportBtn.addEventListener('click', () => {
      this.exportProjects();
    });
    
    // タブ切り替えイベント
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        this.switchTab(tabId);
        
        if (tabId === 'project-list') {
          this.loadProjects();
        }
      });
    });
    
    // フォームリセットイベント
    this.projectForm.addEventListener('reset', () => {
      this.resetForm();
    });
  }
  
  /**
   * タブを切り替える
   * @param {string} tabId - 表示するタブのID
   */
  switchTab(tabId) {
    // アクティブなタブボタンを更新
    this.tabButtons.forEach(button => {
      if (button.getAttribute('data-tab') === tabId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // タブコンテンツの表示を切り替え
    this.tabContents.forEach(content => {
      if (content.id === tabId) {
        content.style.display = 'block';
      } else {
        content.style.display = 'none';
      }
    });
  }
  
  /**
   * 担当者リストを読み込む
   */
  loadMembers() {
    // APIから担当者リストを取得
    this.apiService.fetchMembers()
      .then(members => {
        this.members = members;
        
        // 担当者選択肢を生成
        const memberOptions = members.map(member => 
          `<option value="${member.id}">${member.name}</option>`
        ).join('');
        
        // 担当者選択肢を設定
        this.projectMemberSelect.innerHTML = '<option value="">担当者を選択</option>' + memberOptions;
        this.memberFilter.innerHTML = '<option value="">全員</option>' + memberOptions;
      })
      .catch(error => {
        console.error('担当者リスト取得エラー:', error);
        this.showNotification('担当者リストの取得に失敗しました', 'error');
      });
  }
  
  /**
   * 案件を保存する
   */
  saveProject() {
    // フォームからデータを取得
    const projectId = this.projectIdInput.value;
    const project = {
      companyName: this.companyNameInput.value,
      name: this.projectNameInput.value,
      status: this.projectStatusSelect.value,
      assignedTo: this.projectMemberSelect.value,
      budget: parseFloat(this.projectBudgetInput.value) || 0,
      description: this.projectDescriptionInput.value,
      updatedAt: new Date().toISOString()
    };
    
    // 編集モードの場合はIDを設定
    if (projectId) {
      project.id = parseInt(projectId, 10);
    }
    
    // データを検証
    if (!this.validateProject(project)) {
      return;
    }
    
    // データを保存
    this.dbService.saveProject(project)
      .then(savedProject => {
        this.showNotification('案件が保存されました', 'success');
        this.resetForm();
        this.switchTab('project-list');
        this.loadProjects();
        
        // オンライン時は即時同期を試行
        if (navigator.onLine) {
          this.syncService.syncData();
        }
      })
      .catch(error => {
        console.error('案件保存エラー:', error);
        this.showNotification('案件の保存に失敗しました', 'error');
      });
  }
  
  /**
   * 案件を検証する
   * @param {Object} project - 検証する案件
   * @returns {boolean} 検証結果
   */
  validateProject(project) {
    // 必須項目の検証
    if (!project.companyName) {
      this.showNotification('企業名を入力してください', 'error');
      return false;
    }
    
    if (!project.name) {
      this.showNotification('案件名を入力してください', 'error');
      return false;
    }
    
    if (!project.status) {
      this.showNotification('ステータスを選択してください', 'error');
      return false;
    }
    
    if (!project.assignedTo) {
      this.showNotification('担当者を選択してください', 'error');
      return false;
    }
    
    return true;
  }
  
  /**
   * フォームをリセットする
   */
  resetForm() {
    // フォームの入力をクリア
    this.projectIdInput.value = '';
    this.companyNameInput.value = '';
    this.projectNameInput.value = '';
    this.projectStatusSelect.value = 'initial';
    this.projectMemberSelect.value = '';
    this.projectBudgetInput.value = '';
    this.projectDescriptionInput.value = '';
    
    // 保存ボタンのテキストを変更
    const submitButton = this.projectForm.querySelector('button[type="submit"]');
    submitButton.textContent = '保存';
  }
  
  /**
   * 案件を読み込む
   */
  loadProjects() {
    // フィルター条件を取得
    const statusFilter = this.statusFilter.value;
    const memberFilter = this.memberFilter.value;
    const searchQuery = this.searchInput.value.toLowerCase();
    
    // データを取得
    this.dbService.getAllProjects()
      .then(projects => {
        // フィルタリング
        let filteredProjects = projects;
        
        if (statusFilter) {
          filteredProjects = filteredProjects.filter(project => project.status === statusFilter);
        }
        
        if (memberFilter) {
          filteredProjects = filteredProjects.filter(project => project.assignedTo === memberFilter);
        }
        
        if (searchQuery) {
          filteredProjects = filteredProjects.filter(project => 
            project.companyName.toLowerCase().includes(searchQuery) ||
            project.name.toLowerCase().includes(searchQuery) ||
            (project.description && project.description.toLowerCase().includes(searchQuery))
          );
        }
        
        // 作成日の降順でソート
        filteredProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        this.filteredProjects = filteredProjects;
        this.totalItems = filteredProjects.length;
        
        // ページネーションを更新
        this.updatePagination();
        
        // テーブルを更新
        this.updateProjectTable();
      })
      .catch(error => {
        console.error('案件取得エラー:', error);
        this.showNotification('案件の取得に失敗しました', 'error');
      });
  }
  
  /**
   * ページネーションを更新する
   */
  updatePagination() {
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    
    let paginationHtml = '';
    
    // 前のページへのリンク
    if (this.currentPage > 1) {
      paginationHtml += `<button class="pagination-btn" data-page="${this.currentPage - 1}">前へ</button>`;
    }
    
    // ページ番号
    for (let i = 1; i <= totalPages; i++) {
      if (i === this.currentPage) {
        paginationHtml += `<button class="pagination-btn active" data-page="${i}">${i}</button>`;
      } else {
        paginationHtml += `<button class="pagination-btn" data-page="${i}">${i}</button>`;
      }
    }
    
    // 次のページへのリンク
    if (this.currentPage < totalPages) {
      paginationHtml += `<button class="pagination-btn" data-page="${this.currentPage + 1}">次へ</button>`;
    }
    
    // ページネーションを設定
    this.pagination.innerHTML = paginationHtml;
    
    // ページネーションボタンのイベントリスナーを設定
    const paginationButtons = this.pagination.querySelectorAll('.pagination-btn');
    paginationButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.currentPage = parseInt(button.getAttribute('data-page'), 10);
        this.updatePagination();
        this.updateProjectTable();
      });
    });
  }
  
  /**
   * 案件テーブルを更新する
   */
  updateProjectTable() {
    // 現在のページのデータを取得
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.totalItems);
    const pageData = this.filteredProjects.slice(startIndex, endIndex);
    
    // テーブル行を生成
    let tableHtml = '';
    
    if (pageData.length === 0) {
      tableHtml = '<tr><td colspan="8" class="no-data">データがありません</td></tr>';
    } else {
      pageData.forEach(project => {
        // 担当者名を取得
        const member = this.members.find(m => m.id === project.assignedTo);
        const memberName = member ? member.name : project.assignedTo;
        
        // ステータス名を取得
        const statusMap = {
          initial: '初回接触',
          meeting: '面談',
          proposal: '提案',
          negotiation: '交渉',
          contract: '成約',
          lost: '失注'
        };
        const statusName = statusMap[project.status] || project.status;
        
        // 日付をフォーマット
        const createdDate = new Date(project.createdAt);
        const formattedCreatedDate = `${createdDate.getFullYear()}/${createdDate.getMonth() + 1}/${createdDate.getDate()}`;
        
        let formattedUpdatedDate = '';
        if (project.updatedAt) {
          const updatedDate = new Date(project.updatedAt);
          formattedUpdatedDate = `${updatedDate.getFullYear()}/${updatedDate.getMonth() + 1}/${updatedDate.getDate()}`;
        }
        
        // 予算をフォーマット
        const formattedBudget = project.budget ? new Intl.NumberFormat('ja-JP', {
          style: 'currency',
          currency: 'JPY'
        }).format(project.budget) : '';
        
        tableHtml += `
          <tr data-id="${project.id}">
            <td>${project.companyName}</td>
            <td>${project.name}</td>
            <td>${statusName}</td>
            <td>${memberName}</td>
            <td>${formattedBudget}</td>
            <td>${formattedCreatedDate}</td>
            <td>${formattedUpdatedDate}</td>
            <td>
              <button class="btn edit-btn" data-id="${project.id}">編集</button>
              <button class="btn delete-btn" data-id="${project.id}">削除</button>
            </td>
          </tr>
        `;
      });
    }
    
    // テーブル本体を更新
    this.projectTable.querySelector('tbody').innerHTML = tableHtml;
    
    // 編集ボタンのイベントリスナーを設定
    const editButtons = this.projectTable.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        this.editProject(id);
      });
    });
    
    // 削除ボタンのイベントリスナーを設定
    const deleteButtons = this.projectTable.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        this.deleteProject(id);
      });
    });
  }
  
  /**
   * 案件を編集する
   * @param {string} id - 編集する案件のID
   */
  editProject(id) {
    // データを取得
    this.dbService.getProject(id)
      .then(project => {
        if (!project) {
          this.showNotification('案件が見つかりません', 'error');
          return;
        }
        
        // フォームに値を設定
        this.projectIdInput.value = project.id;
        this.companyNameInput.value = project.companyName;
        this.projectNameInput.value = project.name;
        this.projectStatusSelect.value = project.status;
        this.projectMemberSelect.value = project.assignedTo;
        this.projectBudgetInput.value = project.budget || '';
        this.projectDescriptionInput.value = project.description || '';
        
        // 編集モードに切り替え
        this.switchTab('project-form');
        
        // 保存ボタンのテキストを変更
        const submitButton = this.projectForm.querySelector('button[type="submit"]');
        submitButton.textContent = '更新';
      })
      .catch(error => {
        console.error('案件取得エラー:', error);
        this.showNotification('案件の取得に失敗しました', 'error');
      });
  }
  
  /**
   * 案件を削除する
   * @param {string} id - 削除する案件のID
   */
  deleteProject(id) {
    if (!confirm('この案件を削除してもよろしいですか？')) {
      return;
    }
    
    // データを削除
    this.dbService.deleteProject(id)
      .then(() => {
        this.showNotification('案件が削除されました', 'success');
        this.loadProjects();
      })
      .catch(error => {
        console.error('案件削除エラー:', error);
        this.showNotification('案件の削除に失敗しました', 'error');
      });
  }
  
  /**
   * 案件をエクスポートする
   */
  exportProjects() {
    if (this.filteredProjects.length === 0) {
      this.showNotification('エクスポートするデータがありません', 'error');
      return;
    }
    
    // エクスポートユーティリティを使用してエクスポート
    if (window.exportUtils) {
      window.exportUtils.exportProjectsToCsv(this.filteredProjects, this.members);
    } else {
      this.showNotification('エクスポート機能が利用できません', 'error');
    }
  }
  
  /**
   * 通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {string} type - 通知タイプ（'success', 'error', 'info'）
   */
  showNotification(message, type = 'info') {
    if (window.notificationUtils) {
      window.notificationUtils.show(message, type);
    } else {
      alert(`${type}: ${message}`);
    }
  }
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
  window.projectManager = new ProjectManager();
}); 