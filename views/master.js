// views/master.js
const MasterView = {
  render() {
    const data = store.data;
    
    return `
      <div class="max-w-5xl mx-auto pb-10">
        <h1 class="text-2xl font-bold mb-6 text-gray-800">マスタ管理</h1>
        
        <!-- バックアップ設定 -->
        <div class="bg-white p-6 rounded-lg shadow-sm mb-8 border border-blue-100">
          <h2 class="text-lg font-semibold flex items-center gap-2 mb-4 text-blue-800"><i data-lucide="save" class="w-5 h-5"></i>全データ・バックアップ</h2>
          <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <button id="btn-export-backup" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm whitespace-nowrap flex items-center gap-2 shadow-sm">
              <i data-lucide="download" class="w-4 h-4"></i>
              バックアップを保存 (全設定のエクスポート)
            </button>
            <div class="flex-1 w-full sm:w-auto mt-2 sm:mt-0 flex flex-col gap-1">
              <label class="flex items-center gap-2">
                <span class="sr-only">バックアップを復元</span>
                <input type="file" id="import-backup-file" accept=".json" class="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-gray-100 file:text-gray-700
                  hover:file:bg-gray-200
                "/>
              </label>
            </div>
             <button id="btn-import-backup" class="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded text-sm whitespace-nowrap flex items-center gap-2 shadow-sm">
              <i data-lucide="upload" class="w-4 h-4"></i>
              復元
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-3">※名簿、提出物リスト、これまでの提出履歴のすべてのデータが保存/復元されます。復元すると現在のデータは上書きされます。</p>
        </div>

        <!-- クラウド連携 (Firebase) -->
        <div class="bg-white p-6 rounded-lg shadow-sm mb-8 border border-purple-100">
          <div class="mb-4">
            <h2 class="text-lg font-semibold flex items-center gap-2 text-purple-800"><i data-lucide="cloud" class="w-5 h-5"></i>クラウド同期 (手動バックアップ)</h2>
          </div>

          <div class="flex flex-col md:flex-row gap-4 items-end">
            <div class="flex-1 w-full md:w-auto">
              <label class="block text-xs font-bold text-gray-700 mb-1">クラウド保存用ID (学校名・クラス名など)</label>
              <input type="text" id="cloud-sync-id" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-purple-500" placeholder="例: wada-1-1">
            </div>
            <div class="flex-1 w-full md:w-auto">
              <label class="block text-xs font-bold text-gray-700 mb-1">パスワード</label>
              <input type="password" id="cloud-sync-password" class="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-purple-500" placeholder="••••••••">
            </div>
            <div class="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
              <button id="btn-cloud-save" class="flex-1 md:flex-none bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-bold shadow-sm flex justify-center items-center gap-1 transition-colors whitespace-nowrap">
                <i data-lucide="cloud-upload" class="w-4 h-4"></i> クラウドへ保存
              </button>
              <button id="btn-cloud-load" class="flex-1 md:flex-none bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-bold shadow-sm flex justify-center items-center gap-1 transition-colors whitespace-nowrap">
                <i data-lucide="cloud-download" class="w-4 h-4"></i> クラウドから復元
              </button>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-3 text-purple-700 font-medium">
            ※通信量を抑えるため、1日の終わりに「クラウドへ保存」を押す手動運用を推奨します。<br>
            ※同じID・パスワードでの保存は<strong>1日10回まで</strong>です。
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- 児童名簿 -->
          <div class="bg-white p-6 rounded-lg shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-semibold flex items-center gap-2"><i data-lucide="users" class="w-5 h-5"></i>児童名簿</h2>
              <span class="text-sm bg-gray-100 px-2 py-1 rounded">${data.students.length}名</span>
            </div>
            
            <div class="mb-4 flex gap-2">
              <label class="block flex-1">
                <span class="sr-only">CSVインポート</span>
                <input type="file" id="import-students-file" accept=".csv" class="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                "/>
              </label>
              <button id="btn-import-students" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm whitespace-nowrap">インポート</button>
              <button id="btn-export-students" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm whitespace-nowrap flex items-center gap-1"><i data-lucide="download" class="w-4 h-4"></i> エクスポート</button>
            </div>
            <p class="text-xs text-gray-500 mb-2">CSVフォーマット: 出席番号,氏名,クラス (ヘッダ無し推奨)</p>
            
            <div class="mb-4 bg-gray-50 p-3 rounded border flex flex-col md:flex-row gap-2 items-end">
              <div class="flex-1">
                <label class="block text-xs text-gray-600 mb-1">クラス (空欄可)</label>
                <input type="text" id="add-student-class" class="w-full border border-gray-300 rounded p-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="例: 1年1組">
              </div>
              <div class="w-24">
                <label class="block text-xs text-gray-600 mb-1">出席番号</label>
                <input type="text" id="add-student-number" class="w-full border border-gray-300 rounded p-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="例: 1">
              </div>
              <div class="flex-1">
                <label class="block text-xs text-gray-600 mb-1">氏名</label>
                <input type="text" id="add-student-name" class="w-full border border-gray-300 rounded p-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="例: 山田 太郎">
              </div>
              <button id="btn-add-student" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-bold whitespace-nowrap shadow-sm transition-colors">追加</button>
            </div>

            <div class="max-h-64 overflow-y-auto border border-gray-200 rounded">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium text-gray-500">出席番号</th>
                    <th class="px-3 py-2 text-left font-medium text-gray-500">氏名</th>
                    <th class="px-3 py-2 text-left font-medium text-gray-500">クラス</th>
                    <th class="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${data.students.map(s => `
                    <tr>
                      <td class="px-3 py-2">${utils.escapeHTML(s.number)}</td>
                      <td class="px-3 py-2">${utils.escapeHTML(s.name)}</td>
                      <td class="px-3 py-2">${utils.escapeHTML(s.class || '')}</td>
                      <td class="px-3 py-2 text-right">
                        <button class="text-red-500 hover:text-red-700" onclick="deleteStudent('${s.id}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div class="mt-4 flex gap-2">
              <button onclick="clearStudents()" class="text-sm text-red-600 hover:underline">全員削除</button>
            </div>
          </div>

          <!-- 提出物リスト -->
          <div class="bg-white p-6 rounded-lg shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-semibold flex items-center gap-2"><i data-lucide="file-text" class="w-5 h-5"></i>提出物リスト</h2>
              <span class="text-sm bg-gray-100 px-2 py-1 rounded">${data.assignments.length}件</span>
            </div>
            
            <div class="mb-4 flex gap-2">
              <label class="block flex-1">
                <span class="sr-only">CSVインポート</span>
                <input type="file" id="import-assignments-file" accept=".csv" class="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-emerald-50 file:text-emerald-700
                  hover:file:bg-emerald-100
                "/>
              </label>
              <button id="btn-import-assignments" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-sm whitespace-nowrap">インポート</button>
              <button id="btn-export-assignments" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm whitespace-nowrap flex items-center gap-1"><i data-lucide="download" class="w-4 h-4"></i> エクスポート</button>
            </div>
            <p class="text-xs text-gray-500 mb-2">CSVフォーマット: 提出物名 (ヘッダ無し推奨)</p>
            
            <div class="mb-4 bg-gray-50 p-3 rounded border flex gap-2 items-end">
              <div class="flex-1">
                <label class="block text-xs text-gray-600 mb-1">提出物名</label>
                <input type="text" id="add-assignment-title" class="w-full border border-gray-300 rounded p-1.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="例: 漢字ドリル">
              </div>
              <button id="btn-add-assignment" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-sm font-bold whitespace-nowrap shadow-sm transition-colors">追加</button>
            </div>

            <div class="max-h-64 overflow-y-auto border border-gray-200 rounded">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium text-gray-500">提出物名</th>
                    <th class="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${data.assignments.map(a => `
                    <tr>
                      <td class="px-3 py-2">${utils.escapeHTML(a.title)}</td>
                      <td class="px-3 py-2 text-right">
                        <button class="text-red-500 hover:text-red-700" onclick="deleteAssignment('${a.id}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
             <div class="mt-4 flex gap-2">
              <button onclick="clearAssignments()" class="text-sm text-red-600 hover:underline">全件削除</button>
            </div>
          </div>
        </div>

        <!-- はじめに ボタン -->
        <div class="mt-10 flex justify-end">
          <button onclick="window.masterToggleGuideModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform">
            <i data-lucide="help-circle" class="w-5 h-5"></i>
            はじめに（使い方ガイド）
          </button>
        </div>

        <!-- ガイドモーダル -->
        <div id="master-guide-modal" class="fixed inset-0 bg-black bg-opacity-60 z-50 hidden flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div class="bg-indigo-50 p-4 border-b flex justify-between items-center flex-shrink-0">
              <h2 class="text-xl font-bold text-indigo-800 flex items-center gap-2"><i data-lucide="book-open" class="w-6 h-6"></i>和田小宿題チェッカー 使い方ガイド</h2>
              <button onclick="window.masterToggleGuideModal()" class="text-gray-500 hover:text-gray-800 bg-white rounded-full p-2 hover:bg-indigo-100 transition-colors shadow-sm focus:outline-none">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
            <div id="master-guide-content" class="p-6 md:p-8 overflow-y-auto flex-1 bg-white text-gray-800 space-y-6 print-friendly-content">
              
              <section>
                <h3 class="text-lg font-bold text-indigo-700 border-b-2 border-indigo-200 pb-1 mb-3">1. マスタ管理と初期設定</h3>
                <p class="text-sm leading-relaxed">
                  まずはこの「マスタ管理」画面で初期設定を行います。<br>
                  「児童名簿」と「提出物リスト」は、画面上で直接入力して追加することができます。また、エクセル等で作成したCSVファイルを用意し、「インポート」ボタンから一括で読み込むことも可能です。<br>
                  <span class="text-red-600 font-bold text-xs mt-1 inline-block">※同一クラス内で同じ出席番号を登録することはできません。</span>
                </p>
              </section>

              <section>
                <h3 class="text-lg font-bold text-indigo-700 border-b-2 border-indigo-200 pb-1 mb-3">2. QRシールの印刷</h3>
                <p class="text-sm leading-relaxed mb-2">
                  次に「QRシール印刷」画面からQRコードを印刷します。
                </p>
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm text-yellow-800 rounded">
                  <strong>【推奨設定】</strong><br>
                  「児童から全提出物を出力」モードを選び、プルダウンで<strong>「すべての児童」</strong>を選択して印刷することを強く推奨します。<br>
                  これにより、全児童のすべての提出物のQRコードが一括生成され、児童ごとにページが区切られて出力されるため、配布が非常にスムーズになります。
                </div>
              </section>

              <section>
                <h3 class="text-lg font-bold text-indigo-700 border-b-2 border-indigo-200 pb-1 mb-3">3. QRコードの配布と貼り付け</h3>
                <p class="text-sm leading-relaxed">
                  印刷したQRコードシールは切り取って児童に配布します。<br>
                  児童には、<strong>各提出物の「左下」にそれぞれのQRコードシールを貼り付ける</strong>ように指導してください。
                </p>
              </section>

              <section>
                <h3 class="text-lg font-bold text-indigo-700 border-b-2 border-indigo-200 pb-1 mb-3">4. ダッシュボードでの提出チェック</h3>
                <p class="text-sm leading-relaxed">
                  毎日の回収作業は「ダッシュボード」画面で行います。<br>
                  <strong>「スキャナー」に提出物左下のQRコードをかざすだけ</strong>で、自動的に「〇（提出済）」が記録されていきます。<br>
                  <br>
                  スキャンが成功すると音声やバイブレーションでお知らせします。読み取りを間違えた場合や、提出を忘れた児童・欠席の児童については、名簿一覧のステータスボタンを直接タップすることで手動で「〇・忘・×・空欄」を切り替えることができます。
                </p>
              </section>
            </div>
            
            <div class="p-4 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
              <button onclick="window.masterPrintGuide()" class="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded shadow flex items-center gap-2 text-sm transition-colors">
                <i data-lucide="printer" class="w-4 h-4"></i>
                PDFでダウンロード (印刷設定を開く)
              </button>
              <button onclick="window.masterToggleGuideModal()" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded shadow text-sm transition-colors">
                閉じる
              </button>
            </div>
          </div>
        </div>

      </div>
    `;
  },
  
  afterRender() {
    lucide.createIcons();

    // ------------------------------------
    // Firebase Cloud Sync
    // ------------------------------------
    const syncIdInput = document.getElementById('cloud-sync-id');
    const syncPassInput = document.getElementById('cloud-sync-password');

    // restore last used ID
    if (syncIdInput) syncIdInput.value = localStorage.getItem('lastSyncId') || '';

    document.getElementById('btn-cloud-save')?.addEventListener('click', async () => {
      const id = syncIdInput.value.trim();
      const pass = syncPassInput.value.trim();
      
      if (!id || !pass) return utils.showToast('IDとパスワードを入力してください', 'error');
      
      const btn = document.getElementById('btn-cloud-save');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> 保存中...';
      btn.disabled = true;
      
      try {
        await FirebaseSync.saveToCloud(id, pass, store.data);
        localStorage.setItem('lastSyncId', id);
        utils.showToast('クラウドにデータを保存しました');
      } catch(e) {
        utils.showToast(e.message || '保存に失敗しました', 'error');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons({ root: btn });
      }
    });

    document.getElementById('btn-cloud-load')?.addEventListener('click', async () => {
      const id = syncIdInput.value.trim();
      const pass = syncPassInput.value.trim();
      
      if (!id || !pass) return utils.showToast('IDとパスワードを入力してください', 'error');
      
      if (!confirm('現在のデータはクラウドのデータで上書きされます。本当によろしいですか？')) return;

      const btn = document.getElementById('btn-cloud-load');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> 復元中...';
      btn.disabled = true;
      
      try {
        const data = await FirebaseSync.loadFromCloud(id, pass);
        if (store.restoreData(data)) {
          localStorage.setItem('lastSyncId', id);
          utils.showToast('クラウドからデータを復元しました');
          window.app.navigate('master');
        }
      } catch(e) {
        utils.showToast(e.message || '復元に失敗しました', 'error');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons({ root: btn });
      }
    });

    // ------------------------------------
    // 児童名簿 手動追加
    // ------------------------------------
    document.getElementById('btn-add-student').addEventListener('click', () => {
      const classInput = document.getElementById('add-student-class').value.trim();
      const numberInput = document.getElementById('add-student-number').value.trim();
      const nameInput = document.getElementById('add-student-name').value.trim();

      if (!numberInput || !nameInput) {
        utils.showToast('出席番号と氏名は必須です', 'error');
        return;
      }

      // 重複バリデーション
      const duplicate = store.data.students.find(s => s.class === classInput && s.number === numberInput);
      if (duplicate) {
        utils.showToast(`エラー: ${classInput || 'クラスなし'}の出席番号 ${numberInput} は既に登録されています`, 'error');
        return;
      }

      store.addStudent({
        class: classInput,
        number: numberInput,
        name: nameInput
      });
      utils.showToast('児童を追加しました');
      window.app.navigate('master');
    });

    // ------------------------------------
    // 提出物 手動追加
    // ------------------------------------
    document.getElementById('btn-add-assignment').addEventListener('click', () => {
      const titleInput = document.getElementById('add-assignment-title').value.trim();

      if (!titleInput) {
        utils.showToast('提出物名を入力してください', 'error');
        return;
      }

      store.addAssignment({
        title: titleInput
      });
      utils.showToast('提出物を追加しました');
      window.app.navigate('master');
    });

    // ------------------------------------
    // CSV Imports
    // ------------------------------------
    document.getElementById('btn-import-students').addEventListener('click', () => {
      const fileInput = document.getElementById('import-students-file');
      if (!fileInput.files[0]) {
        utils.showToast('CSVファイルを選択してください', 'error');
        return;
      }
      Papa.parse(fileInput.files[0], {
        complete: (results) => {
          const newStudents = [];
          results.data.forEach(row => {
            if (row.length >= 2 && row[0].trim() !== '') {
              // 0: number, 1: name, 2: class
              newStudents.push({
                number: row[0].trim(),
                name: row[1].trim(),
                class: row[2] ? row[2].trim() : ''
              });
            }
          });

          if (newStudents.length > 0) {
            let hasError = false;
            let allStudents = [...store.data.students];
            
            for (let s of newStudents) {
              const duplicate = allStudents.find(existing => existing.class === s.class && existing.number === s.number);
              if (duplicate) {
                utils.showToast(`エラー: ${s.class || 'クラスなし'}の出席番号 ${s.number} が重複しています`, 'error');
                hasError = true;
                break;
              }
              allStudents.push(s);
            }

            if (!hasError) {
              store.importStudents(allStudents); // store.importStudents overwrites all, wait, we need to pass the new complete array
              utils.showToast(`${newStudents.length}件の児童データを追加しました`);
              window.app.navigate('master');
            }
          }
        }
      });
    });

    document.getElementById('btn-export-students').addEventListener('click', () => {
      if (store.data.students.length === 0) return utils.showToast('エクスポートする児童がいません', 'error');
      const exportData = store.data.students.map(s => ({
        '出席番号': s.number,
        '氏名': s.name,
        'クラス': s.class || ''
      }));
      utils.downloadCSV(`児童名簿_${new Date().toISOString().split('T')[0]}.csv`, exportData);
      utils.showToast('児童名簿をエクスポートしました');
    });

    // Assignments Import
    document.getElementById('btn-import-assignments').addEventListener('click', () => {
      const fileInput = document.getElementById('import-assignments-file');
      if (!fileInput.files[0]) {
        utils.showToast('CSVファイルを選択してください', 'error');
        return;
      }
      Papa.parse(fileInput.files[0], {
        complete: (results) => {
          const newAssignments = [];
          results.data.forEach(row => {
            if (row.length >= 1 && row[0].trim() !== '') {
              // 0: title
              newAssignments.push({
                title: row[0].trim()
              });
            }
          });
          if (newAssignments.length > 0) {
            store.importAssignments([...store.data.assignments, ...newAssignments]);
            utils.showToast(`${newAssignments.length}件の提出物を追加しました`);
            window.app.navigate('master');
          }
        }
      });
    });

    document.getElementById('btn-export-assignments').addEventListener('click', () => {
      if (store.data.assignments.length === 0) return utils.showToast('エクスポートする提出物がありません', 'error');
      const exportData = store.data.assignments.map(a => ({
        '提出物名': a.title
      }));
      utils.downloadCSV(`提出物リスト_${new Date().toISOString().split('T')[0]}.csv`, exportData);
      utils.showToast('提出物リストをエクスポートしました');
    });

    // Backup Export
    document.getElementById('btn-export-backup').addEventListener('click', () => {
      const filename = `wada-hw-backup_${new Date().toISOString().split('T')[0]}.json`;
      utils.downloadJSON(filename, store.data);
      utils.showToast('バックアップを保存しました');
    });

    // Backup Import
    document.getElementById('btn-import-backup').addEventListener('click', () => {
      const fileInput = document.getElementById('import-backup-file');
      if (!fileInput.files[0]) {
        utils.showToast('JSONファイルを選択してください', 'error');
        return;
      }
      
      if (!confirm('現在のすべてのデータが上書きされます。本当によろしいですか？')) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const newData = JSON.parse(e.target.result);
          if (store.restoreData(newData)) {
            utils.showToast('バックアップを復元しました');
            window.app.navigate('master'); // Reload view
          } else {
            utils.showToast('無効なバックアップファイルです', 'error');
          }
        } catch (err) {
          utils.showToast('ファイルの読み込みに失敗しました', 'error');
          console.error(err);
        }
      };
      reader.readAsText(fileInput.files[0]);
    });

    // Global deletion functions
    window.deleteStudent = (id) => {
      if (confirm('この児童を削除しますか？')) {
        store.removeStudent(id);
        window.app.navigate('master');
      }
    };
    window.deleteAssignment = (id) => {
      if (confirm('この提出物を削除しますか？')) {
        store.removeAssignment(id);
        window.app.navigate('master');
      }
    };
    window.clearStudents = () => {
      if (confirm('すべての児童データを削除しますか？\n（提出履歴も削除されます）')) {
        store.data.students = [];
        store.data.submissions = [];
        store.saveData();
        window.app.navigate('master');
      }
    };
    window.clearAssignments = () => {
      if (confirm('すべての提出物データを削除しますか？\n（提出履歴も削除されます）')) {
        store.data.assignments = [];
        store.data.submissions = [];
        store.saveData();
        window.app.navigate('master');
      }
    };

    window.masterToggleGuideModal = () => {
      const modal = document.getElementById('master-guide-modal');
      if (modal) {
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
          lucide.createIcons({ root: modal });
        }
      }
    };

    window.masterPrintGuide = () => {
      const content = document.getElementById('master-guide-content').innerHTML;
      const printArea = document.getElementById('print-area');
      
      printArea.innerHTML = `
        <div style="padding: 30px; font-family: sans-serif; color: #333; max-width: 800px; margin: 0 auto;">
          <h1 style="font-size: 24px; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 20px; color: #3730a3;">和田小宿題チェッカー 使い方ガイド</h1>
          ${content}
        </div>
      `;
      
      setTimeout(() => {
        window.print();
        printArea.innerHTML = '';
      }, 300);
    };
  }
};
