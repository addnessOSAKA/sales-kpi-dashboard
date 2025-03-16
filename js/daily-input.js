/**
 * 営業チームKPIダッシュボード 日次データ入力機能
 * 日次の営業活動データの入力、保存、表示機能を提供します
 */

class DailyInputManager {
  constructor() {
    this.dbService = window.dbService;
    this.apiService = window.apiService;
    this.syncService = window.syncService;
    this.currentPage = 1;
    this.pageSize = 10;
    this.totalItems = 0;
    this.filteredData = [];
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
    this.dateInput = document.getElementById('date-input');
    this.memberSelect = document.getElementById('member-select');
    this.approachInput = document.getElementById('approach-input');
    this.meetingInput = document.getElementById('meeting-input');
    this.negotiationInput = document.getElementById('negotiation-input');
    this.proposalInput = document.getElementById('proposal-input');
    this.contractInput = document.getElementById('contract-input');
    this.amountInput = document.getElementById('amount-input');
    this.notesInput = document.getElementById('notes-input');
    this.dailyDataForm = document.getElementById('daily-data-form');
    
    // フィルター要素
    this.dateRangeStart = document.getElementById('date-range-start');
    this.dateRangeEnd = document.getElementById('date-range-end');
    this.memberFilter = document.getElementById('member-filter');
    this.filterBtn = document.getElementById('filter-btn');
    this.exportDailyBtn = document.getElementById('export-daily-btn');
    
    // テーブル要素
    this.dailyDataTable = document.getElementById('daily-data-table');
    this.pagination = document.getElementById('pagination');
    
    // CSVアップロード要素
    this.csvUploadBtn = document.getElementById('csv-upload-btn');
    this.csvFileInput = document.getElementById('csv-file-input');
    
    // タブ要素
    this.tabButtons = document.querySelectorAll('.daily-data-tabs .tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');
    
    // 今日の日付をデフォルト値に設定
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    this.dateInput.value = formattedDate;
    
    // 日付範囲のデフォルト値を設定（過去30日間）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    this.dateRangeStart.value = thirtyDaysAgo.toISOString().split('T')[0];
    this.dateRangeEnd.value = formattedDate;
  }
  
