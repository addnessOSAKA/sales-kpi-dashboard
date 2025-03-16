/**
 * 営業チームKPIダッシュボード エクスポートユーティリティ
 * このファイルはデータのエクスポート機能を提供します
 */

class ExportUtils {
  constructor() {
    this.config = window.appConfig || {};
  }

  /**
   * CSVデータをエクスポートする
   * @param {Array} headers - ヘッダー行
   * @param {Array} data - データ行
   * @param {string} fileName - ファイル名
   */
  exportToCsv(headers, data, fileName) {
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
    this.downloadFile(blob, fileName || 'export.csv');
  }

  /**
   * JSONデータをエクスポートする
   * @param {Object} data - エクスポートするデータ
   * @param {string} fileName - ファイル名
   */
  exportToJson(data, fileName) {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    this.downloadFile(blob, fileName || 'export.json');
  }

  /**
   * HTMLテーブルをCSVにエクスポートする
   * @param {HTMLTableElement} table - エクスポートするテーブル要素
   * @param {string} fileName - ファイル名
   */
  exportTableToCsv(table, fileName) {
    const rows = table.querySelectorAll('tr');
    const headers = [];
    const data = [];
    
    // ヘッダー行を取得
    const headerCells = rows[0].querySelectorAll('th');
    headerCells.forEach(cell => {
      headers.push(cell.textContent.trim());
    });
    
    // データ行を取得
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowData = [];
      const cells = row.querySelectorAll('td');
      
      cells.forEach(cell => {
        rowData.push(cell.textContent.trim());
      });
      
      data.push(rowData);
    }
    
