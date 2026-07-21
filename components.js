// components.js
const utils = {
  // トースト通知を表示
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    toast.className = `${bgColor} text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 toast-enter`;
    
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
    toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5"></i><span>${message}</span>`;
    
    container.appendChild(toast);
    lucide.createIcons({ root: toast });

    setTimeout(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // ビープ音を鳴らす
  playBeep(type = 'success') {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  },

  // 成功時のカスタムサウンド（10種類）
  playSuccessSound(indexStr) {
    const index = parseInt(indexStr, 10);
    if (isNaN(index) || index === 0) return; // 0: なし

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (index) {
      case 1: // ピッ (Short Sine)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 2: // ピポ (High-Low)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.setValueAtTime(800, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 3: // ポーン (Chime)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 4: // パパン (Double Tap)
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.setValueAtTime(0, now + 0.05);
        gainNode.gain.setValueAtTime(0.1, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 5: // キラッ (Twinkle)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1108, now + 0.05);
        osc.frequency.setValueAtTime(1318, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 6: // コイン (Coin)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987, now);
        osc.frequency.setValueAtTime(1318, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 7: // ピロリ (Trill)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.setValueAtTime(1200, now + 0.05);
        osc.frequency.setValueAtTime(1000, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 8: // ぽこっ (Bubble)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 9: // シャラーン (Arpeggio)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.05);
        osc.frequency.setValueAtTime(783, now + 0.1);
        osc.frequency.setValueAtTime(1046, now + 0.15);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      default:
        // Fallback for 1 or others
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
    }
  },

  // バイブレーション
  vibrate(pattern = [200]) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  },

  // 音声合成による読み上げ
  speak(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      // Stop currently speaking
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  },

  // CSVダウンロード
  downloadCSV(filename, data) {
    const csv = Papa.unparse(data);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // JSONダウンロード
  downloadJSON(filename, data) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  
  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
};
