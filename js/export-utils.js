/**
 * 営業チームKPIダッシュボード エクスポートユーティリティ
 * このファイルはデータのエクスポート機能を提供します
 */

class ExportUtils {
  constructor(config = EXPORT_CONFIG) {
    this.config = config;
  }

  /**
   * CSVデータをエクスポートする
   * @param {Object} data - エクスポートするデータ
   * @param {string} filename - ファイル名
   */
  exportToCsv(data, filename = 'kpi-dashboard-export.csv') {
    try {
      // データをCSV形式に変換
      const csvContent = this.convertToCSV(data);
      
      // BOMを追加してUTF-8として認識されるようにする
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // ダウンロードリンクを作成
      this.downloadFile(blob, filename);
      
      console.log(`CSVエクスポート完了: ${filename}`);
    } catch (error) {
      console.error('CSVエクスポートエラー:', error);
    }
  }

  /**
   * データをCSV形式に変換する
   * @param {Object} data - 変換するデータ
   * @returns {string} CSV形式の文字列
   */
  convertToCSV(data) {
    // データの種類に応じて変換処理を分ける
    if (Array.isArray(data)) {
      return this.convertArrayToCSV(data);
    } else if (typeof data === 'object') {
      return this.convertObjectToCSV(data);
    }
    
    return '';
  }

  /**
   * 配列データをCSV形式に変換する
   * @param {Array} array - 変換する配列
   * @returns {string} CSV形式の文字列
   */
  convertArrayToCSV(array) {
    if (!array.length) return '';
    
    // ヘッダー行を作成
    const headers = Object.keys(array[0]);
    const headerRow = headers.join(',');
    
    // データ行を作成
    const rows = array.map(item => {
      return headers.map(header => {
        // 値に,や"が含まれる場合は"で囲む
        const value = item[header];
        const stringValue = String(value);
        
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      }).join(',');
    });
    
    // ヘッダーとデータ行を結合
    return [headerRow, ...rows].join('\n');
  }

  /**
   * オブジェクトデータをCSV形式に変換する
   * @param {Object} obj - 変換するオブジェクト
   * @returns {string} CSV形式の文字列
   */
  convertObjectToCSV(obj) {
    // オブジェクトを配列形式に変換
    const array = [];
    
    // データの構造に応じて変換
    if (obj.weekly && obj.weekly.current) {
      // 週次データの場合
      const metrics = obj.weekly.current.metrics;
      Object.keys(metrics).forEach(key => {
        array.push({
          category: '週次',
          period: obj.weekly.current.period,
          metric: key,
          value: metrics[key].value,
          target: metrics[key].target,
          change: metrics[key].change
        });
      });
    }
    
    if (obj.monthly && obj.monthly.current) {
      // 月次データの場合
      const metrics = obj.monthly.current.metrics;
      Object.keys(metrics).forEach(key => {
        array.push({
          category: '月次',
          period: obj.monthly.current.period,
          metric: key,
          value: metrics[key].value,
          target: metrics[key].target,
          change: metrics[key].change
        });
      });
    }
    
    if (obj.members && obj.members.all) {
      // 担当者データの場合
      Object.keys(obj.members.all).forEach(member => {
        const memberData = obj.members.all[member];
        array.push({
          category: '担当者',
          period: '',
          metric: member,
          value: memberData.amount,
          target: memberData.target,
          change: memberData.change
        });
      });
    }
    
    // 配列をCSVに変換
    return this.convertArrayToCSV(array);
  }

  /**
   * Excelデータをエクスポートする
   * @param {Object} data - エクスポートするデータ
   * @param {string} filename - ファイル名
   */
  exportToExcel(data, filename = 'kpi-dashboard-export.xlsx') {
    try {
      // 現在はCSVとして出力（実際のExcel出力にはライブラリが必要）
      alert('Excel形式でのエクスポートには外部ライブラリが必要です。現在はCSV形式でダウンロードします。');
      this.exportToCsv(data, filename.replace('.xlsx', '.csv'));
    } catch (error) {
      console.error('Excelエクスポートエラー:', error);
    }
  }

  /**
   * PDFデータをエクスポートする
   * @param {Object} data - エクスポートするデータ
   * @param {string} filename - ファイル名
   */
  exportToPdf(data, filename = 'kpi-dashboard-export.pdf') {
    try {
      alert('PDF形式でのエクスポートには外部ライブラリが必要です。現在は実装されていません。');
      // 実際のPDF出力にはjsPDFなどのライブラリが必要
    } catch (error) {
      console.error('PDFエクスポートエラー:', error);
    }
  }

  /**
   * ファイルをダウンロードする
   * @param {Blob} blob - ダウンロードするBlob
   * @param {string} filename - ファイル名
   */
  downloadFile(blob, filename) {
    // ダウンロードリンクを作成
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    
    // リンクを非表示にして追加
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // リンクをクリックしてダウンロード
    link.click();
    
    // リンクを削除
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }, 100);
  }

  /**
   * 現在の表示データをエクスポートする
   * @param {string} format - エクスポート形式（'csv', 'excel', 'pdf'）
   * @param {Object} data - エクスポートするデータ
   * @param {string} prefix - ファイル名のプレフィックス
   */
  exportCurrentView(format, data, prefix = 'kpi-dashboard') {
    // 現在の日時を取得
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${prefix}-${dateStr}`;
    
    // 形式に応じてエクスポート
    switch (format.toLowerCase()) {
      case 'csv':
        this.exportToCsv(data, `${filename}.csv`);
        break;
      case 'excel':
        this.exportToExcel(data, `${filename}.xlsx`);
        break;
      case 'pdf':
        this.exportToPdf(data, `${filename}.pdf`);
        break;
      default:
        console.error(`未対応のエクスポート形式: ${format}`);
    }
  }
}

// エクスポートユーティリティのインスタンスを作成
const exportUtils = new ExportUtils(); 