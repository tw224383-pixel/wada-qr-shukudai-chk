// views/dashboard.js
let dashHtml5QrcodeScanner = null;
let dashNativeStream = null;
let dashNativeAnimId = null;
let isDashNativeScanning = false;
let dashScanSession = 0; // スキャナー起動ごとの世代番号。画面離脱後に起動完了したカメラを止めるために使う
let dashDateTimer = null;
let dashWasmReady = null; // WASM版ZXingの読み込み（1回だけ行い、結果を使い回す）
const WASM_SCAN_AREA = 0.8; // 映像の短辺に対する読み取り枠の大きさ

const DashboardView = {
  _renderedDate: null,

  render() {
    const data = store.data;
    DashboardView._renderedDate = getLocalDateString();

    let mainContentHtml = '<div class="text-gray-500">提出物が登録されていません</div>';

    if (data.assignments.length > 0) {
      const activeMode = DashboardView.getActiveMode();
      const isAllMode = activeMode === 'all';
      const todayAssignments = DashboardView.getTodayAssignmentIds();
      const targetAssignments = DashboardView.getTargetAssignments();

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
                ${data.assignments.map(a => `<option value="${a.id}" ${a.id === activeMode ? 'selected' : ''}>${utils.escapeHTML(a.title)}</option>`).join('')}
              </select>
              <div id="dash-today-settings-container" class="${isAllMode ? '' : 'hidden'}">
                ${todaySettingsHtml}
              </div>
            </div>

            <!-- スキャナー -->
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-shrink-0">
              <div class="flex justify-between items-center mb-2">
                  <h3 class="font-bold text-gray-800 flex items-center gap-2">
                    <i data-lucide="scan-line" class="w-5 h-5"></i>スキャナー
                    <span id="dash-engine-badge" class="text-[10px] px-1.5 py-0.5 rounded-full font-bold hidden"></span>
                  </h3>
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
                  <h2 class="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <i data-lucide="table" class="w-4 h-4"></i>提出一覧
                    <span id="dash-date-label" class="text-xs font-bold text-primary bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5">${DashboardView.formatDateLabel(DashboardView._renderedDate)}</span>
                  </h2>
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
                    <tr id="dash-thead-row">
                      ${DashboardView.buildHeadHtml(targetAssignments)}
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200" id="dash-students-tbody">
                    ${DashboardView.buildBodyHtml(targetAssignments)}
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
        DashboardView.saveTodayAssignmentIds(checkedIds);
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
      DashboardView.getClasses().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        mutanSelect.appendChild(opt);
      });
      mutanSelect.value = DashboardView.getMutanClass();

      mutanSelect.addEventListener('change', (e) => {
        localStorage.setItem('mutanModeClass', e.target.value);
        DashboardView.updateTableAndStats();
      });
    }

    DashboardView.updateStatsUI();
    DashboardView.updateUnsubmittedListUI();

    // 画面を開いたまま日付が変わった場合に、表を新しい日の状態へ切り替える
    if (dashDateTimer) clearInterval(dashDateTimer);
    dashDateTimer = setInterval(() => DashboardView.checkDateRollover(), 30000);

    window.isStatusEditUnlocked = false;
    window.showOnlyUnsubmitted = false;

    window.dashToggleLock = async () => {
      if (window.isStatusEditUnlocked) {
        // ロックする
        window.isStatusEditUnlocked = false;
        DashboardView.updateLockUI();
        utils.showToast('編集をロックしました');
        return;
      }

      // ロック解除する
      let savedHash = localStorage.getItem('statusEditPasswordHash');

      // 旧バージョン（平文保存）からの移行: 平文キーが残っていればハッシュ化して置き換える
      const legacyPlain = localStorage.getItem('statusEditPassword');
      if (legacyPlain !== null) {
        savedHash = await utils.sha256Hex(legacyPlain);
        localStorage.setItem('statusEditPasswordHash', savedHash);
        localStorage.removeItem('statusEditPassword');
      }

      if (!savedHash) {
        const newPass = prompt('初回設定: ステータス編集用のパスワードを任意で設定してください。\n（設定しない場合は空欄でOKを押してください）');
        if (newPass !== null) {
          localStorage.setItem('statusEditPasswordHash', await utils.sha256Hex(newPass));
          window.isStatusEditUnlocked = true;
          DashboardView.updateLockUI();
          utils.showToast('パスワードを設定し、ロックを解除しました');
        }
      } else {
        const input = prompt('パスワードを入力してください');
        if (input === null) return;
        if (await utils.sha256Hex(input) === savedHash) {
          window.isStatusEditUnlocked = true;
          DashboardView.updateLockUI();
          utils.showToast('ロックを解除しました');
        } else {
          utils.showToast('パスワードが違います', 'error');
        }
      }
    };

    window.dashToggleUnsubmittedOnly = (checked) => {
      window.showOnlyUnsubmitted = checked;
      DashboardView.updateUnsubmittedListUI();
    };

    // グローバルトグル関数（今日の記録のみを切り替える）
    window.dashToggleStatus = (studentId, assignmentId) => {
      if (!window.isStatusEditUnlocked) {
        utils.showToast('編集ロックが掛かっています。「編集ロック中」ボタンを押して解除してください。', 'warning');
        return;
      }
      if (!assignmentId) return;
      if (DashboardView.checkDateRollover()) {
        // 日付が変わっていたら、前日の表のまま誤って操作しないよう表の更新だけ行う
        utils.showToast('日付が変わったため、今日の提出一覧に切り替えました', 'warning');
        return;
      }
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

      const startScanner = async () => {
        const session = ++dashScanSession;
        const isStale = () => session !== dashScanSession || !document.getElementById('dash-qr-reader');

        // すでにインスタンスやストリームがあれば、停止完了を待ってから新しく起動する
        await DashboardView.stopScanner();
        if (isStale()) return;
        const readerElement = document.getElementById('dash-qr-reader');

        let lastScannedText = "";
        let lastScannedTime = 0;
        let lastScannedKey = "";
        let lastScannedKeyTime = 0;

        const onScanSuccess = (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScannedText && now - lastScannedTime < 1500) {
            // 同じQRが映り続けている間は反応しない（枠から1.5秒以上外れてから再度かざすと反応）
            lastScannedTime = now;
            return;
          }
          lastScannedText = decodedText;
          lastScannedTime = now;

          if (!document.getElementById('dash-assignment-select')) return;
          const enableAudio = document.getElementById('dash-audio-toggle')?.checked;
          const enableVibe = document.getElementById('dash-vibe-toggle')?.checked;
          const soundIndex = document.getElementById('dash-sound-select')?.value || '1';

          // 日付が変わっていれば、記録する前に表を新しい日の状態へ切り替える
          DashboardView.checkDateRollover();

          let studentId = null;
          let assignmentId = null;
          const text = (decodedText || '').trim();

          if (text.startsWith('{')) {
            // 1. 従来形式 (JSON: {"s":"...","a":"..."})
            try {
              const qrData = JSON.parse(text);
              studentId = qrData.s;
              assignmentId = qrData.a;
            } catch(e) {}
          } else if (text.includes(':')) {
            // 2. コロン区切り形式 (studentId:assignmentId または W:studentId:assignmentId)
            let raw = text;
            if (raw.startsWith('W:')) raw = raw.substring(2);
            const colonIdx = raw.indexOf(':');
            if (colonIdx !== -1) {
              studentId = raw.substring(0, colonIdx);
              assignmentId = raw.substring(colonIdx + 1);
            }
          }

          // 3. 安全フォールバック（登録済みデータとの直接突合マッチング）
          if (!studentId || !assignmentId || !store.data.students.some(s => s.id === studentId) || !store.data.assignments.some(a => a.id === assignmentId)) {
            for (const s of store.data.students) {
              if (text.startsWith(s.id)) {
                const rest = text.substring(s.id.length).replace(/^[:_]/, '');
                const matchedA = store.data.assignments.find(a => a.id === rest);
                if (matchedA) {
                  studentId = s.id;
                  assignmentId = matchedA.id;
                  break;
                }
              }
            }
          }

          if (!studentId || !assignmentId) {
            utils.playBeep('error');
            if (enableVibe) utils.vibrate([200, 100, 200]);
            DashboardView.showScanResult(`無効なQR`, 'error');
            return;
          }

          const student = store.data.students.find(s => s.id === studentId);
          const assignment = store.data.assignments.find(a => a.id === assignmentId);

          if (!student || !assignment) {
            utils.playBeep('error');
            if (enableVibe) utils.vibrate([200, 100, 200]);
            DashboardView.showScanResult(`未登録のQRです`, 'error');
            return;
          }

          // 解析後の実体（児童×提出物）ベースでも重複を防止する
          // （同じ組み合わせでもQRの生データ表記が異なるケースで二重反応するのを防ぐ）
          const scanKey = `${studentId}::${assignmentId}`;
          if (scanKey === lastScannedKey && now - lastScannedKeyTime < 1500) {
            lastScannedKeyTime = now;
            return;
          }
          lastScannedKey = scanKey;
          lastScannedKeyTime = now;

          // --- スキャン対象の判定（画面に表示されている提出物・クラスと一致させる） ---
          if (!DashboardView.getTargetAssignments().some(a => a.id === assignmentId)) {
            utils.playBeep('error');
            if (enableVibe) utils.vibrate([200, 100, 200]);
            DashboardView.showScanResult(`【対象外】${assignment.title}`, 'error');
            if (enableAudio) utils.speak(`それは違う宿題です`);
            return;
          }

          const mutanClass = DashboardView.getMutanClass();
          if (mutanClass && student.class !== mutanClass) {
            utils.playBeep('error');
            if (enableVibe) utils.vibrate([200, 100, 200]);
            DashboardView.showScanResult(`【対象外】${student.class || 'クラスなし'}の児童です`, 'error');
            if (enableAudio) utils.speak(`ほかのクラスの児童です`);
            return;
          }

          // 対象なので受理する（今日の記録として保存）
          const success = store.addSubmission(studentId, assignmentId, 'submitted');

          if (success) {
            utils.playSuccessSound(soundIndex);
            if (enableVibe) utils.vibrate(200);
            DashboardView.showScanResult(`【受付】 ${student.name}さん`, 'success');
            if (enableAudio) utils.speak(`${student.number}番、提出しました`);

            // UI反映
            DashboardView.updateRowUI(studentId, assignmentId, 'submitted');
            DashboardView.highlightRow(studentId);
            DashboardView.updateStatsUI();
            DashboardView.updateUnsubmittedListUI();

          } else {
            // 今日すでに〇の場合
            utils.playBeep('warning');
            if (enableVibe) utils.vibrate([100, 50, 100]);
            DashboardView.showScanResult(`【重複】 ${student.name}さん済`, 'warning');
            if (enableAudio) utils.speak(`提出済みです`);
            DashboardView.highlightRow(studentId);
          }
        };

        // 高速エンジンの選択:
        //  1. ブラウザ内蔵の BarcodeDetector（Chrome / Android など）
        //  2. WASM版ZXing（iPad Safari はこちら。高解像度の映像を縮小せずに解析するため、
        //     遠め・多少のブレでも読め、カメラのコマ数（毎秒約30回）で試行できる）
        //  3. どちらも使えない場合（WASMの読み込み失敗など）は、下の html5-qrcode 互換スキャナー
        let detectFrame = null;
        let engineName = '';

        let nativeSupported = false;
        if ('BarcodeDetector' in window) {
          try {
            const formats = await BarcodeDetector.getSupportedFormats();
            nativeSupported = formats.includes('qr_code');
          } catch(e) {}
        }

        if (nativeSupported) {
          const detector = new BarcodeDetector({ formats: ['qr_code'] });
          detectFrame = async (video) => {
            const codes = await detector.detect(video);
            return codes && codes.length > 0 ? codes[0].rawValue : null;
          };
          engineName = 'BarcodeDetector';
        } else {
          readerElement.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-xs text-gray-300">スキャナーを準備中…</div>`;
          if (await DashboardView.loadWasmEngine()) {
            const cropCanvas = document.createElement('canvas');
            const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
            const readerOptions = { formats: ['QRCode'], tryHarder: true, maxNumberOfSymbols: 1 };
            detectFrame = async (video) => {
              // 映像中央の正方形（短辺の80% = 画面のガイド枠）を等倍で切り出して解析
              const vw = video.videoWidth, vh = video.videoHeight;
              if (!vw || !vh) return null;
              const side = Math.round(Math.min(vw, vh) * WASM_SCAN_AREA);
              if (cropCanvas.width !== side) {
                cropCanvas.width = side;
                cropCanvas.height = side;
              }
              cropCtx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, side, side);
              const results = await ZXingWASM.readBarcodes(cropCtx.getImageData(0, 0, side, side), readerOptions);
              const hit = results.find(r => r.isValid && r.text);
              return hit ? hit.text : null;
            };
            engineName = 'ZXing WASM';
          }
          if (isStale()) return;
        }

        if (detectFrame) {
          try {
            readerElement.innerHTML = `
              <video id="dash-native-video" playsinline autoplay muted class="w-full h-full object-cover"></video>
              <div class="absolute pointer-events-none border-2 border-white/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
                   style="top:${(1 - WASM_SCAN_AREA) * 50}%; height:${WASM_SCAN_AREA * 100}%; aspect-ratio:1/1; left:50%; transform:translateX(-50%);"></div>
            `;
            const video = document.getElementById('dash-native-video');

            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false
            });
            if (isStale()) {
              stream.getTracks().forEach(t => t.stop()); // 起動中に画面を離れた場合はカメラを止める
              return;
            }
            dashNativeStream = stream;
            video.srcObject = stream;
            await video.play();
            if (isStale()) return;

            isDashNativeScanning = true;

            // 解析が終わるたびに次の映像フレームで再試行する（待ち時間を挟まない）
            let isProcessing = false;
            const scheduleNext = () => {
              if (!isDashNativeScanning) return;
              if ('requestVideoFrameCallback' in video) {
                video.requestVideoFrameCallback(loop);
              } else {
                dashNativeAnimId = requestAnimationFrame(loop);
              }
            };
            const loop = async () => {
              if (!isDashNativeScanning) return;
              if (!isProcessing && video.readyState >= 2) {
                isProcessing = true;
                try {
                  const text = await detectFrame(video);
                  if (text && isDashNativeScanning) onScanSuccess(text);
                } catch(err) {
                } finally {
                  isProcessing = false;
                }
              }
              scheduleNext();
            };
            scheduleNext();

            console.log(`⚡ 高速スキャナー (${engineName}) 稼働中`);
            DashboardView.setEngineBadge('native');
            return;
          } catch(err) {
            console.warn(`${engineName} scanner start failed, falling back to Html5Qrcode`, err);
            await DashboardView.stopScanner();
            if (isStale()) return;
          }
        }

        // 2. フォールバック: Html5Qrcode（互換スキャナー）
        readerElement.innerHTML = '';
        DashboardView.setEngineBadge('fallback');
        const scanner = new Html5Qrcode("dash-qr-reader");
        dashHtml5QrcodeScanner = scanner;

        const onScanError = (error) => {};

        // 読み取り枠を絞ることでjsQRの1フレームあたりの処理量を削減し、体感速度を上げる
        const scannerConfig = {
          fps: 25,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.max(160, Math.floor(minEdge * 0.65));
            return { width: edge, height: edge };
          },
          formatsToSupport: [ 0 ],
          // 背面カメラ運用が前提のため、左右反転画像での二重デコードを無効化し高速化
          disableFlip: true,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        const tryStart = (videoConstraints, config, fallbackFn) => {
          // html5-qrcodeの第1引数(facingMode指定)はキー1つのみ許可されるため、
          // 解像度指定は config.videoConstraints 側にまとめて渡す（過剰な解像度でのキャプチャ・描画コストを回避）
          const configWithSize = {
            ...config,
            videoConstraints: { ...videoConstraints, width: { ideal: 960 }, height: { ideal: 540 } }
          };
          scanner.start(
            videoConstraints,
            configWithSize,
            onScanSuccess,
            onScanError
          ).then(() => {
            // 起動を待っている間に画面を離れていたら、ここでカメラを止める
            if (isStale()) scanner.stop().then(() => scanner.clear()).catch(() => {});
          }).catch(e => {
            if (isStale()) return;
            console.warn('Camera start failed, trying fallback', e);
            if (fallbackFn) fallbackFn();
            else DashboardView.showScanResult("カメラの起動に失敗しました", "error");
          });
        };

        // 試行順: 背面カメラ → 前面カメラ
        tryStart({ facingMode: "environment" }, scannerConfig, () => {
          // 前面カメラにフォールバックする場合のみ、鏡像対策で反転デコードを有効化
          tryStart({ facingMode: "user" }, { ...scannerConfig, disableFlip: false }, null);
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

  // --- 表示条件（画面表示・統計・スキャン判定のすべてがここを参照する） ---

  // 選択中の提出物ID。保存値が削除済みの提出物を指している場合は「すべて」に戻す
  getActiveMode() {
    const saved = localStorage.getItem('activeAssignmentId');
    if (saved && saved !== 'all' && store.data.assignments.some(a => a.id === saved)) return saved;
    return 'all';
  },

  // 「すべて」に含める提出物ID。
  // 設定保存後に追加された提出物は、チェックを外した覚えがないので自動的に含める。
  getTodayAssignmentIds() {
    const allIds = store.data.assignments.map(a => a.id);
    let saved = null;
    let known = null;
    try {
      saved = JSON.parse(localStorage.getItem('todayAssignments'));
      known = JSON.parse(localStorage.getItem('todayAssignmentsKnown'));
    } catch(e) {}
    if (!Array.isArray(saved)) return allIds;
    if (!Array.isArray(known)) {
      // 旧バージョンからの移行: 現時点の提出物を「設定済み」とみなす
      known = allIds;
      localStorage.setItem('todayAssignmentsKnown', JSON.stringify(known));
    }
    return allIds.filter(id => saved.includes(id) || !known.includes(id));
  },

  saveTodayAssignmentIds(checkedIds) {
    localStorage.setItem('todayAssignments', JSON.stringify(checkedIds));
    localStorage.setItem('todayAssignmentsKnown', JSON.stringify(store.data.assignments.map(a => a.id)));
  },

  getTargetAssignments() {
    const mode = DashboardView.getActiveMode();
    if (mode === 'all') {
      const todayIds = DashboardView.getTodayAssignmentIds();
      return store.data.assignments.filter(a => todayIds.includes(a.id));
    }
    return store.data.assignments.filter(a => a.id === mode);
  },

  getClasses() {
    return [...new Set(store.data.students.map(s => s.class).filter(Boolean))].sort();
  },

  // 無担モードのクラス。保存値のクラスが名簿から消えている場合は通常表示に戻す
  getMutanClass() {
    const saved = localStorage.getItem('mutanModeClass');
    return saved && DashboardView.getClasses().includes(saved) ? saved : '';
  },

  getDisplayStudents() {
    const mutanClass = DashboardView.getMutanClass();
    if (mutanClass) {
      // 指定クラスのみ抽出し、出席番号順（数値としてパースできれば数値比較、できなければ文字列比較）にソート
      return store.data.students
        .filter(s => s.class === mutanClass)
        .sort((a, b) => {
          const numA = parseInt(a.number, 10);
          const numB = parseInt(b.number, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return String(a.number).localeCompare(String(b.number));
        });
    }
    return store.data.students;
  },

  // 今日の提出状況 { "児童ID::提出物ID": status }（前日以前の記録は含めない）
  getTodayStatusMap() {
    const map = new Map();
    store.getSubmissionsByDate().forEach(s => map.set(`${s.studentId}::${s.assignmentId}`, s.status));
    return map;
  },

  formatDateLabel(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const wd = '日月火水木金土'[new Date(y, m - 1, d).getDay()];
    return `${m}/${d}(${wd})`;
  },

  // 表示中の日付が今日でなければ表を作り直す。作り直した場合は true
  checkDateRollover() {
    const today = getLocalDateString();
    if (DashboardView._renderedDate === today) return false;
    if (!document.getElementById('dash-students-tbody')) return false;
    DashboardView.updateTableAndStats();
    return true;
  },

  buildHeadHtml(targetAssignments) {
    let thHtml = targetAssignments.map(a => `<th class="px-2 py-2 text-center font-medium text-gray-500 whitespace-nowrap text-xs min-w-[4rem] max-w-[8rem] truncate" title="${utils.escapeHTML(a.title)}">${utils.escapeHTML(a.title)}</th>`).join('');
    if (targetAssignments.length === 0) thHtml = `<th class="px-2 py-2 text-center font-medium text-gray-500 whitespace-nowrap text-xs">対象の提出物がありません</th>`;
    return `
      <th class="px-4 py-2 text-left font-medium text-gray-500 w-12 whitespace-nowrap">出席番号</th>
      <th class="px-4 py-2 text-left font-medium text-gray-500 sticky left-0 bg-gray-100 z-30 drop-shadow-sm md:drop-shadow-none md:static whitespace-nowrap">氏名</th>
      ${thHtml}
    `;
  },

  buildBodyHtml(targetAssignments) {
    const statusMap = DashboardView.getTodayStatusMap();
    return DashboardView.getDisplayStudents().map(student => {
      let cellsHtml = targetAssignments.map(a => {
        const status = statusMap.get(`${student.id}::${a.id}`) || '';
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
  },

  updateTableAndStats() {
    DashboardView._renderedDate = getLocalDateString();
    const targetAssignments = DashboardView.getTargetAssignments();
    const isAllMode = DashboardView.getActiveMode() === 'all';

    const select = document.getElementById('dash-assignment-select');
    if (select) select.value = DashboardView.getActiveMode();

    const theadTr = document.getElementById('dash-thead-row');
    if (theadTr) theadTr.innerHTML = DashboardView.buildHeadHtml(targetAssignments);

    const tbody = document.getElementById('dash-students-tbody');
    if (tbody) tbody.innerHTML = DashboardView.buildBodyHtml(targetAssignments);

    const dateLabel = document.getElementById('dash-date-label');
    if (dateLabel) dateLabel.textContent = DashboardView.formatDateLabel(DashboardView._renderedDate);

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

  updateStatsUI() {
    const statsContainer = document.getElementById('dash-stats');
    if (!statsContainer) return;

    const targetAssignments = DashboardView.getTargetAssignments();
    if (targetAssignments.length === 0) {
      statsContainer.innerHTML = `<div class="col-span-2 text-gray-500 text-xs py-2">対象がありません</div>`;
      return;
    }

    // 「すべて」の時は統計を省略（複雑化を避けるため）、またはシンプルに表示
    if (DashboardView.getActiveMode() === 'all') {
      statsContainer.innerHTML = `
        <div class="col-span-2 bg-blue-50 p-2 rounded text-xs text-blue-800 border border-blue-100">
          「今日の宿題」 ${targetAssignments.length}件 を表示中<br>
          <span class="text-gray-500 text-[10px]">下の未提出リストをご確認ください</span>
        </div>
      `;
      return;
    }

    const statusMap = DashboardView.getTodayStatusMap();
    const displayStudents = DashboardView.getDisplayStudents();
    const total = displayStudents.length;
    let submittedCount = 0;
    let forgotCount = 0;
    let exemptCount = 0;
    let absentCount = 0;
    let blankCount = 0;
    const targetA = targetAssignments[0].id;

    displayStudents.forEach(student => {
      const status = statusMap.get(`${student.id}::${targetA}`) || '';
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

    const targetAssignments = DashboardView.getTargetAssignments();

    if (targetAssignments.length === 0) {
      listContainer.innerHTML = `<div class="text-gray-400 text-center py-2 text-xs">対象の提出物がありません</div>`;
      if (modalContainer) modalContainer.innerHTML = `<div class="text-gray-400 text-center py-10 text-lg">対象の提出物がありません</div>`;
      return;
    }

    const statusMap = DashboardView.getTodayStatusMap();
    const displayStudents = DashboardView.getDisplayStudents();

    // 各児童の未提出をリストアップ
    let unsubmittedLines = [];
    let modalLines = [];

    displayStudents.forEach(student => {
      let missingList = [];
      targetAssignments.forEach(a => {
        const status = statusMap.get(`${student.id}::${a.id}`) || '';
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

  setEngineBadge(mode) {
    const badge = document.getElementById('dash-engine-badge');
    if (!badge) return;
    badge.classList.remove('hidden', 'bg-emerald-100', 'text-emerald-700', 'bg-amber-100', 'text-amber-700');
    if (mode === 'native') {
      badge.textContent = '⚡ 高速モード';
      badge.classList.add('bg-emerald-100', 'text-emerald-700');
    } else {
      badge.textContent = '🐢 互換モード';
      badge.classList.add('bg-amber-100', 'text-amber-700');
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

  // WASM版ZXingを準備する。成功なら true。
  // .wasm は外部CDNではなくこのサイトに同梱したものを使う（学校のネットワーク制限対策）。
  // 読み込めない・遅すぎる場合は false を返し、従来の互換スキャナーで動かす。
  loadWasmEngine() {
    if (!dashWasmReady) {
      dashWasmReady = (async () => {
        if (typeof ZXingWASM === 'undefined' || typeof WebAssembly === 'undefined') return false;
        const wasmUrl = new URL('vendor/zxing-wasm/zxing_reader.wasm?v=3.1.3', location.href).href;
        const prepared = ZXingWASM.prepareZXingModule({
          overrides: { locateFile: (path, prefix) => path.endsWith('.wasm') ? wasmUrl : prefix + path },
          fireImmediately: true
        });
        let timer;
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 10000); });
        try {
          await Promise.race([prepared, timeout]);
        } finally {
          clearTimeout(timer);
        }
        return true;
      })().catch(e => {
        console.warn('ZXing WASM の読み込みに失敗したため、互換スキャナーを使います', e);
        dashWasmReady = null; // 次回ダッシュボードを開いたときに再挑戦する
        return false;
      });
    }
    return dashWasmReady;
  },

  // カメラとスキャナーを止める（停止完了まで待てるよう Promise を返す）
  async stopScanner() {
    isDashNativeScanning = false;
    if (dashNativeAnimId) {
      cancelAnimationFrame(dashNativeAnimId);
      dashNativeAnimId = null;
    }
    if (dashNativeStream) {
      dashNativeStream.getTracks().forEach(t => t.stop());
      dashNativeStream = null;
    }
    // 停止の完了を待つ間に新しいスキャナーが代入されても、それを消さないよう手元に退避してから止める
    const scanner = dashHtml5QrcodeScanner;
    dashHtml5QrcodeScanner = null;
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      } catch(e) {}
    }
  },

  // ダッシュボードを離れるときの後片付け
  destroy() {
    dashScanSession++; // 起動途中のスキャナーは、起動完了時に自ら停止する
    if (dashDateTimer) {
      clearInterval(dashDateTimer);
      dashDateTimer = null;
    }
    return DashboardView.stopScanner();
  }
};

// iPadをスリープから復帰させたときなど、画面に戻った時点で日付の切り替わりを反映する
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') DashboardView.checkDateRollover();
});

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
