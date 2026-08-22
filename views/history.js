// views/history.js
const HistoryView = {
  render() {
    const data = store.data;

    return `
      <div class="max-w-5xl mx-auto pb-10">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-gray-800">提出履歴・データ</h1>
          <div class="flex gap-2 flex-wrap justify-end">
            <button id="btn-email-history" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 shadow-sm">
              <i data-lucide="mail" class="w-4 h-4"></i>
              メールで送信
            </button>
            <button id="btn-export-excel" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 shadow-sm font-bold">
              <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
              成績データをExcelで出力
            </button>
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-lg shadow-sm mb-6 border border-gray-100">
          <div class="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <i data-lucide="bar-chart-2" class="w-5 h-5"></i>各提出物の提出割合
            </h2>
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <label class="text-gray-600 font-medium">集計期間:</label>
              <select id="history-filter-type" class="border border-gray-300 rounded p-1.5 bg-gray-50 text-gray-800">
                <option value="today">今日</option>
                <option value="yesterday">昨日</option>
                <option value="week">直近一週間</option>
                <option value="custom">日付指定</option>
                <option value="all">すべて (累計)</option>
              </select>
              <input type="date" id="history-filter-date" class="border border-gray-300 rounded p-1.5 bg-gray-50 text-gray-800 hidden">
            </div>
          </div>
          
          <div id="history-stats-container">
            <!-- JSで描画 -->
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-sm">
          <div class="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <h2 class="text-lg font-semibold flex items-center gap-2"><i data-lucide="list" class="w-5 h-5"></i>すべての提出履歴</h2>
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <label class="text-gray-600 font-medium hidden sm:inline-block">表示期間:</label>
              <select id="history-table-filter-type" class="border border-gray-300 rounded p-1.5 bg-gray-50 text-gray-800">
                <option value="today">今日</option>
                <option value="yesterday">昨日</option>
                <option value="week">直近一週間</option>
                <option value="custom">日付指定</option>
                <option value="all" selected>すべて</option>
              </select>
              <input type="date" id="history-table-filter-date" class="border border-gray-300 rounded p-1.5 bg-gray-50 text-gray-800 hidden">
            </div>
          </div>
          
          <div class="max-h-96 overflow-y-auto border border-gray-200 rounded">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-gray-500">日時</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-500">出席番号</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-500">氏名</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-500">提出物</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-500">状態</th>
                  <th class="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200" id="history-table-body">
                <!-- JSで描画 -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },
  
  afterRender() {
    lucide.createIcons();
    
    // サマリーの初期描画とイベント設定
    const filterSelect = document.getElementById('history-filter-type');
    const filterDate = document.getElementById('history-filter-date');
    
    if (filterSelect && filterDate) {
      filterDate.value = new Date().toISOString().split('T')[0];
      
      const update = () => {
        if (filterSelect.value === 'custom') {
          filterDate.classList.remove('hidden');
        } else {
          filterDate.classList.add('hidden');
        }
        HistoryView.updateStatsUI();
      };
      
      filterSelect.addEventListener('change', update);
      filterDate.addEventListener('change', update);
      update();
    }
    
    // テーブルの初期描画とイベント設定
    const tableFilterSelect = document.getElementById('history-table-filter-type');
    const tableFilterDate = document.getElementById('history-table-filter-date');
    if (tableFilterSelect && tableFilterDate) {
      tableFilterDate.value = new Date().toISOString().split('T')[0];
      
      const updateTable = () => {
        if (tableFilterSelect.value === 'custom') {
          tableFilterDate.classList.remove('hidden');
        } else {
          tableFilterDate.classList.add('hidden');
        }
        HistoryView.updateTableUI();
      };
      
      tableFilterSelect.addEventListener('change', updateTable);
      tableFilterDate.addEventListener('change', updateTable);
      updateTable(); // 初回描画
    }
    
    document.getElementById('btn-export-excel').addEventListener('click', () => {
      if (typeof XLSX === 'undefined') {
        utils.showToast('Excel出力ライブラリの読み込みに失敗しました', 'error');
        return;
      }
      
      const data = store.data;
      const targetSubmissions = HistoryView.getFilteredSubmissions('history-table');
      
      if (data.students.length === 0 || targetSubmissions.length === 0) {
        utils.showToast('エクスポートするデータがありません', 'error');
        return;
      }

      // 対象期間内の提出物のみを列として抽出
      const activeAssignmentIds = [...new Set(targetSubmissions.map(s => s.assignmentId))];
      const activeAssignments = data.assignments.filter(a => activeAssignmentIds.includes(a.id));

      // ----------------------------------------------------
      // 事前計算（各提出物のクラス平均提出率）
      // ----------------------------------------------------
      const assignmentStats = activeAssignments.map(a => {
        let submitted = 0;
        let forgot = 0;
        let valid = 0; // 欠席・免除を除く、本来の提出対象者数
        
        data.students.forEach(student => {
          const sub = targetSubmissions.find(s => s.studentId === student.id && s.assignmentId === a.id);
          const status = sub ? sub.status : '';
          
          if (status === 'submitted') { submitted++; valid++; }
          else if (status === 'forgot') { forgot++; valid++; }
          else if (status === 'absent' || status === 'exempt') { /* 対象外 */ }
          else { valid++; } // 未入力
        });
        
        const rate = valid > 0 ? Math.round((submitted / valid) * 100) : 0;
        return {
          ...a,
          submittedCount: submitted,
          forgotCount: forgot,
          validCount: valid,
          rate: rate
        };
      });

      // ----------------------------------------------------
      // 事前計算（各個人の成績と、クラス全体の平均）
      // ----------------------------------------------------
      let classTotalSubmitted = 0;
      let classTotalValidAssignments = 0;

      const studentStats = data.students.map(student => {
        let submittedCount = 0;
        let forgotCount = 0;
        let validAssignmentCount = 0;
        
        const assignmentResults = assignmentStats.map(aStat => {
          const sub = targetSubmissions.find(s => s.studentId === student.id && s.assignmentId === aStat.id);
          const status = sub ? sub.status : '';
          const dateText = sub ? new Date(sub.scannedAt).toLocaleString('ja-JP') : '';
          
          let statusText = '';
          let individualRate = 0;
          if (status === 'submitted') { statusText = '〇'; submittedCount++; validAssignmentCount++; individualRate = 100; }
          else if (status === 'forgot') { statusText = '忘'; forgotCount++; validAssignmentCount++; individualRate = 0; }
          else if (status === 'absent') { statusText = '休'; individualRate = null; } // 対象外
          else if (status === 'exempt') { statusText = '×'; individualRate = null; } // 対象外
          else { statusText = '未'; validAssignmentCount++; individualRate = 0; } // 空欄

          // クラスの提出率との差分
          let diffText = '-';
          if (individualRate !== null) {
             const diff = individualRate - aStat.rate;
             diffText = diff > 0 ? `+${diff}%` : `${diff}%`;
          }

          return { 
            title: aStat.title, 
            statusText, 
            dateText,
            classRate: `${aStat.rate}%`,
            diffText: diffText
          };
        });

        classTotalSubmitted += submittedCount;
        classTotalValidAssignments += validAssignmentCount;

        const rate = validAssignmentCount > 0 ? Math.round((submittedCount / validAssignmentCount) * 100) : 0;

        return {
          student,
          submittedCount,
          forgotCount,
          validAssignmentCount,
          rate,
          assignmentResults
        };
      });

      const classAvgRate = classTotalValidAssignments > 0 ? Math.round((classTotalSubmitted / classTotalValidAssignments) * 100) : 0;

      const wb = XLSX.utils.book_new();

      // ----------------------------------------------------
      // シート1: 全体まとめ (Overall Summary)
      // ----------------------------------------------------
      const summaryData = studentStats.map(stat => {
        const row = {
          '出席番号': stat.student.number,
          '氏名': stat.student.name,
          'クラス': stat.student.class || ''
        };
        
        stat.assignmentResults.forEach(ar => {
          row[ar.title] = ar.statusText;
        });

        row['合計提出回数'] = stat.submittedCount;
        row['忘れ回数'] = stat.forgotCount;
        row['個人提出率(%)'] = stat.rate;
        
        const diff = stat.rate - classAvgRate;
        row['平均との差(%)'] = diff > 0 ? `+${diff}` : String(diff);

        return row;
      });

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary['!cols'] = [{wch: 10}, {wch: 15}, {wch: 12}]; // 以降の動的な列幅は省略
      XLSX.utils.book_append_sheet(wb, wsSummary, "全体まとめ");

      // ----------------------------------------------------
      // 各個人のシート生成
      // ----------------------------------------------------
      studentStats.forEach(stat => {
        const diff = stat.rate - classAvgRate;
        const diffStr = diff > 0 ? `+${diff}%` : `${diff}%`;

        const aoa = [
          ["【個人成績レポート】"],
          [],
          ["氏名", stat.student.name, "出席番号", stat.student.number],
          ["クラス", stat.student.class || "-"],
          [],
          ["クラス平均提出率", `${classAvgRate}%`],
          ["個人の提出率", `${stat.rate}%`],
          ["平均との差", diffStr],
          ["合計提出回数", `${stat.submittedCount}回`],
          ["忘れ回数", `${stat.forgotCount}回`],
          [],
          ["提出物名", "状態", "クラスの提出率", "平均との差", "提出日時"]
        ];

        stat.assignmentResults.forEach(ar => {
          aoa.push([ar.title, ar.statusText, ar.classRate, ar.diffText, ar.dateText]);
        });

        const wsStudent = XLSX.utils.aoa_to_sheet(aoa);
        wsStudent['!cols'] = [{wch: 25}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 20}];
        
        // シート名には使えない文字があるため置換し、31文字以内に収める
        let sheetName = `${stat.student.number}_${stat.student.name}`.replace(/[\\/*?:\[\]]/g, '_').substring(0, 31);
        
        // シート名の重複を防ぐ
        let finalSheetName = sheetName;
        let counter = 1;
        while (wb.SheetNames.includes(finalSheetName)) {
          finalSheetName = `${sheetName.substring(0, 28)}_${counter}`;
          counter++;
        }

        XLSX.utils.book_append_sheet(wb, wsStudent, finalSheetName);
      });

      // ----------------------------------------------------
      // 各提出物のシート生成
      // ----------------------------------------------------
      assignmentStats.forEach(aStat => {
        const aoa = [
          [`【提出物レポート】 ${aStat.title}`],
          [],
          ["提出物名", aStat.title],
          ["対象人数(有効)", `${aStat.validCount}人`],
          ["提出済(〇)", `${aStat.submittedCount}人`],
          ["忘れ(忘)", `${aStat.forgotCount}人`],
          ["クラス提出率", `${aStat.rate}%`],
          [],
          ["出席番号", "氏名", "状態", "提出日時"]
        ];

        // その提出物の全員の状況を追加
        data.students.forEach(student => {
           const sub = targetSubmissions.find(s => s.studentId === student.id && s.assignmentId === aStat.id);
           const status = sub ? sub.status : '';
           const dateText = sub ? new Date(sub.scannedAt).toLocaleString('ja-JP') : '';
           
           let statusText = '未';
           if (status === 'submitted') statusText = '〇';
           else if (status === 'forgot') statusText = '忘';
           else if (status === 'absent') statusText = '休';
           else if (status === 'exempt') statusText = '×';
           
           aoa.push([student.number, student.name, statusText, dateText]);
        });

        const wsAssignment = XLSX.utils.aoa_to_sheet(aoa);
        wsAssignment['!cols'] = [{wch: 10}, {wch: 15}, {wch: 10}, {wch: 20}];

        let sheetName = `物_${aStat.title}`.replace(/[\\/*?:\[\]]/g, '_').substring(0, 31);
        let finalSheetName = sheetName;
        let counter = 1;
        while (wb.SheetNames.includes(finalSheetName)) {
          finalSheetName = `${sheetName.substring(0, 28)}_${counter}`;
          counter++;
        }
        XLSX.utils.book_append_sheet(wb, wsAssignment, finalSheetName);
      });
      
      const filename = `和田小_成績データ_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      utils.showToast('成績データをExcelで出力しました');
    });

    document.getElementById('btn-email-history').addEventListener('click', () => {
      const data = store.data;
      if (data.submissions.length === 0) {
        utils.showToast('送信する履歴がありません', 'error');
        return;
      }

      let bodyText = `和田小宿題チェッカー 提出履歴サマリー\n出力日時: ${new Date().toLocaleString('ja-JP')}\n\n`;

      data.assignments.forEach(assignment => {
        const subsForAssign = data.submissions.filter(s => s.assignmentId === assignment.id);
        if (subsForAssign.length > 0) {
          bodyText += `■ 【${assignment.title}】\n`;
          let submitted = [];
          let forgot = [];
          let absent = [];
          let exempt = [];
          let unsubmitted = [];

          data.students.forEach(student => {
            const sub = subsForAssign.find(s => s.studentId === student.id);
            const status = sub ? sub.status : '';
            const nameStr = `${student.number}.${student.name}`;
            if (status === 'submitted') submitted.push(nameStr);
            else if (status === 'forgot') forgot.push(nameStr);
            else if (status === 'absent') absent.push(nameStr);
            else if (status === 'exempt') exempt.push(nameStr);
            else unsubmitted.push(nameStr);
          });

          bodyText += `[〇 提出済] (${submitted.length}名): ${submitted.join(', ')}\n`;
          if (forgot.length > 0) bodyText += `[忘 忘れ] (${forgot.length}名): ${forgot.join(', ')}\n`;
          if (absent.length > 0) bodyText += `[休 欠席] (${absent.length}名): ${absent.join(', ')}\n`;
          if (exempt.length > 0) bodyText += `[× 面除等] (${exempt.length}名): ${exempt.join(', ')}\n`;
          if (unsubmitted.length > 0) bodyText += `[未入力] (${unsubmitted.length}名): ${unsubmitted.join(', ')}\n`;
          bodyText += `\n`;
        }
      });

      const subject = encodeURIComponent(`提出履歴レポート (${new Date().toLocaleDateString('ja-JP')})`);
      const body = encodeURIComponent(bodyText);
      const mailtoLink = `mailto:?subject=${subject}&body=${body}`;

      // 長すぎる場合は警告を出す（メーラーによっては起動しないため）
      if (mailtoLink.length > 2000) {
        if(!confirm('履歴データが長いため、一部のメールアプリでは正常に起動しない可能性があります。続行しますか？')) {
          return;
        }
      }

      window.location.href = mailtoLink;
    });

    window.deleteSubmission = (studentId, assignmentId) => {
      if (confirm('この提出記録を取り消しますか？')) {
        store.removeSubmission(studentId, assignmentId);
        window.app.navigate('history');
      }
    };
  },

  getFilteredSubmissions(prefix) {
    const filterType = document.getElementById(`${prefix}-filter-type`)?.value || 'all';
    const customDateStr = document.getElementById(`${prefix}-filter-date`)?.value;
    
    const data = store.data;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (filterType === 'all') return data.submissions;

    return data.submissions.filter(sub => {
      const subDate = new Date(sub.scannedAt);
      if (filterType === 'today') {
        return subDate >= today;
      } else if (filterType === 'yesterday') {
        return subDate >= yesterday && subDate < today;
      } else if (filterType === 'week') {
        return subDate >= weekAgo;
      } else if (filterType === 'custom') {
        if (!customDateStr) return true;
        const targetDate = new Date(customDateStr);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        return subDate >= targetDate && subDate < nextDay;
      }
      return true;
    });
  },

  updateStatsUI() {
    const container = document.getElementById('history-stats-container');
    if (!container) return;
    
    const data = store.data;
    if (data.assignments.length === 0) {
      container.innerHTML = '<div class="text-gray-500 text-sm">提出物がありません</div>';
      return;
    }

    const filteredSubmissions = this.getFilteredSubmissions('history');

    const totalStudents = data.students.length;
    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
    
    data.assignments.forEach(a => {
      const subs = filteredSubmissions.filter(s => s.assignmentId === a.id);
      const submitted = subs.filter(s => s.status === 'submitted').length;
      const forgot = subs.filter(s => s.status === 'forgot').length;
      const absent = subs.filter(s => s.status === 'absent').length;
      const exempt = subs.filter(s => s.status === 'exempt').length;
      const rate = totalStudents > 0 ? Math.round((submitted / totalStudents) * 100) : 0;
      
      html += `
        <div class="border border-gray-200 rounded p-3 bg-gray-50 shadow-sm">
          <div class="font-bold text-gray-800 text-sm mb-2 truncate" title="${utils.escapeHTML(a.title)}">${utils.escapeHTML(a.title)}</div>
          <div class="flex justify-between items-end mb-1">
            <span class="text-2xl font-bold text-blue-600">${rate}<span class="text-sm">%</span></span>
            <span class="text-xs text-gray-600">提出: <span class="font-bold">${submitted}</span> / ${totalStudents}人</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-1.5 mb-2">
            <div class="bg-blue-600 h-1.5 rounded-full transition-all" style="width: ${rate}%"></div>
          </div>
          <div class="text-[10px] text-gray-500 flex justify-between">
            <span>忘: ${forgot}人</span>
            <span>休: ${absent}人</span>
            <span>未: ${totalStudents - submitted - forgot - absent - exempt}人</span>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  },

  updateTableUI() {
    const container = document.getElementById('history-table-body');
    if (!container) return;

    const filteredSubmissions = this.getFilteredSubmissions('history-table');
    const sortedSubmissions = filteredSubmissions.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));

    if (sortedSubmissions.length === 0) {
      container.innerHTML = '<tr><td colspan="6" class="px-3 py-8 text-center text-gray-500">履歴がありません</td></tr>';
      return;
    }

    const data = store.data;
    container.innerHTML = sortedSubmissions.map(sub => {
      const student = data.students.find(s => s.id === sub.studentId) || { number: '?', name: '削除された児童' };
      const assignment = data.assignments.find(a => a.id === sub.assignmentId) || { title: '削除された提出物' };
      const dateObj = new Date(sub.scannedAt);
      const dateStr = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}`;
      
      let statusText = '〇';
      let statusColor = 'text-blue-600';
      if (sub.status === 'forgot') {
        statusText = '忘';
        statusColor = 'text-yellow-600';
      } else if (sub.status === 'absent') {
        statusText = '休';
        statusColor = 'text-purple-600';
      } else if (sub.status === 'exempt') {
        statusText = '×';
        statusColor = 'text-red-600';
      }
      
      return `
        <tr>
          <td class="px-3 py-2 text-gray-600">${dateStr}</td>
          <td class="px-3 py-2">${utils.escapeHTML(student.number)}</td>
          <td class="px-3 py-2">${utils.escapeHTML(student.name)}</td>
          <td class="px-3 py-2">${utils.escapeHTML(assignment.title)}</td>
          <td class="px-3 py-2 font-bold ${statusColor}">${statusText}</td>
          <td class="px-3 py-2 text-right">
            <button class="text-red-500 hover:text-red-700" onclick="deleteSubmission('${sub.studentId}', '${sub.assignmentId}')">
              取消
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
};