  /**
   * イベントリスナーをバインドする
   */
  bindEvents() {
    // フォーム送信イベント
    this.dailyDataForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveDailyData();
    });
    
    // フィルターボタンクリックイベント
    this.filterBtn.addEventListener('click', () => {
      this.currentPage = 1;
      this.loadDailyData();
    });
    
    // エクスポートボタンクリックイベント
    this.exportDailyBtn.addEventListener('click', () => {
      this.exportDailyData();
    });
    
    // CSVアップロードボタンクリックイベント
    this.csvUploadBtn.addEventListener('click', () => {
      this.csvFileInput.click();
    });
    
    // CSVファイル選択イベント
    this.csvFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.importCsvData(e.target.files[0]);
      }
    });
    
    // タブ切り替えイベント
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        this.switchTab(tabId);
        
        if (tabId === 'data-list') {
          this.loadDailyData();
        }
      });
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
        this.memberSelect.innerHTML = '<option value="">担当者を選択</option>' + memberOptions;
        this.memberFilter.innerHTML = '<option value="">全員</option>' + memberOptions;
      })
      .catch(error => {
        console.error('担当者リスト取得エラー:', error);
        this.showNotification('担当者リストの取得に失敗しました', 'error');
      });
  }
  
  /**
   * 日次データを保存する
   */
  saveDailyData() {
    // フォームからデータを取得
    const data = {
      date: this.dateInput.value,
      memberId: this.memberSelect.value,
      approach: parseInt(this.approachInput.value, 10),
      meeting: parseInt(this.meetingInput.value, 10),
      negotiation: parseInt(this.negotiationInput.value, 10),
      proposal: parseInt(this.proposalInput.value, 10),
      contract: parseInt(this.contractInput.value, 10),
      amount: parseFloat(this.amountInput.value),
      notes: this.notesInput.value,
      timestamp: new Date().toISOString()
    };
    
    // データを検証
    if (!this.validateDailyData(data)) {
      return;
    }
    
    // データを保存
    this.dbService.saveDailyData(data)
      .then(savedData => {
        this.showNotification('データが保存されました', 'success');
        this.resetForm();
        
        // オンライン時は即時同期を試行
        if (navigator.onLine) {
          this.syncService.syncData();
        }
      })
      .catch(error => {
        console.error('データ保存エラー:', error);
        this.showNotification('データの保存に失敗しました', 'error');
      });
  }
  
  /**
   * 日次データを検証する
   * @param {Object} data - 検証するデータ
   * @returns {boolean} 検証結果
   */
  validateDailyData(data) {
    // 必須項目の検証
    if (!data.date) {
      this.showNotification('日付を入力してください', 'error');
      return false;
    }
    
    if (!data.memberId) {
      this.showNotification('担当者を選択してください', 'error');
      return false;
    }
    
    // 数値の検証
    const numericFields = ['approach', 'meeting', 'negotiation', 'proposal', 'contract', 'amount'];
    for (const field of numericFields) {
      if (isNaN(data[field]) || data[field] < 0) {
        this.showNotification(`${field}は0以上の数値を入力してください`, 'error');
        return false;
      }
    }
    
    // 論理的な検証（例：面談数はアプローチ数以下、など）
    if (data.meeting > data.approach) {
      this.showNotification('面談数はアプローチ数以下である必要があります', 'error');
      return false;
    }
    
    if (data.negotiation > data.meeting) {
      this.showNotification('商談数は面談数以下である必要があります', 'error');
      return false;
    }
    
    if (data.proposal > data.negotiation) {
      this.showNotification('提案数は商談数以下である必要があります', 'error');
      return false;
    }
    
    if (data.contract > data.proposal) {
      this.showNotification('契約数は提案数以下である必要があります', 'error');
      return false;
    }
    
    return true;
  }
  
  /**
   * フォームをリセットする
   */
  resetForm() {
    // 日付と担当者以外の入力をクリア
    this.approachInput.value = '';
    this.meetingInput.value = '';
    this.negotiationInput.value = '';
    this.proposalInput.value = '';
    this.contractInput.value = '';
    this.amountInput.value = '';
    this.notesInput.value = '';
    
    // フォーカスを最初の入力フィールドに設定
    this.approachInput.focus();
  }
  
  /**
   * 日次データを読み込む
   */
  loadDailyData() {
    const startDate = this.dateRangeStart.value;
    const endDate = this.dateRangeEnd.value;
    const memberId = this.memberFilter.value;
    
    // 日付範囲の検証
    if (!startDate || !endDate) {
      this.showNotification('日付範囲を指定してください', 'error');
      return;
    }
    
    if (startDate > endDate) {
      this.showNotification('開始日は終了日以前である必要があります', 'error');
      return;
    }
    
    // データを取得
    this.dbService.getDailyDataByDateRange(startDate, endDate)
      .then(data => {
        // 担当者でフィルタリング
        if (memberId) {
          data = data.filter(item => item.memberId === memberId);
        }
        
        // 日付の降順でソート
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        this.filteredData = data;
        this.totalItems = data.length;
        
        // ページネーションを更新
        this.updatePagination();
        
        // テーブルを更新
        this.updateDailyDataTable();
      })
      .catch(error => {
        console.error('データ取得エラー:', error);
        this.showNotification('データの取得に失敗しました', 'error');
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
        this.updateDailyDataTable();
      });
    });
  }
  
  /**
   * 日次データテーブルを更新する
   */
  updateDailyDataTable() {
    // 現在のページのデータを取得
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.totalItems);
    const pageData = this.filteredData.slice(startIndex, endIndex);
    
    // テーブル行を生成
    let tableHtml = '';
    
    if (pageData.length === 0) {
      tableHtml = '<tr><td colspan="9" class="no-data">データがありません</td></tr>';
    } else {
      pageData.forEach(item => {
        // 担当者名を取得
        const member = this.members.find(m => m.id === item.memberId);
        const memberName = member ? member.name : item.memberId;
        
        // 日付をフォーマット
        const date = new Date(item.date);
        const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        
        // 金額をフォーマット
        const formattedAmount = new Intl.NumberFormat('ja-JP', {
          style: 'currency',
          currency: 'JPY'
        }).format(item.amount);
        
        tableHtml += `
          <tr data-id="${item.id}">
            <td>${formattedDate}</td>
            <td>${memberName}</td>
            <td>${item.approach}</td>
            <td>${item.meeting}</td>
            <td>${item.negotiation}</td>
            <td>${item.proposal}</td>
            <td>${item.contract}</td>
            <td>${formattedAmount}</td>
            <td>
              <button class="btn edit-btn" data-id="${item.id}">編集</button>
              <button class="btn delete-btn" data-id="${item.id}">削除</button>
            </td>
          </tr>
        `;
      });
    }
    
    // テーブル本体を更新
    this.dailyDataTable.querySelector('tbody').innerHTML = tableHtml;
    
    // 編集ボタンのイベントリスナーを設定
    const editButtons = this.dailyDataTable.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        this.editDailyData(id);
      });
    });
    
    // 削除ボタンのイベントリスナーを設定
    const deleteButtons = this.dailyDataTable.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        this.deleteDailyData(id);
      });
    });
  }
  
  /**
   * 日次データを編集する
   * @param {string} id - 編集するデータのID
   */
  editDailyData(id) {
    // データを取得
    this.dbService.getDailyData(id)
      .then(data => {
        if (!data) {
          this.showNotification('データが見つかりません', 'error');
          return;
        }
        
        // フォームに値を設定
        this.dateInput.value = data.date;
        this.memberSelect.value = data.memberId;
        this.approachInput.value = data.approach;
        this.meetingInput.value = data.meeting;
        this.negotiationInput.value = data.negotiation;
        this.proposalInput.value = data.proposal;
        this.contractInput.value = data.contract;
        this.amountInput.value = data.amount;
        this.notesInput.value = data.notes || '';
        
        // 編集モードに切り替え
        this.dailyDataForm.setAttribute('data-edit-id', id);
        this.switchTab('input-form');
        
        // 保存ボタンのテキストを変更
        const submitButton = this.dailyDataForm.querySelector('button[type="submit"]');
        submitButton.textContent = '更新';
      })
      .catch(error => {
        console.error('データ取得エラー:', error);
        this.showNotification('データの取得に失敗しました', 'error');
      });
  }
  
  /**
   * 日次データを削除する
   * @param {string} id - 削除するデータのID
   */
  deleteDailyData(id) {
    if (!confirm('このデータを削除してもよろしいですか？')) {
      return;
    }
    
    // データを削除
    this.dbService.deleteDailyData(id)
      .then(() => {
        this.showNotification('データが削除されました', 'success');
        this.loadDailyData();
      })
      .catch(error => {
        console.error('データ削除エラー:', error);
        this.showNotification('データの削除に失敗しました', 'error');
      });
  }
  
  /**
   * 日次データをエクスポートする
   */
  exportDailyData() {
    if (this.filteredData.length === 0) {
      this.showNotification('エクスポートするデータがありません', 'error');
      return;
    }
    
    // CSVデータを生成
    const headers = ['日付', '担当者', 'アプローチ数', '面談数', '商談数', '提案数', '契約数', '契約金額', '備考'];
    
    const csvData = this.filteredData.map(item => {
      // 担当者名を取得
      const member = this.members.find(m => m.id === item.memberId);
      const memberName = member ? member.name : item.memberId;
      
      return [
        item.date,
        memberName,
        item.approach,
        item.meeting,
        item.negotiation,
        item.proposal,
        item.contract,
        item.amount,
        item.notes || ''
      ];
    });
    
    // CSVファイルをダウンロード
    const startDate = this.dateRangeStart.value;
    const endDate = this.dateRangeEnd.value;
    const fileName = `daily_data_${startDate}_to_${endDate}.csv`;
    
    this.downloadCsv(headers, csvData, fileName);
  }
  
  /**
   * CSVファイルをダウンロードする
   * @param {Array} headers - ヘッダー行
   * @param {Array} data - データ行
   * @param {string} fileName - ファイル名
   */
  downloadCsv(headers, data, fileName) {
    // CSVデータを生成
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(row => {
      csvContent += row.map(cell => {
        // カンマやダブルクォートを含む場合はダブルクォートで囲む
        if (String(cell).includes(',') || String(cell).includes('"')) {
          return `"${String(cell).replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',') + '\n';
    });
    
    // BOMを追加してUTF-8として認識されるようにする
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // ダウンロードリンクを作成
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    
    // リンクをクリックしてダウンロードを開始
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  /**
   * CSVデータをインポートする
   * @param {File} file - インポートするCSVファイル
   */
  importCsvData(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csvData = e.target.result;
      
      // CSVデータを解析
      const rows = csvData.split('\n');
      const headers = rows[0].split(',');
      
      // ヘッダーの検証
      const requiredHeaders = ['日付', '担当者', 'アプローチ数', '面談数', '商談数', '提案数', '契約数', '契約金額'];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      
      if (missingHeaders.length > 0) {
        this.showNotification(`CSVファイルに必要なヘッダーがありません: ${missingHeaders.join(', ')}`, 'error');
        return;
      }
      
      // データ行を処理
      const promises = [];
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) {
          continue; // 空行をスキップ
        }
        
        const cells = this.parseCSVRow(rows[i]);
        
        // 担当者IDを取得
        const memberName = cells[headers.indexOf('担当者')];
        const member = this.members.find(m => m.name === memberName);
        
        if (!member) {
          console.warn(`担当者が見つかりません: ${memberName}`);
          continue;
        }
        
        // データオブジェクトを作成
        const data = {
          date: cells[headers.indexOf('日付')],
          memberId: member.id,
          approach: parseInt(cells[headers.indexOf('アプローチ数')], 10),
          meeting: parseInt(cells[headers.indexOf('面談数')], 10),
          negotiation: parseInt(cells[headers.indexOf('商談数')], 10),
          proposal: parseInt(cells[headers.indexOf('提案数')], 10),
          contract: parseInt(cells[headers.indexOf('契約数')], 10),
          amount: parseFloat(cells[headers.indexOf('契約金額')]),
          notes: headers.includes('備考') ? cells[headers.indexOf('備考')] : '',
          timestamp: new Date().toISOString()
        };
        
        // データを検証
        if (this.validateDailyData(data)) {
          // データを保存
          promises.push(this.dbService.saveDailyData(data));
        }
      }
      
      // すべての保存処理が完了するのを待機
      Promise.all(promises)
        .then(results => {
          this.showNotification(`${results.length}件のデータがインポートされました`, 'success');
          
          // CSVファイル入力をリセット
          this.csvFileInput.value = '';
          
          // オンライン時は即時同期を試行
          if (navigator.onLine) {
            this.syncService.syncData();
          }
        })
        .catch(error => {
          console.error('データインポートエラー:', error);
          this.showNotification('データのインポートに失敗しました', 'error');
        });
    };
    
    reader.onerror = () => {
      this.showNotification('CSVファイルの読み込みに失敗しました', 'error');
    };
    
    reader.readAsText(file);
  }
  
  /**
   * CSV行を解析する
   * @param {string} row - CSV行
   * @returns {Array} セルの配列
   */
  parseCSVRow(row) {
    const cells = [];
    let inQuotes = false;
    let currentCell = '';
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
          // エスケープされたダブルクォート
          currentCell += '"';
          i++;
        } else {
          // クォートの開始または終了
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // セルの区切り
        cells.push(currentCell);
        currentCell = '';
      } else {
        // 通常の文字
        currentCell += char;
      }
    }
    
    // 最後のセルを追加
    cells.push(currentCell);
    
    return cells;
  }
  
  /**
   * 通知を表示する
   * @param {string} message - 通知メッセージ
   * @param {string} type - 通知タイプ（'success', 'error', 'info'）
   */
  showNotification(message, type = 'info') {
    const notificationContainer = document.getElementById('notification-container');
    
    // 通知要素を作成
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // 通知を表示
    notificationContainer.appendChild(notification);
    
    // 3秒後に通知を削除
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        notificationContainer.removeChild(notification);
      }, 500);
    }, 3000);
  }
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
  window.dailyInputManager = new DailyInputManager();
}); 