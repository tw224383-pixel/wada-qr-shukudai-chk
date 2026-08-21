// views/printer.js
const PrinterView = {
  render() {
    const data = store.data;
    
    return `
      <div class="max-w-4xl mx-auto pb-10">
        <h1 class="text-2xl font-bold mb-6 text-gray-800">QRシール印刷</h1>
        
        <div class="bg-white p-6 rounded-lg shadow-sm mb-6">
          
          <!-- モード選択 -->
          <div class="mb-6 flex gap-4 border-b pb-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="print-mode" value="by-assignment" checked class="text-primary focus:ring-primary w-4 h-4">
              <span class="font-medium text-gray-800">提出物から全児童を出力</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="print-mode" value="by-student" class="text-primary focus:ring-primary w-4 h-4">
              <span class="font-medium text-gray-800">児童から全提出物を出力</span>
            </label>
          </div>

          <!-- モードA: 提出物選択 -->
          <div id="mode-by-assignment" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">対象の提出物を選択</label>
            <select id="print-assignment-select" class="w-full border-gray-300 rounded-md shadow-sm border p-2 bg-gray-50">
              <option value="">-- 提出物を選択 --</option>
              ${data.assignments.map(a => `<option value="${a.id}">${utils.escapeHTML(a.title)}</option>`).join('')}
            </select>
            <p class="text-xs text-gray-500 mt-1">選択した提出物のQRコードを、全児童分作成します。</p>
          </div>

          <!-- モードB: 児童選択 -->
          <div id="mode-by-student" class="mb-4 hidden">
            <label class="block text-sm font-medium text-gray-700 mb-1">対象の児童を選択</label>
            <select id="print-student-select" class="w-full border-gray-300 rounded-md shadow-sm border p-2 bg-gray-50">
              <option value="">-- 児童を選択 --</option>
              <option value="all" class="font-bold text-primary">** すべての児童 **</option>
              ${data.students.map(s => `<option value="${s.id}">${utils.escapeHTML(s.number)}. ${utils.escapeHTML(s.name)}</option>`).join('')}
            </select>
            <p class="text-xs text-gray-500 mt-1">選択した児童のQRコードを、全提出物分作成します。</p>
          </div>
          
          <!-- 枚数指定 -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">印刷枚数（予備を含める数）</label>
            <div class="flex items-center gap-2">
              <input type="number" id="print-copies" min="1" max="10" value="1" class="w-24 border-gray-300 rounded-md shadow-sm border p-2 bg-gray-50 text-center">
              <span class="text-sm text-gray-600">枚ずつ出力</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">2を指定すると、同じQRシールが2枚ずつ並んで印刷されます。</p>
          </div>
          
          <div class="flex gap-4 mt-6">
            <button id="btn-generate-print" class="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded font-bold flex items-center gap-2 transition-all shadow-sm">
              <i data-lucide="qr-code" class="w-5 h-5"></i>
              QRシールを生成・プレビュー表示
            </button>
          </div>
        </div>

        <!-- プレビュー表示コンテナ -->
        <div id="print-preview-container" class="hidden bg-white p-6 rounded-lg shadow-sm border border-blue-200 mb-8 transition-all">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b">
            <div>
              <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i data-lucide="eye" class="w-5 h-5 text-primary"></i>
                生成されたQRシール プレビュー
              </h2>
              <p class="text-xs text-gray-500 mt-1" id="print-preview-count"></p>
            </div>
            <div class="flex gap-3 w-full sm:w-auto">
              <button id="btn-do-print" class="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded shadow flex items-center justify-center gap-2 text-sm transition-all transform hover:scale-105">
                <i data-lucide="printer" class="w-4 h-4"></i>
                この内容で印刷する
              </button>
            </div>
          </div>
          
          <div class="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3 rounded mb-4">
            💡 <strong>印刷時のヒント:</strong> 「この内容で印刷する」を押すと印刷ダイアログが開きます。用紙サイズ「A4」、余白「なし」または「最小」を選ぶと綺麗に出力されます。
          </div>

          <div id="print-preview-list" class="flex flex-wrap gap-2.5 p-4 bg-gray-50 rounded border border-gray-200 max-h-[600px] overflow-y-auto">
            <!-- プレビュー用シールがここに並ぶ -->
          </div>
        </div>
      </div>
    `;
  },
  
  afterRender() {
    lucide.createIcons();
    
    // モード切り替えロジック
    const radios = document.querySelectorAll('input[name="print-mode"]');
    const modeAssignDiv = document.getElementById('mode-by-assignment');
    const modeStudentDiv = document.getElementById('mode-by-student');

    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'by-assignment') {
          modeAssignDiv.classList.remove('hidden');
          modeStudentDiv.classList.add('hidden');
        } else {
          modeAssignDiv.classList.add('hidden');
          modeStudentDiv.classList.remove('hidden');
        }
      });
    });
    
    // プレビュー生成処理
    document.getElementById('btn-generate-print').addEventListener('click', () => {
      const mode = document.querySelector('input[name="print-mode"]:checked').value;
      const copies = parseInt(document.getElementById('print-copies').value, 10) || 1;
      
      const printArea = document.getElementById('print-area');
      const previewList = document.getElementById('print-preview-list');
      const previewContainer = document.getElementById('print-preview-container');
      const previewCount = document.getElementById('print-preview-count');
      
      printArea.innerHTML = '';
      previewList.innerHTML = '';

      let totalStickers = 0;

      if (mode === 'by-assignment') {
        const assignmentId = document.getElementById('print-assignment-select').value;
        if (!assignmentId) return utils.showToast('提出物を選択してください', 'error');
        
        const assignment = store.data.assignments.find(a => a.id === assignmentId);
        const students = store.data.students;
        if (students.length === 0) return utils.showToast('児童が登録されていません', 'error');

        const page = document.createElement('div');
        page.className = 'print-page flex flex-wrap gap-2 content-start';
        students.forEach(student => {
          for (let i = 0; i < copies; i++) {
            totalStickers++;
            page.appendChild(PrinterView.createSticker(student, assignment));
            previewList.appendChild(PrinterView.createSticker(student, assignment));
          }
        });
        printArea.appendChild(page);

      } else {
        const studentId = document.getElementById('print-student-select').value;
        if (!studentId) return utils.showToast('児童を選択してください', 'error');
        
        const assignments = store.data.assignments;
        if (assignments.length === 0) return utils.showToast('提出物が登録されていません', 'error');

        if (studentId === 'all') {
          const students = store.data.students;
          if (students.length === 0) return utils.showToast('児童が登録されていません', 'error');
          
          students.forEach((student, index) => {
            const page = document.createElement('div');
            page.className = 'print-page flex flex-wrap gap-2 content-start' + (index > 0 ? ' break-before-page' : '');
            
            assignments.forEach(assignment => {
              for (let i = 0; i < copies; i++) {
                totalStickers++;
                page.appendChild(PrinterView.createSticker(student, assignment));
                previewList.appendChild(PrinterView.createSticker(student, assignment));
              }
            });
            printArea.appendChild(page);
          });
        } else {
          const student = store.data.students.find(s => s.id === studentId);
          const page = document.createElement('div');
          page.className = 'print-page flex flex-wrap gap-2 content-start';
          assignments.forEach(assignment => {
            for (let i = 0; i < copies; i++) {
              totalStickers++;
              page.appendChild(PrinterView.createSticker(student, assignment));
              previewList.appendChild(PrinterView.createSticker(student, assignment));
            }
          });
          printArea.appendChild(page);
        }
      }

      previewCount.textContent = `合計 ${totalStickers} 枚のQRシールが生成されました。確認後、「この内容で印刷する」を押してください。`;
      previewContainer.classList.remove('hidden');
      lucide.createIcons({ root: previewContainer });
      
      // プレビュー位置までスムーズにスクロール
      previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      utils.showToast(`${totalStickers}枚のQRシールを生成しました`);
    });

    // 実際の印刷実行処理
    document.getElementById('btn-do-print').addEventListener('click', () => {
      window.print();
    });
  },

  createSticker(student, assignment) {
    const sticker = document.createElement('div');
    sticker.className = 'w-[40mm] h-[25mm] border border-gray-300 p-1 flex items-center bg-white overflow-hidden text-xs shrink-0';
    
    const qrDiv = document.createElement('div');
    // シール縦幅(25mm)に対して最大限大きく(21mm)配置。印刷時の余白と高解像度表示を両立
    qrDiv.className = 'flex-shrink-0 w-[21mm] h-[21mm] bg-white p-0.5 border border-gray-100 rounded-sm flex items-center justify-center [&>img]:w-full [&>img]:h-full [&>canvas]:w-full [&>canvas]:h-full';
    
    // データ長を極限まで短縮し、QRのドット数を最小限（Version 2: 25x25等）に抑える
    const qrData = `${student.id}:${assignment.id}`;
    
    const textDiv = document.createElement('div');
    textDiv.className = 'ml-2 flex flex-col justify-center overflow-hidden w-full';
    const displayNum = student.number ? `${utils.escapeHTML(student.number)}. ` : '';
    textDiv.innerHTML = `
      <div class="font-bold truncate text-[11px] leading-tight text-gray-900">${displayNum}${utils.escapeHTML(student.name)}</div>
      <div class="text-[9px] text-gray-600 truncate mt-1 leading-tight font-medium">${utils.escapeHTML(assignment.title)}</div>
    `;

    sticker.appendChild(qrDiv);
    sticker.appendChild(textDiv);

    new QRCode(qrDiv, {
      text: qrData,
      width: 256, // 内部解像度を高精細（256px）にして印刷時のぼやけを完全に防止
      height: 256,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.M // 業界標準のレベルM（15%復元）。ドットが大きく読み取りやすさと復元力の黄金比
    });

    return sticker;
  }
};
