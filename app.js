// app.js

const routes = {
  dashboard: { title: 'ダッシュボード', icon: 'layout-dashboard', view: DashboardView },
  printer: { title: 'QR印刷', icon: 'printer', view: PrinterView },
  master: { title: 'マスタ管理', icon: 'database', view: MasterView },
  history: { title: '提出履歴', icon: 'history', view: HistoryView },
};

class App {
  constructor() {
    this.currentRoute = 'dashboard';
    this.appContent = document.getElementById('app-content');
    
    // Subscribe to store changes to re-render current view if needed
    store.subscribe(() => {
      this.renderCurrentView();
    });

    this.initNav();
    
    // 以前のハンバーガーメニューイベントは削除されました
  }

  initNav() {
    const mainNav = document.getElementById('main-nav');
    if (!mainNav) return;
    
    mainNav.innerHTML = '';

    Object.keys(routes).forEach(key => {
      const route = routes[key];
      
      const btn = document.createElement('button');
      // モバイルではアイコンが上、文字が下の縦並びに。PCでは横並びに。
      btn.className = `flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-md text-[10px] md:text-sm font-medium transition-colors flex-1 md:flex-none min-w-[4rem] ${this.currentRoute === key ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`;
      btn.innerHTML = `<i data-lucide="${route.icon}" class="w-4 h-4 md:w-4 md:h-4"></i><span class="whitespace-nowrap">${route.title}</span>`;
      btn.onclick = () => this.navigate(key);
      mainNav.appendChild(btn);
    });
    
    lucide.createIcons();
  }

  navigate(routeKey) {
    if (this.currentRoute === 'dashboard' && DashboardView.destroy) {
      DashboardView.destroy();
    }
    
    this.currentRoute = routeKey;
    this.initNav(); // update active state
    this.renderCurrentView();
  }

  renderCurrentView() {
    const view = routes[this.currentRoute].view;
    this.appContent.innerHTML = view.render();
    if (view.afterRender) {
      view.afterRender();
    }
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.renderCurrentView();
});