    this.exportToCsv(headers, data, fileName);
  }

  /**
   * チャートデータをCSVにエクスポートする
   * @param {Chart} chart - Chart.jsのチャートインスタンス
   * @param {string} fileName - ファイル名
   */
  exportChartToCsv(chart, fileName) {
    const headers = ['カテゴリ'];
    const data = [];
    
    // データセットのラベルをヘッダーに追加
    chart.data.datasets.forEach(dataset => {
      headers.push(dataset.label || '未定義');
    });
    
    // データを行に変換
    chart.data.labels.forEach((label, index) => {
      const row = [label];
      
      chart.data.datasets.forEach(dataset => {
        row.push(dataset.data[index]);
      });
      
      data.push(row);
    });
    
    this.exportToCsv(headers, data, fileName);
  }

  /**
   * 日次データをCSVにエクスポートする
   * @param {Array} dailyData - 日次データの配列
   * @param {Array} members - 担当者データの配列
   * @param {string} fileName - ファイル名
   */
  exportDailyDataToCsv(dailyData, members, fileName) {
    const headers = ['日付', '担当者', 'アプローチ数', '面談数', '商談数', '提案数', '契約数', '契約金額', '備考'];
    const data = [];
    
    dailyData.forEach(item => {
      // 担当者名を取得
      const member = members.find(m => m.id === item.memberId);
      const memberName = member ? member.name : item.memberId;
      
      // 日付をフォーマット
      const date = new Date(item.date);
      const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
      
      // 金額をフォーマット
      const formattedAmount = item.amount.toLocaleString();
      
      data.push([
        formattedDate,
        memberName,
        item.approach,
        item.meeting,
        item.negotiation,
        item.proposal,
        item.contract,
        formattedAmount,
        item.notes || ''
      ]);
    });
    
    this.exportToCsv(headers, data, fileName || 'daily_data.csv');
  }

  /**
   * 案件データをCSVにエクスポートする
   * @param {Array} projects - 案件データの配列
   * @param {Array} members - 担当者データの配列
   * @param {string} fileName - ファイル名
   */
  exportProjectsToCsv(projects, members, fileName) {
    const headers = ['企業名', '案件名', 'ステータス', '担当者', '予算', '作成日', '更新日', '詳細'];
    const data = [];
    
    // ステータス名のマッピング
    const statusMap = {
      initial: '初回接触',
      meeting: '面談',
      proposal: '提案',
      negotiation: '交渉',
      contract: '成約',
      lost: '失注'
    };
    
    projects.forEach(project => {
      // 担当者名を取得
      const member = members.find(m => m.id === project.assignedTo);
      const memberName = member ? member.name : project.assignedTo;
      
      // 日付をフォーマット
      const createdDate = new Date(project.createdAt);
      const formattedCreatedDate = `${createdDate.getFullYear()}/${createdDate.getMonth() + 1}/${createdDate.getDate()}`;
      
      let formattedUpdatedDate = '';
      if (project.updatedAt) {
        const updatedDate = new Date(project.updatedAt);
        formattedUpdatedDate = `${updatedDate.getFullYear()}/${updatedDate.getMonth() + 1}/${updatedDate.getDate()}`;
      }
      
      // 予算をフォーマット
      const formattedBudget = project.budget ? project.budget.toLocaleString() : '';
      
      data.push([
        project.companyName,
        project.name,
        statusMap[project.status] || project.status,
        memberName,
        formattedBudget,
        formattedCreatedDate,
        formattedUpdatedDate,
        project.description || ''
      ]);
    });
    
    this.exportToCsv(headers, data, fileName || 'projects.csv');
  }

  /**
   * ファイルをダウンロードする
   * @param {Blob} blob - ダウンロードするBlobデータ
   * @param {string} fileName - ファイル名
   */
  downloadFile(blob, fileName) {
    // ダウンロードリンクを作成
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    
    // リンクをクリックしてダウンロードを開始
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 通知を表示
    if (window.notificationUtils) {
      window.notificationUtils.showSuccess(`${fileName}のダウンロードを開始しました`);
    }
  }

  /**
   * 現在の表示データをエクスポートする
   * @param {string} viewType - 表示タイプ（'weekly', 'monthly', 'members', 'daily', 'projects'）
   */
  exportCurrentView(viewType) {
    switch (viewType) {
      case 'weekly':
        this.exportWeeklyData();
        break;
      case 'monthly':
        this.exportMonthlyData();
        break;
      case 'members':
        this.exportMembersData();
        break;
      case 'daily':
        this.exportDailyData();
        break;
      case 'projects':
        this.exportProjectsData();
        break;
      default:
        if (window.notificationUtils) {
          window.notificationUtils.showError('エクスポート対象が不明です');
        }
    }
  }

  /**
   * 週次データをエクスポートする
   */
  exportWeeklyData() {
    const weeklyTable = document.querySelector('#weekly-dashboard table');
    if (weeklyTable) {
      this.exportTableToCsv(weeklyTable, '週次データ.csv');
    } else {
      // 週次チャートをエクスポート
      const weeklyChart = Chart.getChart('weeklyTrendChart');
      if (weeklyChart) {
        this.exportChartToCsv(weeklyChart, '週次推移.csv');
      } else {
        if (window.notificationUtils) {
          window.notificationUtils.showError('エクスポート可能なデータが見つかりません');
        }
      }
    }
  }

  /**
   * 月次データをエクスポートする
   */
  exportMonthlyData() {
    const monthlyTable = document.querySelector('#monthly-dashboard table');
    if (monthlyTable) {
      this.exportTableToCsv(monthlyTable, '月次データ.csv');
    } else {
      // 月次チャートをエクスポート
      const monthlyChart = Chart.getChart('monthlyTrendChart');
      if (monthlyChart) {
        this.exportChartToCsv(monthlyChart, '月次推移.csv');
      } else {
        if (window.notificationUtils) {
          window.notificationUtils.showError('エクスポート可能なデータが見つかりません');
        }
      }
    }
  }

  /**
   * 担当者データをエクスポートする
   */
  exportMembersData() {
    const membersTable = document.querySelector('#members-dashboard table');
    if (membersTable) {
      this.exportTableToCsv(membersTable, '担当者データ.csv');
    } else {
      // 担当者チャートをエクスポート
      const membersChart = Chart.getChart('memberPerformanceChart');
      if (membersChart) {
        this.exportChartToCsv(membersChart, '担当者パフォーマンス.csv');
      } else {
        if (window.notificationUtils) {
          window.notificationUtils.showError('エクスポート可能なデータが見つかりません');
        }
      }
    }
  }

  /**
   * 日次データをエクスポートする
   */
  exportDailyData() {
    const dailyTable = document.querySelector('#daily-data-table');
    if (dailyTable) {
      this.exportTableToCsv(dailyTable, '日次データ.csv');
    } else {
      if (window.notificationUtils) {
        window.notificationUtils.showError('エクスポート可能なデータが見つかりません');
      }
    }
  }

  /**
   * 案件データをエクスポートする
   */
  exportProjectsData() {
    const projectsTable = document.querySelector('#project-table');
    if (projectsTable) {
      this.exportTableToCsv(projectsTable, '案件データ.csv');
    } else {
      if (window.notificationUtils) {
        window.notificationUtils.showError('エクスポート可能なデータが見つかりません');
      }
    }
  }
}

// グローバルインスタンスとしてエクスポート
window.exportUtils = new ExportUtils(); 