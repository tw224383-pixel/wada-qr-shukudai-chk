// store.js
const STORAGE_KEY = 'wada_hw_checker_data';

// 端末のローカル時刻（日本時間）基準の "YYYY-MM-DD"
// ※ toISOString() はUTC基準のため、日本時間の0時〜9時に前日の日付になってしまう
function getLocalDateString(date = new Date()) {
  let d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const defaultData = {
  students: [
    { id: '1', number: '1', name: '青山 太郎', class: '1年1組' },
    { id: '2', number: '2', name: '石田 花子', class: '1年1組' },
    { id: '3', number: '3', name: '上田 次郎', class: '1年1組' }
  ],
  assignments: [
    { id: 'hw_1', title: '国語プリント（漢字）' },
    { id: 'hw_2', title: '算数ドリル（計算）' },
    { id: 'hw_3', title: '音読カード' }
  ],
  // 提出記録は「児童×提出物×日付」で1件: { id, studentId, assignmentId, status, date: 'YYYY-MM-DD', scannedAt }
  submissions: []
};

class Store {
  constructor() {
    this.data = this.loadData();
    this.listeners = [];
  }

  loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return this._normalize(JSON.parse(raw));
      } catch (e) {
        console.error('Failed to parse local storage', e);
      }
    }
    return JSON.parse(JSON.stringify(defaultData));
  }

  // 配列の欠損を補い、旧バージョンの提出記録（日付なし）には記録日時から日付を補完する
  _normalize(data) {
    const normalized = {
      students: Array.isArray(data.students) ? data.students : [],
      assignments: Array.isArray(data.assignments) ? data.assignments : [],
      submissions: Array.isArray(data.submissions) ? data.submissions : []
    };
    normalized.submissions.forEach(s => {
      if (!s.date) s.date = getLocalDateString(s.scannedAt || new Date());
      if (!s.id) s.id = this._generateId();
    });
    return normalized;
  }

  saveData(silent = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('データの保存に失敗しました（ストレージ容量上限の可能性）', e);
      if (typeof utils !== 'undefined' && utils.showToast) {
        utils.showToast('データの保存に失敗しました。ストレージ容量が上限に達している可能性があります。マスタ管理からバックアップを保存し、不要な古い提出履歴を整理してください。', 'error');
      }
      return;
    }
    if (!silent) {
      this.notify();
    }
  }

  restoreData(newData) {
    if (newData && Array.isArray(newData.students) && Array.isArray(newData.assignments)) {
      this.data = this._normalize(newData);
      this.saveData();
      return true;
    }
    return false;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.data));
  }

  // 短く一意なID生成ヘルパー (例: "m0k2x9a7b") - 区切り記号を含まない純粋な英数字
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  }

  // --- Students ---
  getStudents() { return this.data.students; }
  addStudent(student) {
    this.data.students.push({ id: this._generateId(), ...student });
    this.saveData();
  }
  updateStudent(id, studentData) {
    const idx = this.data.students.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.students[idx] = { ...this.data.students[idx], ...studentData };
      this.saveData();
    }
  }
  removeStudent(id) {
    this.data.students = this.data.students.filter(s => s.id !== id);
    // Remove related submissions
    this.data.submissions = this.data.submissions.filter(s => s.studentId !== id);
    this.saveData();
  }
  // 既存の児童はIDを維持し（印刷済みQRを無効にしない）、IDを持たない新規分だけ採番する
  importStudents(students) {
    this.data.students = students.map((s, i) => ({ id: `${Date.now().toString(36)}${i}${Math.random().toString(36).substring(2, 5)}`, ...s }));
    this.saveData();
  }
  clearStudents() {
    this.data.students = [];
    this.data.submissions = [];
    this.saveData();
  }

  // --- Assignments ---
  getAssignments() { return this.data.assignments; }
  addAssignment(assignment) {
    this.data.assignments.push({ id: this._generateId(), ...assignment });
    this.saveData();
  }
  updateAssignment(id, assignmentData) {
    const idx = this.data.assignments.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.data.assignments[idx] = { ...this.data.assignments[idx], ...assignmentData };
      this.saveData();
    }
  }
  removeAssignment(id) {
    this.data.assignments = this.data.assignments.filter(a => a.id !== id);
    // Remove related submissions
    this.data.submissions = this.data.submissions.filter(s => s.assignmentId !== id);
    this.saveData();
  }
  // 既存の提出物はIDを維持し（印刷済みQRを無効にしない）、IDを持たない新規分だけ採番する
  importAssignments(assignments) {
    this.data.assignments = assignments.map((a, i) => ({ id: `${Date.now().toString(36)}${i}${Math.random().toString(36).substring(2, 5)}`, ...a }));
    this.saveData();
  }
  clearAssignments() {
    this.data.assignments = [];
    this.data.submissions = [];
    this.saveData();
  }

  // --- Submissions ---
  getSubmissions() { return this.data.submissions; }

  // 指定日（既定は今日）の提出記録だけを返す。前日以前の〇は今日の表示・判定に持ち越さない
  getSubmissionsByDate(date = getLocalDateString()) {
    return this.data.submissions.filter(s => s.date === date);
  }

  findSubmission(studentId, assignmentId, date = getLocalDateString()) {
    return this.data.submissions.find(s => s.studentId === studentId && s.assignmentId === assignmentId && s.date === date);
  }

  // 今日の提出を記録（成功時は true, 今日すでに同じ状態の場合は false を返す）
  addSubmission(studentId, assignmentId, status = 'submitted') {
    const existing = this.findSubmission(studentId, assignmentId);
    if (existing) {
      if (existing.status === status) return false;
      existing.status = status;
      existing.scannedAt = new Date().toISOString();
      this.saveData(true); // サイレント保存（UI側でDOMを直接更新するため）
      return true;
    }

    this.data.submissions.push({
      id: this._generateId(),
      studentId,
      assignmentId,
      status,
      date: getLocalDateString(),
      scannedAt: new Date().toISOString()
    });
    this.saveData(true); // サイレント保存
    return true;
  }

  // 今日の記録だけを取り消す（過去日の履歴は残す）
  removeSubmission(studentId, assignmentId, date = getLocalDateString()) {
    this.data.submissions = this.data.submissions.filter(s => !(s.studentId === studentId && s.assignmentId === assignmentId && s.date === date));
    this.saveData(true);
  }

  removeSubmissionById(id) {
    this.data.submissions = this.data.submissions.filter(s => s.id !== id);
    this.saveData(true);
  }

  // 今日のステータスのトグル (空欄 -> submitted -> forgot -> absent -> exempt -> 空欄)
  toggleSubmissionStatus(studentId, assignmentId) {
    const existing = this.findSubmission(studentId, assignmentId);

    if (!existing) {
      this.addSubmission(studentId, assignmentId, 'submitted');
      return 'submitted';
    }

    const nextMap = { submitted: 'forgot', forgot: 'absent', absent: 'exempt', exempt: '' };
    const nextStatus = existing.status in nextMap ? nextMap[existing.status] : 'submitted';

    if (nextStatus === '') {
      this.removeSubmission(studentId, assignmentId);
      return '';
    }
    existing.status = nextStatus;
    existing.scannedAt = new Date().toISOString();
    this.saveData(true);
    return nextStatus;
  }
}

const store = new Store();
