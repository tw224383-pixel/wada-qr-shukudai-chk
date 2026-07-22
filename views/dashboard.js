// views/dashboard.js
let dashHtml5QrcodeScanner = null;

const DashboardView = {
  render() {
    const data = store.data;
    
    // Default to 'all' if no active assignment, otherwise use the stored one
    let activeAssignmentId = localStorage.getItem('activeAssignmentId');
    if (!activeAssignmentId && data.assignments.length > 0) {
      activeAssignmentId = 'all';
    }
    
    // 今日の宿題設定を取得（未設定ならすべてを選択状態にする）
    let todayAssignments = [];
    try {
      const saved = localStorage.getItem('todayAssignments');
      if (saved) todayAssignments = JSON.parse(saved);
      else todayAssignments = data.assignments.map(a => a.id);
    } catch(e) {
      todayAssignments = data.assignments.map(a => a.id);
    }

    let mainContentHtml = '<div class="text-gray-500">提出物が登録されていません</div>';
    
    if (data.assignments.length > 0) {
      const isAllMode = activeAssignmentId === 'all';
      
      // 表示対象の提出物リストを決定
      const targetAssignments = isAllMode 
        ? data.assignments.filter(a => todayAssignments.includes(a.id))
        : data.assignments.filter(a => a.id === activeAssignmentId);

      // テーブルヘッダーの生成
      let thHtml = targetAssignments.map(a => `<th class="px-2 py-2 text-center font-medium text-gray-500 whitespace-nowrap text-xs min-w-[4rem] max-w-[8rem] truncate" title="${utils.escapeHTML(a.title)}">${utils.escapeHTML(a.title)}</th>`).join('');
      if (targetAssignments.length === 0) thHtml = `<th class="px-2 py-2 text-center font-medium text-gray-500 whitespace-nowrap text-xs">対象の提出物がありません</th>`;

      // テーブルボディの生成
      let tbodyHtml = data.students.map(student => {
        let cellsHtml = targetAssignments.map(a => {
          const sub = data.submissions.find(s => s.studentId === student.id && s.assignmentId === a.id);
          const status = sub ? sub.status : '';
          return `
            <td class="px-2 py-2 text-center">
              <button onclick="window.dashToggleStatus('${student.id}', '${a.id}')" id="status-btn-${student.id}-${a.id}" class="w-10 h-10 md:w-12 md:h-10 rounded-md font-bold text-base shadow-sm border focus:outline-none transition-colors ${getStatusClass(status)}">
                ${getStatusText(status)}
              </button>
            </td>
          `;
        }).join('');

        if (targetAssignments.length === 0) cellsHtml = `<td class="px-2 py-2 text-center text-gray-400">-</td>`;

        return `
          <tr id="row-${student.id}" class="transition-colors hover:bg-gray-50">
            <td class="px-4 py-3 whitespace-nowrap text-gray-600">${utils.escapeHTML(student.number)}</td>
            <td class="px-4 py-3 font-medium whitespace-nowrap sticky left-0 bg-white z-10 drop-shadow-sm md:drop-shadow-none md:static">${utils.escapeHTML(student.name)}</td>
            ${cellsHtml}
          </tr>
        `;
      }).join('');

      // 今日の宿題設定UI
      const todaySettingsHtml = `
        <div class="mt-2 text-sm border-t pt-2 border-gray-200">
          <div class="flex justify-between items-center mb-1 cursor-pointer" onclick="document.getElementById('today-settings-list').classList.toggle('hidden')">
            <span class="text-xs font-semibold text-gray-600">「すべて」に表示する宿題を設定 ▼</span>
          </div>
          <div id="today-settings-list" class="hidden flex flex-col gap-1 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded border">
            ${data.assignments.map(a => `
              <label class="flex items-center gap-2 cursor-pointer text-xs">
                <input type="checkbox" value="${a.id}" class="today-hw-checkbox rounded text-primary focus:ring-primary h-3 w-3" ${todayAssignments.includes(a.id) ? 'checked' : ''}>
                <span class="truncate">${utils.escapeHTML(a.title)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
        
      mainContentHtml = `
        <div class="flex flex-col md:flex-row gap-4 h-full">
          <!-- 左側/上部: スキャナーと統計 -->
          <div class="w-full md:w-1/3 flex flex-col gap-4">
            
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <label class="block text-sm font-bold text-gray-700 mb-2">表示対象</label>
              <select id="dash-assignment-select" class="w-full border-gray-300 rounded-md shadow-sm border p-2 bg-gray-50 font-bold text-primary">
                <option value="all" ${isAllMode ? 'selected' : ''}>-- すべて (今日の宿題) --</option>
                ${data.assignments.map(a => `<option value="${a.id}" ${a.id === activeAssignmentId ? 'selected' : ''}>${utils.escapeHTML(a.title)}</option>`).join('')}
              </select>
              <div id="dash-today-settings-container" class="${isAllMode ? '' : 'hidden'}">
                ${todaySettingsHtml}
              </div>
            </div>

            <!-- スキャナー -->
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-shrink-0">
              <div class="flex justify-between items-center mb-2">
                  <h3 class="font-bold text-gray-800 flex items-center gap-2"><i data-lucide="scan-line" class="w-5 h-5"></i>スキャナー</h3>
                  <div class="flex items-center gap-3">
                    <label class="flex items-center gap-1 cursor-pointer text-xs text-gray-600" title="読み上げ">
                      <input type="checkbox" id="dash-audio-toggle" class="rounded text-primary focus:ring-primary h-3 w-3" checked>
                      <span>音声</span>
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer text-xs text-gray-600" title="バイブレーション">
                      <input type="checkbox" id="dash-vibe-toggle" class="rounded text-primary focus:ring-primary h-3 w-3" checked>
                      <span>バイブ</span>
                    </label>
                  </div>
              </div>
              
              <div class="mb-2 flex items-center gap-2 text-xs">
                 <span class="text-gray-600 font-medium whitespace-nowrap">成功音:</span>
                 <select id="dash-sound-select" class="border border-gray-300 rounded p-1 bg-gray-50 flex-1">
                   <option value="0">0: なし</option>
                   <option value="1">1: ピッ (標準)</option>
                   <option value="2">2: ピポ (2音)</option>
                   <option value="3">3: ポーン (チャイム)</option>
                   <option value="4">4: パパン (連続)</option>
                   <option value="5">5: キラッ (高音)</option>
                   <option value="6">6: コイン (ゲーム風)</option>
                   <option value="7">7: ピロリ (トリル)</option>
                   <option value="8">8: ぽこっ (泡)</option>
                   <option value="9">9: シャラーン (魔法)</option>
                 </select>
              </div>

              <div id="dash-qr-reader" class="w-full bg-black rounded overflow-hidden relative min-h-[200px] max-h-[300px]"></div>
              <div id="dash-scan-result" class="mt-2 p-2 rounded text-center font-bold text-sm hidden"></div>
            </div>
            
            <!-- 統計 -->
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-shrink-0">
              <h3 class="font-bold text-gray-800 mb-2 flex items-center gap-2"><i data-lucide="pie-chart" class="w-5 h-5"></i>状況サマリー</h3>
              <div class="grid grid-cols-2 gap-2 text-center" id="dash-stats">
                <!-- JSで描画 -->
              </div>
            </div>

          </div>
          
          <!-- 右側: 名簿一覧と未提出リスト -->
          <div class="w-full md:w-2/3 flex flex-col gap-4 h-[60vh] md:h-[calc(100vh-100px)] min-h-[500px]">
            
            <!-- 表コンテナ -->
            <div class="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 border border-gray-100">
                <div class="p-2 md:p-3 border-b bg-gray-50 flex justify-between items-center flex-shrink-0 flex-wrap gap-2">
                  <h2 class="font-bold text-gray-800 flex items-center gap-2 text-sm"><i data-lucide="table" class="w-4 h-4"></i>提出一覧</h2>
                  <div class="flex items-center gap-2">
                    <button id="dash-lock-btn" onclick="window.dashToggleLock()" class="text-[10px] bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded flex items-center gap-1 font-bold transition-colors border border-red-200 shadow-sm">
                      <i data-lucide="lock" class="w-3 h-3" id="dash-lock-icon"></i> <span id="dash-lock-text">編集ロック中</span>
                    </button>
                    
                    <!-- 無担モード（クラス選択） -->
                    <div class="flex items-center bg-indigo-50 border border-indigo-200 rounded px-2 py-1">
                      <i data-lucide="users" class="w-3 h-3 text-indigo-600 mr-1"></i>
                      <span class="text-[10px] font-bold text-indigo-800 mr-1 hidden sm:inline-block">無担モード:</span>
                      <select id="dash-mutan-select" class="bg-transparent text-xs font-bold text-indigo-700 outline-none cursor-pointer">
                        <option value="">全クラス(通常)</option>
                        <!-- JSで追加 -->
                      </select>
                    </div>
                  </div>
                </div>
                <div class="overflow-auto flex-1 relative bg-white">
                  <table class="min-w-full divide-y divide-gray-200 text-sm">
                  <thead class="bg-gray-100 sticky top-0 z-20 shadow-sm">
                    <tr>
                      <th class="px-4 py-2 text-left font-medium text-gray-500 w-12 whitespace-nowrap">出席番号</th>
                      <th class="px-4 py-2 text-left font-medium text-gray-500 sticky left-0 bg-gray-100 z-30 drop-shadow-sm md:drop-shadow-none md:static whitespace-nowrap">氏名</th>
                      ${thHtml}
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200" id="dash-students-tbody">
                    ${tbodyHtml}
                  </tbody>
                </table>
                </div>
            </div>

            <!-- 未提出者リストコンテナ -->
            <div class="bg-white rounded-lg shadow-sm border border-red-100 overflow-hidden flex flex-col flex-shrink-0 max-h-48">
              <div class="p-2 border-b bg-red-50 flex justify-between items-center text-red-800 flex-shrink-0 flex-wrap gap-2">
                <h3 class="font-bold flex items-center gap-2 text-sm"><i data-lucide="alert-circle" class="w-4 h-4"></i>未提出・忘れ リスト</h3>
                <div class="flex items-center gap-2">
                  <label class="flex items-center gap-1 cursor-pointer text-[10px] bg-white border border-red-200 px-2 py-1 rounded text-red-700 hover:bg-red-50 transition-colors">
                    <input type="checkbox" id="dash-unsubmitted-only-toggle" class="rounded text-red-600 focus:ring-red-500 h-3 w-3" onchange="window.dashToggleUnsubmittedOnly(this.checked)">
                    <span>未提出のみ表示</span>
                  </label>
                  <button onclick="window.dashToggleFullscreenUnsubmitted()" class="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded flex items-center gap-1 shadow-sm transition-colors">
                    <i data-lucide="maximize-2" class="w-3 h-3"></i> 全画面表示
                  </button>
                </div>
              </div>
              <div class="p-3 overflow-y-auto text-sm bg-white" id="dash-unsubmitted-list">
                <!-- JSで描画 -->
              </div>
            </div>

          </div>
        </div>

        <!-- 未提出全画面モーダル -->
        <div id="dash-unsubmitted-modal" class="fixed inset-0 bg-black bg-opacity-60 z-50 hidden flex items-center justify-center p-4 md:p-8 backdrop-blur-sm transition-opacity">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border-2 border-red-200">
            <div class="bg-red-50 p-4 border-b flex justify-between items-center flex-shrink-0">
              <h2 class="text-xl font-bold text-red-800 flex items-center gap-2"><i data-lucide="alert-circle" class="w-6 h-6"></i>未提出・忘れ 全画面リスト</h2>
              <button onclick="window.dashToggleFullscreenUnsubmitted()" class="text-gray-500 hover:text-gray-800 bg-white rounded-full p-2 hover:bg-red-100 transition-colors shadow-sm focus:outline-none">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
            <div id="dash-unsubmitted-modal-content" class="p-6 overflow-y-auto flex-1 bg-gray-50">
              <!-- JSで描画 -->
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="max-w-7xl mx-auto h-full pb-6 px-2 md:px-0">
        ${mainContentHtml}
      </div>
    `;
  },
  
  afterRender() {
    lucide.createIcons();
    const select = document.getElementById('dash-assignment-select');
    
    if (select) {
      select.addEventListener('change', (e) => {
        localStorage.setItem('activeAssignmentId', e.target.value);
        DashboardView.updateTableAndStats();
      });
    }

    // 今日の宿題設定の変更監視
    const hwCheckboxes = document.querySelectorAll('.today-hw-checkbox');
    hwCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const checkedIds = Array.from(document.querySelectorAll('.today-hw-checkbox:checked')).map(el => el.value);
        localStorage.setItem('todayAssignments', JSON.stringify(checkedIds));
        DashboardView.updateTableAndStats();
      });
    });

    // 設定値のロードと保存リスナー
    const audioToggle = document.getElementById('dash-audio-toggle');
    if (audioToggle) {
      audioToggle.checked = localStorage.getItem('audioEnabled') !== 'false';
      audioToggle.addEventListener('change', (e) => localStorage.setItem('audioEnabled', e.target.checked));
    }

    const vibeToggle = document.getElementById('dash-vibe-toggle');
    if (vibeToggle) {
      vibeToggle.checked = localStorage.getItem('vibrateEnabled') !== 'false';
      vibeToggle.addEventListener('change', (e) => {
        localStorage.setItem('vibrateEnabled', e.target.checked);
        if (e.target.checked) utils.vibrate(200);
      });
    }

    const soundSelect = document.getElementById('dash-sound-select');
    if (soundSelect) {
      soundSelect.value = localStorage.getItem('scanSoundIndex') || '1';
      soundSelect.addEventListener('change', (e) => {
        localStorage.setItem('scanSoundIndex', e.target.value);
        utils.playSuccessSound(e.target.value);
      });
    }

    // 無担モードのクラスリスト構築とリスナー
    const mutanSelect = document.getElementById('dash-mutan-select');
    if (mutanSelect) {
      const classes = [...new Set(store.data.students.map(s => s.class).filter(Boolean))].sort();
      classes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        mutanSelect.appendChild(opt);
      });
      
      const savedMutan = localStorage.getItem('mutanModeClass');
      if (savedMutan && classes.includes(savedMutan)) {
        mutanSelect.value = savedMutan;
      }
      
      mutanSelect.addEventListener('change', (e) => {
        localStorage.setItem('mutanModeClass', e.target.value);
        DashboardView.updateTableAndStats();
      });
    }

    DashboardView.updateStatsUI();
    DashboardView.updateUnsubmittedListUI();

    window.isStatusEditUnlocked = false;
    window.showOnlyUnsubmitted = false;

    window.dashToggleLock = () => {
      const savedPassword = localStorage.getItem('statusEditPassword');
      if (window.isStatusEditUnlocked) {
        // ロックする
        window.isStatusEditUnlocked = false;
        DashboardView.updateLockUI();
        utils.showToast('編集をロックしました');
      } else {
        // ロック解除する
        if (!savedPassword) {
          const newPass = prompt('初回設定: ステータス編集用のパスワードを任意で設定してください。\n（設定しない場合は空欄でOKを押してください）');
          if (newPass !== null) {
            localStorage.setItem('statusEditPassword', newPass);
            window.isStatusEditUnlocked = true;
            DashboardView.updateLockUI();
            utils.showToast('パスワードを設定し、ロックを解除しました');
          }
        } else {
          const input = prompt('パスワードを入力してください');
          if (input === savedPassword) {
            window.isStatusEditUnlocked = true;
            DashboardView.updateLockUI();
            utils.showToast('ロックを解除しました');
          } else if (input !== null) {
            utils.showToast('パスワードが違います', 'error');
          }
        }
      }
    };

    window.dashToggleUnsubmittedOnly = (checked) => {
      window.showOnlyUnsubmitted = checked;
      DashboardView.updateUnsubmittedListUI();
    };

    // グローバルトグル関数
    window.dashToggleStatus = (studentId, assignmentId) => {
      if (!window.isStatusEditUnlocked) {
        utils.showToast('編集ロックが掛かっています。「編集ロック中」ボタンを押して解除してください。', 'warning');
        return;
      }
      if (!assignmentId) return;
      const newStatus = store.toggleSubmissionStatus(studentId, assignmentId);
      DashboardView.updateRowUI(studentId, assignmentId, newStatus);
      DashboardView.updateStatsUI();
      DashboardView.updateUnsubmittedListUI();
    };

    window.dashToggleFullscreenUnsubmitted = () => {
      const modal = document.getElementById('dash-unsubmitted-modal');
      if (modal) {
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
          lucide.createIcons({ root: modal });
        }
      }
    };

    // Initialize scanner
    setTimeout(() => {
      if (!document.getElementById('dash-qr-reader')) return;
      
      const startScanner = () => {
        const readerElement = document.getElementById('dash-qr-reader');
        if (!readerElement) return;

        // すでにインスタンスがあればクリア
        if (dashHtml5QrcodeScanner) {
          try {
            dashHtml5QrcodeScanner.clear();
          } catch(e) {}
        }
        
        dashHtml5QrcodeScanner = new Html5Qrcode("dash-qr-reader");
        
        let lastScannedText = "";
        let lastScannedTime = 0;

        const onScanSuccess = (decodedText, decodedResult) => {
          const now = Date.now();
          if (decodedText === lastScannedText && now - lastScannedTime < 2000) {
            return;
          }
          lastScannedText = decodedText;
          lastScannedTime = now;

          const mode = document.getElementById('dash-assignment-select')?.value;
          if (!mode) return;
          const enableAudio = document.getElementById('dash-audio-toggle')?.checked;
          const enableVibe = document.getElementById('dash-vibe-toggle')?.checked;
          const soundIndex = document.getElementById('dash-sound-select')?.value || '1';
          
          try {
            const qrData = JSON.parse(decodedText);
            if (!qrData.s || !qrData.a) throw new Error("Invalid Format");
            
            const student = store.data.students.find(s => s.id === qrData.s);
            const assignment = store.data.assignments.find(a => a.id === qrData.a);

            if (!student || !assignment) {
              utils.playBeep('error');
              if (enableVibe) utils.vibrate([200, 100, 200]);
              DashboardView.showScanResult(`未登録のQRです`, 'error');
              return;
            }

            // --- スキャン対象の判定 ---
            let isTarget = false;
            if (mode === 'all') {
              const saved = localStorage.getItem('todayAssignments');
              const todayAssings = saved ? JSON.parse(saved) : store.data.assignments.map(a=>a.id);
              if (todayAssings.includes(qrData.a)) isTarget = true;
            } else {
              if (mode === qrData.a) isTarget = true;
            }

            if (!isTarget) {
              utils.playBeep('error');
              if (enableVibe) utils.vibrate([200, 100, 200]);
              DashboardView.showScanResult(`【対象外】${utils.escapeHTML(assignment.title)}`, 'error');
              if (enableAudio) utils.speak(`それは違う宿題です`);
              return;
            }

            // 対象なので受理する
            const success = store.addSubmission(qrData.s, qrData.a, 'submitted');
            
            if (success) {
              utils.playSuccessSound(soundIndex);
              if (enableVibe) utils.vibrate(200);
              DashboardView.showScanResult(`【受付】 ${utils.escapeHTML(student.name)}さん`, 'success');
              if (enableAudio) utils.speak(`${student.number}番、提出しました`);
              
              // UI反映
              DashboardView.updateRowUI(qrData.s, qrData.a, 'submitted');
              DashboardView.highlightRow(qrData.s);
              DashboardView.updateStatsUI();
              DashboardView.updateUnsubmittedListUI();

            } else {
              // すでに〇の場合
              utils.playBeep('warning');
              if (enableVibe) utils.vibrate([100, 50, 100]);
              DashboardView.showScanResult(`【重複】 ${utils.escapeHTML(student.name)}さん済`, 'warning');
              if (enableAudio) utils.speak(`提出済みです`);
              DashboardView.highlightRow(qrData.s);
            }

          } catch(e) {
            utils.playBeep('error');
            DashboardView.showScanResult(`無効なQR`, 'error');
          }
        };

        const onScanError = (error) => {};

        // 設定: 0はHtml5QrcodeSupportedFormats.QR_CODEを意味する
        const scannerConfig = { 
          fps: 15, 
          formatsToSupport: [ 0 ]
        };

        const tryStartCamera = (facingMode, config, fallbackFn) => {
          dashHtml5QrcodeScanner.start(
            { facingMode: facingMode },
            config,
            onScanSuccess,
            onScanError
          ).catch(e => {
            console.warn(`Camera start failed for ${facingMode}`, e);
            if (fallbackFn) fallbackFn();
            else DashboardView.showScanResult("カメラの起動に失敗しました", "error");
          });
        };

        // フォールバック戦略: environment -> user -> エラー
        tryStartCamera("environment", scannerConfig, () => {
          tryStartCamera("user", scannerConfig, null);
        });
      };

      startScanner();
    }, 100);

    DashboardView.updateLockUI();
  },

  updateLockUI() {
    const btnText = document.getElementById('dash-lock-text');
    const btnIcon = document.getElementById('dash-lock-icon');
    const btn = document.getElementById('dash-lock-btn');
    if (!btn || !btnText || !btnIcon) return;

    if (window.isStatusEditUnlocked) {
      btnText.textContent = '編集中 (解除済)';
      btn.className = 'text-[10px] bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded flex items-center gap-1 font-bold transition-colors border border-green-200 shadow-sm';
      btnIcon.setAttribute('data-lucide', 'unlock');
    } else {
      btnText.textContent = '編集ロック中';
      btn.className = 'text-[10px] bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded flex items-center gap-1 font-bold transition-colors border border-red-200 shadow-sm';
      btnIcon.setAttribute('data-lucide', 'lock');
    }
    lucide.createIcons({ root: btn });
  },

  getDisplayStudents() {
    const data = store.data;
    const mutanClass = localStorage.getItem('mutanModeClass');
    if (mutanClass) {
      // 指定クラスのみ抽出し、出席番号順（数値としてパースできれば数値比較、できなければ文字列比較）にソート
      return data.students
        .filter(s => s.class === mutanClass)
        .sort((a, b) => {
          const numA = parseInt(a.number, 10);
          const numB = parseInt(b.number, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return a.number.localeCompare(b.number);
        });
    }
    return data.students;
  },

  updateTableAndStats() {
    const data = store.data;
    let activeAssignmentId = localStorage.getItem('activeAssignmentId') || 'all';
    let todayAssignments = [];
    try {
      const saved = localStorage.getItem('todayAssignments');
      todayAssignments = saved ? JSON.parse(saved) : data.assignments.map(a => a.id);
    } catch(e) {
      todayAssignments = data.assignments.map(a => a.id);
    }

    const isAllMode = activeAssignmentId === 'all';
    const targetAssignments = isAllMode 
      ? data.assignments.filter(a => todayAssignments.includes(a.id))
      : data.assignments.filter(a => a.id === activeAssignmentId);

    // Update table headers
    let thHtml = targetAssignments.map(a => `<th class="px-2 py-2 text-center font-medium text-gray-500 whitespace-nowrap text-xs min-w-[4rem] max-w-[8rem] truncate" title="${utils.escapeHTML(a.title)}">${utils.escapeHTML(a.title)}</th>`).join('');
    if (targetAssignments.length === 0) thHtml = `<th class="px-2 py-2 text-center font-medium text-gray-500 whitespace-nowrap text-xs">対象の提出物がありません</th>`;
    
    const theadTr = document.querySelector('thead tr');
    if (theadTr) {
      theadTr.innerHTML = `
        <th class="px-4 py-2 text-left font-medium text-gray-500 w-12 whitespace-nowrap">出席番号</th>
        <th class="px-4 py-2 text-left font-medium text-gray-500 sticky left-0 bg-gray-100 z-30 drop-shadow-sm md:drop-shadow-none md:static whitespace-nowrap">氏名</th>
        ${thHtml}
      `;
    }

    const displayStudents = DashboardView.getDisplayStudents();

    // Update table body
    let tbodyHtml = displayStudents.map(student => {
      let cellsHtml = targetAssignments.map(a => {
        const sub = data.submissions.find(s => s.studentId === student.id && s.assignmentId === a.id);
        const status = sub ? sub.status : '';
        return `
          <td class="px-2 py-2 text-center">
            <button onclick="window.dashToggleStatus('${student.id}', '${a.id}')" id="status-btn-${student.id}-${a.id}" class="w-10 h-10 md:w-12 md:h-10 mx-auto rounded-md font-bold text-base shadow-sm border focus:outline-none transition-colors ${getStatusClass(status)}">
              ${getStatusText(status)}
            </button>
          </td>
        `;
      }).join('');
      
      if (targetAssignments.length === 0) cellsHtml = `<td class="px-2 py-2 text-center text-gray-400">-</td>`;

      return `
        <tr id="row-${student.id}" class="transition-colors hover:bg-gray-50">
          <td class="px-4 py-3 whitespace-nowrap text-gray-600">${utils.escapeHTML(student.number)}</td>
          <td class="px-4 py-3 font-medium whitespace-nowrap sticky left-0 bg-white z-10 drop-shadow-sm md:drop-shadow-none md:static">${utils.escapeHTML(student.name)}</td>
          ${cellsHtml}
        </tr>
      `;
    }).join('');
    
    const tbody = document.getElementById('dash-students-tbody');
    if (tbody) tbody.innerHTML = tbodyHtml;

    // Toggle today settings visibility
    const settingsDiv = document.getElementById('dash-today-settings-container');
    if (settingsDiv) {
      if (isAllMode) settingsDiv.classList.remove('hidden');
      else settingsDiv.classList.add('hidden');
    }

    DashboardView.updateStatsUI();
    DashboardView.updateUnsubmittedListUI();
  },

  updateRowUI(studentId, assignmentId, status) {
    const btn = document.getElementById(`status-btn-${studentId}-${assignmentId}`);
    if (btn) {
      btn.className = `w-10 h-10 md:w-12 md:h-10 mx-auto rounded-md font-bold text-base shadow-sm border focus:outline-none transition-colors ${getStatusClass(status)}`;
      btn.innerHTML = getStatusText(status);
    }
  },

  highlightRow(studentId) {
    const row = document.getElementById(`row-${studentId}`);
    if (row) {
      row.classList.add('bg-green-100');
      setTimeout(() => {
        row.classList.remove('bg-green-100');
      }, 1500);
      
      // Attempt to scroll row into view nicely without breaking container bounds
      const container = row.closest('.overflow-auto');
      if (container) {
        const rowRect = row.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        if (rowRect.top < contRect.top || rowRect.bottom > contRect.bottom) {
           row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  },

  getTargetAssignments() {
    const mode = document.getElementById('dash-assignment-select')?.value;
    const data = store.data;
    if (mode === 'all') {
      const saved = localStorage.getItem('todayAssignments');
      const todayIds = saved ? JSON.parse(saved) : data.assignments.map(a=>a.id);
      return data.assignments.filter(a => todayIds.includes(a.id));
    } else {
      return data.assignments.filter(a => a.id === mode);
    }
  },

  updateStatsUI() {
    const statsContainer = document.getElementById('dash-stats');
    if (!statsContainer) return;
    
    const targetAssignments = this.getTargetAssignments();
    if (targetAssignments.length === 0) {
      statsContainer.innerHTML = `<div class="col-span-2 text-gray-500 text-xs py-2">対象がありません</div>`;
      return;
    }

    // 「すべて」の時は統計を省略（複雑化を避けるため）、またはシンプルに表示
    const mode = document.getElementById('dash-assignment-select')?.value;
    if (mode === 'all') {
      statsContainer.innerHTML = `
        <div class="col-span-2 bg-blue-50 p-2 rounded text-xs text-blue-800 border border-blue-100">
          「今日の宿題」 ${targetAssignments.length}件 を表示中<br>
          <span class="text-gray-500 text-[10px]">下の未提出リストをご確認ください</span>
        </div>
      `;
      return;
    }

    const data = store.data;
    const displayStudents = DashboardView.getDisplayStudents();
    const total = displayStudents.length;
    let submittedCount = 0;
    let forgotCount = 0;
    let exemptCount = 0;
    let absentCount = 0;
    let blankCount = 0;
    const targetA = targetAssignments[0].id;

    displayStudents.forEach(student => {
      const sub = data.submissions.find(s => s.studentId === student.id && s.assignmentId === targetA);
      const status = sub ? sub.status : '';
      if (status === 'submitted') submittedCount++;
      else if (status === 'forgot') forgotCount++;
      else if (status === 'exempt') exemptCount++;
      else if (status === 'absent') absentCount++;
      else blankCount++;
    });

    statsContainer.innerHTML = `
      <div class="bg-gray-100 p-2 rounded text-xs text-gray-600">対象<br><span class="font-bold text-base text-gray-800">${total}</span></div>
      <div class="bg-blue-50 p-2 rounded text-xs text-blue-600 border border-blue-200">提出<br><span class="font-bold text-base text-blue-800">${submittedCount}</span></div>
      <div class="bg-yellow-50 p-2 rounded text-xs text-yellow-600 border border-yellow-200">忘れ<br><span class="font-bold text-base text-yellow-800">${forgotCount}</span></div>
      <div class="bg-purple-50 p-2 rounded text-xs text-purple-600 border border-purple-200">休<br><span class="font-bold text-base text-purple-800">${absentCount}</span></div>
      <div class="col-span-2 bg-gray-50 p-1 rounded text-[10px] text-gray-500 border mt-1">未入力: ${blankCount}人 / 面除: ${exemptCount}人</div>
    `;
  },

  updateUnsubmittedListUI() {
    const listContainer = document.getElementById('dash-unsubmitted-list');
    const modalContainer = document.getElementById('dash-unsubmitted-modal-content');
    if (!listContainer) return;

    const data = store.data;
    const targetAssignments = this.getTargetAssignments();

    if (targetAssignments.length === 0) {
      listContainer.innerHTML = `<div class="text-gray-400 text-center py-2 text-xs">対象の提出物がありません</div>`;
      if (modalContainer) modalContainer.innerHTML = `<div class="text-gray-400 text-center py-10 text-lg">対象の提出物がありません</div>`;
      return;
    }

    const displayStudents = DashboardView.getDisplayStudents();

    // 各児童の未提出をリストアップ
    let unsubmittedLines = [];
    let modalLines = [];
    
    displayStudents.forEach(student => {
      let missingList = [];
      targetAssignments.forEach(a => {
        const sub = data.submissions.find(s => s.studentId === student.id && s.assignmentId === a.id);
        const status = sub ? sub.status : '';
        // "休" (absent) は未提出リストに含めない。
        // 未提出のみ表示がONの場合は forgot も含めない。
        if (status === '') {
          missingList.push(a.title);
        } else if (status === 'forgot' && !window.showOnlyUnsubmitted) {
          missingList.push(`[忘] ${a.title}`);
        }
      });
      if (missingList.length > 0) {
        unsubmittedLines.push(`
          <div class="flex flex-col border-b border-gray-100 py-2 last:border-0">
            <span class="font-bold text-red-700">${utils.escapeHTML(student.number)}. ${utils.escapeHTML(student.name)}</span>
            <span class="text-xs text-red-500 pl-4">未提出: ${utils.escapeHTML(missingList.join(', '))}</span>
          </div>
        `);
        modalLines.push(`
          <div class="bg-white border border-red-200 p-4 rounded-lg shadow-sm hover:shadow transition-shadow">
            <div class="font-bold text-lg text-red-800 mb-2 border-b border-red-100 pb-2">${utils.escapeHTML(student.number)}. ${utils.escapeHTML(student.name)}</div>
            <ul class="list-disc pl-5 text-sm text-red-600 space-y-1">
              ${missingList.map(m => `<li>${utils.escapeHTML(m)}</li>`).join('')}
            </ul>
          </div>
        `);
      }
    });

    if (unsubmittedLines.length === 0) {
      const emptyHtml = `
        <div class="text-center py-4 flex flex-col items-center gap-2 text-emerald-600">
          <i data-lucide="check-circle" class="w-6 h-6"></i>
          <span class="font-bold">対象の未提出はありません</span>
        </div>
      `;
      listContainer.innerHTML = emptyHtml;
      if (modalContainer) modalContainer.innerHTML = `<div class="w-full h-full flex items-center justify-center">${emptyHtml}</div>`;
      lucide.createIcons({ root: listContainer });
      if (modalContainer) lucide.createIcons({ root: modalContainer });
    } else {
      listContainer.innerHTML = unsubmittedLines.join('');
      if (modalContainer) {
        modalContainer.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">${modalLines.join('')}</div>`;
      }
    }
  },

  showScanResult(text, type) {
    const el = document.getElementById('dash-scan-result');
    if (!el) return;
    el.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800', 'bg-yellow-100', 'text-yellow-800');
    
    if (type === 'success') el.classList.add('bg-green-100', 'text-green-800');
    else if (type === 'error') el.classList.add('bg-red-100', 'text-red-800');
    else if (type === 'warning') el.classList.add('bg-yellow-100', 'text-yellow-800');
    
    el.textContent = text;
    
    setTimeout(() => {
      if (el.textContent === text) {
        el.classList.add('hidden');
      }
    }, 2500);
  },

  destroy() {
    if (dashHtml5QrcodeScanner) {
      if (dashHtml5QrcodeScanner.isScanning) {
        dashHtml5QrcodeScanner.stop().then(() => {
          dashHtml5QrcodeScanner.clear();
          dashHtml5QrcodeScanner = null;
        }).catch(e => console.error("Failed to stop scanner", e));
      } else {
        dashHtml5QrcodeScanner.clear();
        dashHtml5QrcodeScanner = null;
      }
    }
  }
};

// ヘルパー関数
function getStatusClass(status) {
  if (status === 'submitted') return 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200';
  if (status === 'forgot') return 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200';
  if (status === 'absent') return 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200';
  if (status === 'exempt') return 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200';
  return 'bg-white text-gray-300 border-gray-300 hover:bg-gray-100'; // 空欄
}

function getStatusText(status) {
  if (status === 'submitted') return '〇';
  if (status === 'forgot') return '忘';
  if (status === 'absent') return '休';
  if (status === 'exempt') return '×';
  return '-';
}
