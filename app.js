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
    
    // Handle mobile menu toggle
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      const mobileNav = document.getElementById('mobile-nav');
      mobileNav.classList.toggle('hidden');
    });
  }

  initNav() {
    const mainNav = document.getElementById('main-nav');
    const mobileNavContainer = document.getElementById('mobile-nav-container');
    
    mainNav.innerHTML = '';
    mobileNavContainer.innerHTML = '';

    Object.keys(routes).forEach(key => {
      const route = routes[key];
      
      // Desktop nav button
      const btn = document.createElement('button');
      btn.className = `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${this.currentRoute === key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`;
      btn.innerHTML = `<i data-lucide="${route.icon}" class="w-4 h-4"></i>${route.title}`;
      btn.onclick = () => this.navigate(key);
      mainNav.appendChild(btn);

      // Mobile nav button
      const mobileBtn = document.createElement('button');
      mobileBtn.className = `flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium w-full text-left transition-colors ${this.currentRoute === key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`;
      mobileBtn.innerHTML = `<i data-lucide="${route.icon}" class="w-5 h-5"></i>${route.title}`;
      mobileBtn.onclick = () => {
        this.navigate(key);
        document.getElementById('mobile-nav').classList.add('hidden');
      };
      mobileNavContainer.appendChild(mobileBtn);
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
