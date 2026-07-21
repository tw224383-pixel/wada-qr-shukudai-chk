// store.js
const STORAGE_KEY = 'wada_hw_checker_data';

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
  submissions: [] // { id, studentId, assignmentId, scannedAt }
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
        const parsed = JSON.parse(raw);
        // Ensure arrays exist
        parsed.students = parsed.students || [];
        parsed.assignments = parsed.assignments || [];
        parsed.submissions = parsed.submissions || [];
        return parsed;
      } catch (e) {
        console.error('Failed to parse local storage', e);
        return { ...defaultData };
      }
    }
    return { ...defaultData };
  }

  saveData(silent = false) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    if (!silent) {
      this.notify();
    }
  }

  restoreData(newData) {
    if (newData && Array.isArray(newData.students) && Array.isArray(newData.assignments)) {
      this.data = {
        students: newData.students,
        assignments: newData.assignments,
        submissions: newData.submissions || []
      };
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

  // --- Students ---
  getStudents() { return this.data.students; }
  addStudent(student) {
    this.data.students.push({ id: Date.now().toString(), ...student });
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
  importStudents(students) {
    this.data.students = students.map(s => ({ id: Date.now().toString() + Math.random(), ...s }));
    this.saveData();
  }

  // --- Assignments ---
  getAssignments() { return this.data.assignments; }
  addAssignment(assignment) {
    this.data.assignments.push({ id: Date.now().toString(), ...assignment });
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
  importAssignments(assignments) {
    this.data.assignments = assignments.map(a => ({ id: Date.now().toString() + Math.random(), ...a }));
    this.saveData();
  }

  // --- Submissions ---
  getSubmissions() { return this.data.submissions; }
  
  // 提出追加（成功時は true, すでに提出済みの場合は false を返す）
  addSubmission(studentId, assignmentId, status = 'submitted') {
    const existingIdx = this.data.submissions.findIndex(s => s.studentId === studentId && s.assignmentId === assignmentId);
    if (existingIdx !== -1) {
      const existing = this.data.submissions[existingIdx];
      if (existing.status === status) return false;
      
      this.data.submissions[existingIdx].status = status;
      this.data.submissions[existingIdx].scannedAt = new Date().toISOString();
      this.saveData(true); // サイレント保存（UI側でDOMを直接更新するため）
      return true;
    }

    this.data.submissions.push({
      id: Date.now().toString(),
      studentId,
      assignmentId,
      status,
      scannedAt: new Date().toISOString()
    });
    this.saveData(true); // サイレント保存
    return true;
  }

  removeSubmission(studentId, assignmentId) {
    this.data.submissions = this.data.submissions.filter(s => !(s.studentId === studentId && s.assignmentId === assignmentId));
    this.saveData(true);
  }

  // ステータスのトグル (空欄 -> submitted -> forgot -> exempt -> 空欄)
  toggleSubmissionStatus(studentId, assignmentId) {
    const existingIdx = this.data.submissions.findIndex(s => s.studentId === studentId && s.assignmentId === assignmentId);
    
    if (existingIdx === -1) {
      this.addSubmission(studentId, assignmentId, 'submitted');
      return 'submitted';
    }

    const currentStatus = this.data.submissions[existingIdx].status;
    let nextStatus = '';

    if (currentStatus === 'submitted') nextStatus = 'forgot';
    else if (currentStatus === 'forgot') nextStatus = 'absent';
    else if (currentStatus === 'absent') nextStatus = 'exempt';
    else if (currentStatus === 'exempt') nextStatus = ''; // 空欄(削除)
    else nextStatus = 'submitted'; // フォールバック

    if (nextStatus === '') {
      this.removeSubmission(studentId, assignmentId);
      return '';
    } else {
      this.data.submissions[existingIdx].status = nextStatus;
      this.data.submissions[existingIdx].scannedAt = new Date().toISOString();
      this.saveData(true);
      return nextStatus;
    }
  }
}

const store = new Store();
