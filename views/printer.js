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
            <button id="btn-generate-print" class="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded font-medium flex items-center gap-2 transition-colors shadow-sm">
              <i data-lucide="printer" class="w-5 h-5"></i>
              印刷プレビューを生成
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-2">※ブラウザの印刷ダイアログが起動します。レイアウト設定で「余白なし」等を調整してください。</p>
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
    
    // 印刷生成処理
    document.getElementById('btn-generate-print').addEventListener('click', () => {
      const mode = document.querySelector('input[name="print-mode"]:checked').value;
      const copies = parseInt(document.getElementById('print-copies').value, 10) || 1;
      
      const printArea = document.getElementById('print-area');
      printArea.innerHTML = ''; // clear

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
            page.appendChild(PrinterView.createSticker(student, assignment));
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
            // 全児童を出力する場合は児童ごとに改ページする
            page.className = 'print-page flex flex-wrap gap-2 content-start' + (index > 0 ? ' break-before-page' : '');
            
            assignments.forEach(assignment => {
              for (let i = 0; i < copies; i++) {
                page.appendChild(PrinterView.createSticker(student, assignment));
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
              page.appendChild(PrinterView.createSticker(student, assignment));
            }
          });
          printArea.appendChild(page);
        }
      }
      
      // Delay printing to allow QR rendering
      setTimeout(() => {
        window.print();
      }, 500);
    });
  },

  createSticker(student, assignment) {
    const sticker = document.createElement('div');
    sticker.className = 'w-[40mm] h-[25mm] border border-gray-300 p-1 flex items-center bg-white overflow-hidden text-xs shrink-0';
    
    const qrDiv = document.createElement('div');
    qrDiv.className = 'flex-shrink-0';
    
    const qrData = JSON.stringify({ s: student.id, a: assignment.id });
    
    const textDiv = document.createElement('div');
    textDiv.className = 'ml-2 flex flex-col justify-center overflow-hidden w-full';
    textDiv.innerHTML = `
      <div class="font-bold truncate text-[10px] leading-tight">${utils.escapeHTML(student.name)}</div>
      <div class="text-[8px] text-gray-600 truncate mt-1 leading-tight">${utils.escapeHTML(assignment.title)}</div>
    `;

    sticker.appendChild(qrDiv);
    sticker.appendChild(textDiv);

    new QRCode(qrDiv, {
      text: qrData,
      width: 50,
      height: 50,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.L // ドットを粗くして認識速度を極限まで上げる
    });

    return sticker;
  }
};
