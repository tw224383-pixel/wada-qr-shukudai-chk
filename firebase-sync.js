// firebase-sync.js
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyC56LDb5O3Hryo6SEAZkpTQi6BOA3mscY4",
  authDomain: "qrchecker-6fabc.firebaseapp.com",
  databaseURL: "https://qrchecker-6fabc-default-rtdb.firebaseio.com",
  projectId: "qrchecker-6fabc",
  storageBucket: "qrchecker-6fabc.firebasestorage.app",
  messagingSenderId: "1023536418842",
  appId: "1:1023536418842:web:6670d276a7049cefe6c1a3",
  measurementId: "G-LLB2BMF47P"
};

const FirebaseSync = {
  db: null,
  
  init() {
    let config = DEFAULT_FIREBASE_CONFIG;
    const configStr = localStorage.getItem('firebaseConfig');
    if (configStr) {
      try {
        config = JSON.parse(configStr);
      } catch (e) {
        console.warn("Local Firebase config is invalid, using default.");
      }
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      this.db = firebase.firestore();
    } catch (e) {
      console.error("Firebase initialization failed", e);
    }
  },

  isReady() {
    return this.db !== null;
  },

  getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  },

  async saveToCloud(schoolId, password, data) {
    if (!this.isReady()) throw new Error("Firebaseが設定されていません。「接続設定」をご確認ください。");
    if (!schoolId || !password) throw new Error("IDとパスワードを入力してください");
    
    const docRef = this.db.collection('schools').doc(schoolId);
    
    try {
      const doc = await docRef.get();
      const today = this.getTodayString();
      let newSyncCount = 1;

      if (doc.exists) {
        const docData = doc.data();
        
        // パスワードチェック
        if (docData.password !== password) {
          throw new Error("パスワードが違います。上書きできません。");
        }
        
        // 回数制限チェック (1日10回まで)
        if (docData.syncDate === today) {
          if (docData.syncCount >= 10) {
            throw new Error("本日のバックアップ回数の上限（10回）に達しました。明日また実行してください。");
          }
          newSyncCount = (docData.syncCount || 0) + 1;
        }
      }
      
      // 保存処理
      await docRef.set({
        password: password,
        data: JSON.stringify(data),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        syncDate: today,
        syncCount: newSyncCount
      });
      return true;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  async loadFromCloud(schoolId, password) {
    if (!this.isReady()) throw new Error("Firebaseが設定されていません。「接続設定」をご確認ください。");
    if (!schoolId || !password) throw new Error("IDとパスワードを入力してください");
    
    const docRef = this.db.collection('schools').doc(schoolId);
    
    try {
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error("指定されたIDのデータが見つかりません。");
      }
      
      const serverData = doc.data();
      if (serverData.password !== password) {
        throw new Error("パスワードが違います。");
      }
      
      return JSON.parse(serverData.data);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
};

// 初回ロード時に初期化を試行
window.addEventListener('DOMContentLoaded', () => {
  if (typeof firebase !== 'undefined') {
    FirebaseSync.init();
  }
});
