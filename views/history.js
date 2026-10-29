// views/history.js
const STATUS_SYMBOLS = { submitted: '〇', forgot: '忘', absent: '休', exempt: '×' };

const HistoryView = {
  render() {
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
          <p class="text-xs text-gray-500 mb-3">※提出率 = 〇 ÷（〇＋忘＋未入力）。休・×（免除）は分母から除きます。記録が1件でもある日を「回収日」として集計します。</p>

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
          <p class="text-xs text-gray-500 mb-2">※「メールで送信」「Excelで出力」は、この表示期間の内容が対象になります。</p>

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

    // 期間フィルタ（集計・表の2か所）の初期化
    const setupFilter = (prefix, onChange) => {
      const select = document.getElementById(`${prefix}-filter-type`);
      const date = document.getElementById(`${prefix}-filter-date`);
      if (!select || !date) return;
      date.value = getLocalDateString();
      const update = () => {
        date.classList.toggle('hidden', select.value !== 'custom');
        onChange();
      };
      select.addEventListener('change', update);
      date.addEventListener('change', update);
      update();
    };
    setupFilter('history', () => HistoryView.updateStatsUI());
    setupFilter('history-table', () => HistoryView.updateTableUI());

    document.getElementById('btn-export-excel').addEventListener('click', () => HistoryView.exportExcel());
    document.getElementById('btn-email-history').addEventListener('click', () => HistoryView.sendEmail());

    window.deleteSubmission = (submissionId) => {
      if (confirm('この提出記録を取り消しますか？')) {
        store.removeSubmissionById(submissionId);
        // 再描画すると期間フィルタが初期値に戻るため、表と集計だけを更新する
        HistoryView.updateTableUI();
        HistoryView.updateStatsUI();
      }
    };
  },

  // --- 期間フィルタ（日付は端末のローカル日付 "YYYY-MM-DD" で比較する） ---
  getFilterRange(prefix) {
    const filterType = document.getElementById(`${prefix}-filter-type`)?.value || 'all';
    const customDateStr = document.getElementById(`${prefix}-filter-date`)?.value;
    const today = getLocalDateString();
    const daysAgo = (n) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return getLocalDateString(d);
    };

    if (filterType === 'today') return { from: today, to: today, label: `今日 (${today})` };
    if (filterType === 'yesterday') return { from: daysAgo(1), to: daysAgo(1), label: `昨日 (${daysAgo(1)})` };
    if (filterType === 'week') return { from: daysAgo(6), to: today, label: `直近一週間 (${daysAgo(6)}〜${today})` };
    if (filterType === 'custom' && customDateStr) return { from: customDateStr, to: customDateStr, label: customDateStr };
    return { from: null, to: null, label: 'すべての期間' };
  },

  getFilteredSubmissions(prefix) {
    const { from, to } = HistoryView.getFilterRange(prefix);
    return store.data.submissions.filter(s => (!from || s.date >= from) && (!to || s.date <= to));
  },

  // --- 集計 ---
  // 期間内の記録を「提出物 → 日付 → その日に回収したクラス」と「提出物 → 児童 → 状態ごとの回数」にまとめる。
  // その日にそのクラスで1件でも記録がある提出物を「回収した」とみなし、記録の無い児童は「未入力」として数える。
  summarize(submissions) {
    const studentById = new Map(store.data.students.map(s => [s.id, s]));
    const summary = new Map();
    submissions.forEach(sub => {
      const student = studentById.get(sub.studentId);
      if (!student) return;
      if (!summary.has(sub.assignmentId)) summary.set(sub.assignmentId, { classesByDate: new Map(), byStudent: new Map() });
      const entry = summary.get(sub.assignmentId);

      if (!entry.classesByDate.has(sub.date)) entry.classesByDate.set(sub.date, new Set());
      entry.classesByDate.get(sub.date).add(student.class || '');

      if (!entry.byStudent.has(sub.studentId)) entry.byStudent.set(sub.studentId, { submitted: 0, forgot: 0, absent: 0, exempt: 0, lastAt: null });
      const c = entry.byStudent.get(sub.studentId);
      if (sub.status in c) c[sub.status]++;
      if (!c.lastAt || sub.scannedAt > c.lastAt) c.lastAt = sub.scannedAt;
    });
    return summary;
  },

  // 1人 × 1提出物 の期間内の内訳
  countsFor(summary, assignmentId, student) {
    const entry = summary.get(assignmentId);
    const empty = { submitted: 0, forgot: 0, absent: 0, exempt: 0, lastAt: null };
    if (!entry) return { ...empty, days: 0, blank: 0, valid: 0 };
    const classKey = student.class || '';
    let days = 0;
    entry.classesByDate.forEach(classes => { if (classes.has(classKey)) days++; });
    const c = entry.byStudent.get(student.id) || empty;
    const blank = Math.max(0, days - c.submitted - c.forgot - c.absent - c.exempt);
    return { ...c, days, blank, valid: c.submitted + c.forgot + blank };
  },

  // セルに表示する状態。1日分なら記号、複数日なら回数の内訳
  statusTextFor(counts) {
    if (counts.days === 0) return '-';
    if (counts.days === 1) {
      const status = ['submitted', 'forgot', 'absent', 'exempt'].find(k => counts[k] > 0);
      return status ? STATUS_SYMBOLS[status] : '未';
    }
    const parts = [];
    if (counts.submitted) parts.push(`〇${counts.submitted}`);
    if (counts.forgot) parts.push(`忘${counts.forgot}`);
    if (counts.blank) parts.push(`未${counts.blank}`);
    if (counts.absent) parts.push(`休${counts.absent}`);
    if (counts.exempt) parts.push(`×${counts.exempt}`);
    return parts.join(' ');
  },

  rateOf(submitted, valid) {
    return valid > 0 ? Math.round((submitted / valid) * 100) : null;
  },

  updateStatsUI() {
    const container = document.getElementById('history-stats-container');
    if (!container) return;

    const data = store.data;
    if (data.assignments.length === 0) {
      container.innerHTML = '<div class="text-gray-500 text-sm">提出物がありません</div>';
      return;
    }

    const summary = HistoryView.summarize(HistoryView.getFilteredSubmissions('history'));
    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';

    data.assignments.forEach(a => {
      if (!summary.has(a.id)) {
        html += `
          <div class="border border-gray-200 rounded p-3 bg-gray-50 shadow-sm opacity-60">
            <div class="font-bold text-gray-800 text-sm mb-2 truncate" title="${utils.escapeHTML(a.title)}">${utils.escapeHTML(a.title)}</div>
            <div class="text-xs text-gray-500 py-3">この期間の記録はありません</div>
          </div>
        `;
        return;
      }

      const t = { submitted: 0, forgot: 0, absent: 0, exempt: 0, blank: 0, valid: 0 };
      data.students.forEach(student => {
        const c = HistoryView.countsFor(summary, a.id, student);
        Object.keys(t).forEach(k => { t[k] += c[k]; });
      });
      const rate = HistoryView.rateOf(t.submitted, t.valid) ?? 0;
      const days = summary.get(a.id).classesByDate.size;

      html += `
        <div class="border border-gray-200 rounded p-3 bg-gray-50 shadow-sm">
          <div class="font-bold text-gray-800 text-sm mb-2 truncate" title="${utils.escapeHTML(a.title)}">${utils.escapeHTML(a.title)}</div>
          <div class="flex justify-between items-end mb-1">
            <span class="text-2xl font-bold text-blue-600">${rate}<span class="text-sm">%</span></span>
            <span class="text-xs text-gray-600">提出: <span class="font-bold">${t.submitted}</span> / ${t.valid}${days > 1 ? `件 (${days}日分)` : '人'}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-1.5 mb-2">
            <div class="bg-blue-600 h-1.5 rounded-full transition-all" style="width: ${rate}%"></div>
          </div>
          <div class="text-[10px] text-gray-500 flex justify-between">
            <span>忘: ${t.forgot}</span>
            <span>休: ${t.absent}</span>
            <span>×: ${t.exempt}</span>
            <span>未: ${t.blank}</span>
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

    const sortedSubmissions = HistoryView.getFilteredSubmissions('history-table')
      .sort((a, b) => (b.scannedAt || '').localeCompare(a.scannedAt || ''));

    if (sortedSubmissions.length === 0) {
      container.innerHTML = '<tr><td colspan="6" class="px-3 py-8 text-center text-gray-500">履歴がありません</td></tr>';
      return;
    }

    const data = store.data;
    const statusColors = { submitted: 'text-blue-600', forgot: 'text-yellow-600', absent: 'text-purple-600', exempt: 'text-red-600' };
    container.innerHTML = sortedSubmissions.map(sub => {
      const student = data.students.find(s => s.id === sub.studentId) || { number: '?', name: '削除された児童' };
      const assignment = data.assignments.find(a => a.id === sub.assignmentId) || { title: '削除された提出物' };
      const timeStr = sub.scannedAt ? new Date(sub.scannedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';
      const dateStr = `${sub.date.replace(/-/g, '/')} ${timeStr}`;

      return `
        <tr>
          <td class="px-3 py-2 text-gray-600 whitespace-nowrap">${dateStr}</td>
          <td class="px-3 py-2">${utils.escapeHTML(student.number)}</td>
          <td class="px-3 py-2">${utils.escapeHTML(student.name)}</td>
          <td class="px-3 py-2">${utils.escapeHTML(assignment.title)}</td>
          <td class="px-3 py-2 font-bold ${statusColors[sub.status] || 'text-gray-600'}">${STATUS_SYMBOLS[sub.status] || '?'}</td>
          <td class="px-3 py-2 text-right">
            <button class="text-red-500 hover:text-red-700" onclick="deleteSubmission('${sub.id}')">
              取消
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  exportExcel() {
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

    const summary = HistoryView.summarize(targetSubmissions);
    // 対象期間内に記録のある提出物のみを列として抽出
    const activeAssignments = data.assignments.filter(a => summary.has(a.id));
    const formatDate = (iso) => iso ? new Date(iso).toLocaleString('ja-JP') : '';
    const signed = (n) => n > 0 ? `+${n}` : String(n);

    // ----------------------------------------------------
    // 事前計算（各提出物のクラス提出率）
    // ----------------------------------------------------
    const assignmentStats = activeAssignments.map(a => {
      let submitted = 0, forgot = 0, valid = 0;
      data.students.forEach(student => {
        const c = HistoryView.countsFor(summary, a.id, student);
        submitted += c.submitted;
        forgot += c.forgot;
        valid += c.valid;
      });
      const multiDay = summary.get(a.id).classesByDate.size > 1;
      return { ...a, submittedCount: submitted, forgotCount: forgot, validCount: valid, rate: HistoryView.rateOf(submitted, valid) ?? 0, unit: multiDay ? '件' : '人' };
    });

    // ----------------------------------------------------
    // 事前計算（各個人の成績と、クラス全体の平均）
    // ----------------------------------------------------
    let classTotalSubmitted = 0;
    let classTotalValid = 0;

    const studentStats = data.students.map(student => {
      let submittedCount = 0, forgotCount = 0, validCount = 0;

      const assignmentResults = assignmentStats.map(aStat => {
        const c = HistoryView.countsFor(summary, aStat.id, student);
        submittedCount += c.submitted;
        forgotCount += c.forgot;
        validCount += c.valid;

        // クラスの提出率との差分（休・免除のみ / 対象外の場合は比較しない）
        const individualRate = HistoryView.rateOf(c.submitted, c.valid);
        return {
          title: aStat.title,
          statusText: HistoryView.statusTextFor(c),
          dateText: formatDate(c.lastAt),
          classRate: `${aStat.rate}%`,
          diffText: individualRate === null ? '-' : `${signed(individualRate - aStat.rate)}%`
        };
      });

      classTotalSubmitted += submittedCount;
      classTotalValid += validCount;

      return { student, submittedCount, forgotCount, validCount, rate: HistoryView.rateOf(submittedCount, validCount), assignmentResults };
    });

    const classAvgRate = HistoryView.rateOf(classTotalSubmitted, classTotalValid) ?? 0;

    const wb = XLSX.utils.book_new();
    const uniqueSheetName = (name) => {
      const base = name.replace(/[\\/*?:\[\]]/g, '_').substring(0, 31);
      let finalName = base;
      let counter = 1;
      while (wb.SheetNames.includes(finalName)) {
        finalName = `${base.substring(0, 28)}_${counter}`;
        counter++;
      }
      return finalName;
    };

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
      row['個人提出率(%)'] = stat.rate === null ? '-' : stat.rate;
      row['平均との差(%)'] = stat.rate === null ? '-' : signed(stat.rate - classAvgRate);

      return row;
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{wch: 10}, {wch: 15}, {wch: 12}]; // 以降の動的な列幅は省略
    XLSX.utils.book_append_sheet(wb, wsSummary, "全体まとめ");

    // ----------------------------------------------------
    // 各個人のシート生成
    // ----------------------------------------------------
    studentStats.forEach(stat => {
      const aoa = [
        ["【個人成績レポート】"],
        ["集計期間", HistoryView.getFilterRange('history-table').label],
        ["氏名", stat.student.name, "出席番号", stat.student.number],
        ["クラス", stat.student.class || "-"],
        [],
        ["クラス平均提出率", `${classAvgRate}%`],
        ["個人の提出率", stat.rate === null ? '-' : `${stat.rate}%`],
        ["平均との差", stat.rate === null ? '-' : `${signed(stat.rate - classAvgRate)}%`],
        ["合計提出回数", `${stat.submittedCount}回`],
        ["忘れ回数", `${stat.forgotCount}回`],
        [],
        ["提出物名", "状態", "クラスの提出率", "平均との差", "最終記録日時"]
      ];

      stat.assignmentResults.forEach(ar => {
        aoa.push([ar.title, ar.statusText, ar.classRate, ar.diffText, ar.dateText]);
      });

      const wsStudent = XLSX.utils.aoa_to_sheet(aoa);
      wsStudent['!cols'] = [{wch: 25}, {wch: 14}, {wch: 15}, {wch: 15}, {wch: 20}];
      XLSX.utils.book_append_sheet(wb, wsStudent, uniqueSheetName(`${stat.student.number}_${stat.student.name}`));
    });

    // ----------------------------------------------------
    // 各提出物のシート生成
    // ----------------------------------------------------
    assignmentStats.forEach(aStat => {
      const aoa = [
        [`【提出物レポート】 ${aStat.title}`],
        ["集計期間", HistoryView.getFilterRange('history-table').label],
        ["提出物名", aStat.title],
        ["対象(有効)", `${aStat.validCount}${aStat.unit}`],
        ["提出済(〇)", `${aStat.submittedCount}${aStat.unit}`],
        ["忘れ(忘)", `${aStat.forgotCount}${aStat.unit}`],
        ["クラス提出率", `${aStat.rate}%`],
        [],
        ["出席番号", "氏名", "状態", "最終記録日時"]
      ];

      // その提出物の全員の状況を追加
      data.students.forEach(student => {
        const c = HistoryView.countsFor(summary, aStat.id, student);
        aoa.push([student.number, student.name, HistoryView.statusTextFor(c), formatDate(c.lastAt)]);
      });

      const wsAssignment = XLSX.utils.aoa_to_sheet(aoa);
      wsAssignment['!cols'] = [{wch: 10}, {wch: 15}, {wch: 14}, {wch: 20}];
      XLSX.utils.book_append_sheet(wb, wsAssignment, uniqueSheetName(`物_${aStat.title}`));
    });

    const filename = `和田小_成績データ_${getLocalDateString()}.xlsx`;
    XLSX.writeFile(wb, filename);

    utils.showToast('成績データをExcelで出力しました');
  },

  // 表示期間の記録を「日付 → 提出物」ごとに、状態別の名前一覧にしてメール本文を作る
  sendEmail() {
    const data = store.data;
    const submissions = HistoryView.getFilteredSubmissions('history-table');
    if (submissions.length === 0) {
      utils.showToast('送信する履歴がありません', 'error');
      return;
    }

    const range = HistoryView.getFilterRange('history-table');
    let bodyText = `和田小宿題チェッカー 提出履歴サマリー\n対象期間: ${range.label}\n出力日時: ${new Date().toLocaleString('ja-JP')}\n`;

    const dates = [...new Set(submissions.map(s => s.date))].sort();
    dates.forEach(date => {
      bodyText += `\n===== ${date.replace(/-/g, '/')} =====\n`;
      const summary = HistoryView.summarize(submissions.filter(s => s.date === date));

      data.assignments.forEach(assignment => {
        if (!summary.has(assignment.id)) return;
        bodyText += `■ 【${assignment.title}】\n`;
        const lists = { submitted: [], forgot: [], absent: [], exempt: [], blank: [] };

        data.students.forEach(student => {
          const c = HistoryView.countsFor(summary, assignment.id, student);
          if (c.days === 0) return; // その日に回収していないクラスの児童は対象外
          const key = ['submitted', 'forgot', 'absent', 'exempt'].find(k => c[k] > 0) || 'blank';
          lists[key].push(`${student.number}.${student.name}`);
        });

        bodyText += `[〇 提出済] (${lists.submitted.length}名): ${lists.submitted.join(', ')}\n`;
        if (lists.forgot.length > 0) bodyText += `[忘 忘れ] (${lists.forgot.length}名): ${lists.forgot.join(', ')}\n`;
        if (lists.absent.length > 0) bodyText += `[休 欠席] (${lists.absent.length}名): ${lists.absent.join(', ')}\n`;
        if (lists.exempt.length > 0) bodyText += `[× 面除等] (${lists.exempt.length}名): ${lists.exempt.join(', ')}\n`;
        if (lists.blank.length > 0) bodyText += `[未入力] (${lists.blank.length}名): ${lists.blank.join(', ')}\n`;
      });
    });

    const subject = encodeURIComponent(`提出履歴レポート (${range.label})`);
    const body = encodeURIComponent(bodyText);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;

    // 長すぎる場合は警告を出す（メーラーによっては起動しないため）
    if (mailtoLink.length > 2000) {
      if (!confirm('履歴データが長いため、一部のメールアプリでは正常に起動しない可能性があります。続行しますか？')) {
        return;
      }
    }

    window.location.href = mailtoLink;
  }
};
