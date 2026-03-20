// DriveShare PWA 应用核心逻辑
class DriveShareApp {
    constructor() {
        this.routes = this.loadRoutes();
        this.currentView = 'home';
        this.selectedStart = null;
        this.selectedEnd = null;
        this.map = null;
        this.pickers = { start: null, end: null };
        this.init();
    }

    // 初始化
    init() {
        this.registerServiceWorker();
        this.setupEventListeners();
        this.setupPWAInstall();
        this.renderHomeView();
        this.loadOfflineData();
    }

    // 注册Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js');
                console.log('ServiceWorker 注册成功:', registration);
            } catch (error) {
                console.log('ServiceWorker 注册失败:', error);
            }
        }
    }

    // 设置PWA安装提示
    setupPWAInstall() {
        let deferredPrompt;
        const installPrompt = document.getElementById('install-prompt');
        const installBtn = document.getElementById('install-btn');
        const dismissBtn = document.getElementById('dismiss-install');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installPrompt.classList.add('show');
        });

        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
                installPrompt.classList.remove('show');
            }
        });

        dismissBtn.addEventListener('click', () => {
            installPrompt.classList.remove('show');
        });

        // 检查是否已安装
        window.addEventListener('appinstalled', () => {
            installPrompt.classList.remove('show');
        });
    }

    // 事件监听
    setupEventListeners() {
        // 导航切换
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // 路线表单
        document.getElementById('route-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRoute();
        });

        // 地图选择
        document.getElementById('pick-start').addEventListener('click', () => {
            this.enableMapPicker('start');
        });

        document.getElementById('pick-end').addEventListener('click', () => {
            this.enableMapPicker('end');
        });

        // 过滤器
        document.getElementById('filter-category').addEventListener('change', () => {
            this.renderHomeView();
        });

        document.getElementById('filter-time').addEventListener('change', () => {
            this.renderHomeView();
        });

        // 模态框关闭
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('route-detail-modal').addEventListener('click', (e) => {
            if (e.target.id === 'route-detail-modal') {
                this.closeModal();
            }
        });

        // 离线检测
        window.addEventListener('online', () => {
            this.showNotification('网络已连接，数据将同步');
        });

        window.addEventListener('offline', () => {
            this.showNotification('离线模式，数据仅保存在本地');
        });
    }

    // 视图切换
    switchView(view) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        document.querySelectorAll('.view').forEach(v => {
            v.classList.toggle('active', v.id === `${view}-view`);
        });

        this.currentView = view;

        if (view === 'create') {
            this.initCreateMap();
        } else if (view === 'home') {
            this.renderHomeView();
        } else if (view === 'profile') {
            this.renderProfileView();
        }
    }

    // 初始化创建地图
    initCreateMap() {
        if (this.map) {
            this.map.remove();
        }

        // 默认定位到北京
        const defaultLat = 39.9042;
        const defaultLng = 116.4074;

        this.map = L.map('map-container').setView([defaultLat, defaultLng], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // 地图点击事件
        this.map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            const coords = [lat, lng];

            if (this.pickers.start) {
                this.selectedStart = coords;
                document.getElementById('route-start').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                this.addMarker(coords, 'start');
                this.pickers.start = false;
            } else if (this.pickers.end) {
                this.selectedEnd = coords;
                document.getElementById('route-end').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                this.addMarker(coords, 'end');
                this.pickers.end = false;
            }

            // 如果起点和终点都有，绘制路线
            if (this.selectedStart && this.selectedEnd) {
                this.drawRoute();
            }
        });
    }

    // 启用地图选择器
    enableMapPicker(type) {
        if (!this.map) {
            this.initCreateMap();
        }
        this.pickers[type] = true;
        this.showNotification(`点击地图选择${type === 'start' ? '起点' : '终点'}`);
    }

    // 添加标记
    addMarker(coords, type) {
        const color = type === 'start' ? '#4CAF50' : '#F44336';
        const icon = L.divIcon({
            html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
            className: 'custom-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        L.marker(coords, { icon }).addTo(this.map);
    }

    // 绘制路线
    drawRoute() {
        // 清除之前的路线
        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
        }

        // 绘制直线（实际应用中应调用OSRM API）
        const latlngs = [this.selectedStart, this.selectedEnd];
        this.routeLine = L.polyline(latlngs, {
            color: '#2196F3',
            weight: 4,
            opacity: 0.7
        }).addTo(this.map);

        // 调整视图
        this.map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
    }

    // 创建路线
    createRoute() {
        const name = document.getElementById('route-name').value;
        const category = document.getElementById('route-category').value;
        const start = document.getElementById('route-start').value;
        const end = document.getElementById('route-end').value;
        const description = document.getElementById('route-description').value;
        const duration = document.getElementById('route-duration').value || 2;

        if (!name || !start || !end) {
            alert('请填写必要信息');
            return;
        }

        const route = {
            id: Date.now().toString(),
            name,
            category,
            start,
            end,
            description,
            duration: parseFloat(duration),
            likes: 0,
            liked: false,
            createdAt: new Date().toISOString(),
            startCoords: this.selectedStart,
            endCoords: this.selectedEnd
        };

        this.routes.unshift(route);
        this.saveRoutes();
        this.renderHomeView();
        this.switchView('home');
        this.showNotification('路线发布成功！');

        // 重置表单
        document.getElementById('route-form').reset();
        this.selectedStart = null;
        this.selectedEnd = null;
    }

    // 渲染首页
    renderHomeView() {
        const container = document.getElementById('routes-list');
        const categoryFilter = document.getElementById('filter-category').value;
        const timeFilter = document.getElementById('filter-time').value;

        let filteredRoutes = [...this.routes];

        // 分类过滤
        if (categoryFilter !== 'all') {
            filteredRoutes = filteredRoutes.filter(r => r.category === categoryFilter);
        }

        // 时间过滤
        if (timeFilter !== 'all') {
            const maxTime = parseInt(timeFilter);
            filteredRoutes = filteredRoutes.filter(r => r.duration <= maxTime);
        }

        if (filteredRoutes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-route"></i>
                    <p>暂无路线数据</p>
                    <p style="font-size:0.9rem;color:#999;margin-top:0.5rem">点击"创建路线"开始分享吧！</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredRoutes.map(route => this.createRouteCard(route)).join('');

        // 绑定卡片事件
        this.bindRouteCardEvents();
    }

    // 创建路线卡片HTML
    createRouteCard(route) {
        const categoryLabels = {
            weekend: '周末游',
            long: '长途旅行',
            family: '亲子游',
            adventure: '探险路线'
        };

        return `
            <div class="route-card" data-id="${route.id}">
                <div class="route-header">
                    <span class="route-name">${this.escapeHtml(route.name)}</span>
                    <span class="route-category">${categoryLabels[route.category]}</span>
                </div>
                <div class="route-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(route.start)} → ${this.escapeHtml(route.end)}</span>
                    <span><i class="fas fa-clock"></i> ${route.duration}h</span>
                </div>
                <div class="route-desc">${this.escapeHtml(route.description || '暂无描述')}</div>
                <div class="route-actions">
                    <button class="btn-action btn-like ${route.liked ? 'liked' : ''}" data-action="like">
                        <i class="fas fa-heart"></i> ${route.likes}
                    </button>
                    <button class="btn-action btn-share" data-action="share">
                        <i class="fas fa-share-alt"></i> 分享
                    </button>
                </div>
            </div>
        `;
    }

    // 绑定路线卡片事件
    bindRouteCardEvents() {
        document.querySelectorAll('.route-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const routeId = e.currentTarget.dataset.id;

                // 防止点击按钮时触发卡片点击
                if (e.target.closest('.btn-action')) {
                    return;
                }

                this.showRouteDetail(routeId);
            });

            // 点赞按钮
            const likeBtn = card.querySelector('.btn-like');
            likeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const routeId = card.dataset.id;
                this.toggleLike(routeId);
            });

            // 分享按钮
            const shareBtn = card.querySelector('.btn-share');
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const routeId = card.dataset.id;
                this.shareRoute(routeId);
            });
        });
    }

    // 显示路线详情
    showRouteDetail(routeId) {
        const route = this.routes.find(r => r.id === routeId);
        if (!route) return;

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <h2>${this.escapeHtml(route.name)}</h2>
            <p style="color:#666;margin:0.5rem 0;">
                <i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(route.start)} → ${this.escapeHtml(route.end)}
            </p>
            <p style="color:#666;margin:0.5rem 0;">
                <i class="fas fa-clock"></i> 预计 ${route.duration} 小时
            </p>
            <div style="background:#f5f5f5;padding:1rem;border-radius:8px;margin:1rem 0;">
                <strong>描述：</strong><br>
                ${this.escapeHtml(route.description || '暂无描述')}
            </div>
            <div style="margin-top:1rem;">
                <button class="btn-action btn-like ${route.liked ? 'liked' : ''}" onclick="app.toggleLike('${route.id}')">
                    <i class="fas fa-heart"></i> ${route.likes}
                </button>
                <button class="btn-action btn-share" onclick="app.shareRoute('${route.id}')">
                    <i class="fas fa-share-alt"></i> 分享
                </button>
            </div>
        `;

        document.getElementById('route-detail-modal').classList.add('active');
    }

    // 关闭模态框
    closeModal() {
        document.getElementById('route-detail-modal').classList.remove('active');
    }

    // 切换点赞
    toggleLike(routeId) {
        const route = this.routes.find(r => r.id === routeId);
        if (!route) return;

        route.liked = !route.liked;
        route.likes += route.liked ? 1 : -1;

        this.saveRoutes();
        this.renderHomeView();
        this.renderProfileView();
    }

    // 分享路线
    shareRoute(routeId) {
        const route = this.routes.find(r => r.id === routeId);
        if (!route) return;

        const shareText = `🚗 DriveShare 路线分享：${route.name}\n${route.start} → ${route.end}\n预计 ${route.duration} 小时\n\n${route.description || ''}\n\n#自驾游 #DriveShare`;

        if (navigator.share) {
            navigator.share({
                title: 'DriveShare - 自驾路线',
                text: shareText
            }).catch(err => {
                console.log('分享失败', err);
                this.copyToClipboard(shareText);
            });
        } else {
            this.copyToClipboard(shareText);
        }
    }

    // 复制到剪贴板
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('已复制到剪贴板');
        }).catch(() => {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showNotification('已复制到剪贴板');
        });
    }

    // 渲染个人中心
    renderProfileView() {
        const myRoutes = this.routes;
        const container = document.getElementById('my-routes-list');
        document.getElementById('my-routes-count').textContent = myRoutes.length;

        if (myRoutes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-route"></i>
                    <p>你还没有发布过路线</p>
                </div>
            `;
            return;
        }

        container.innerHTML = myRoutes.map(route => this.createRouteCard(route)).join('');
        this.bindRouteCardEvents();
    }

    // 数据持久化
    saveRoutes() {
        try {
            localStorage.setItem('driveshare_routes', JSON.stringify(this.routes));
        } catch (e) {
            console.warn('无法保存到本地存储:', e);
        }
    }

    loadRoutes() {
        try {
            const data = localStorage.getItem('driveshare_routes');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.warn('无法从本地存储读取:', e);
        }
        return [];
    }

    // 加载离线数据
    loadOfflineData() {
        // 这里可以添加预加载的数据
        if (this.routes.length === 0) {
            // 添加一些示例数据
            const sampleRoutes = [
                {
                    id: 'sample1',
                    name: '周末北京周边自驾',
                    category: 'weekend',
                    start: '北京市中心',
                    end: '怀柔雁栖湖',
                    description: '周末放松之旅，途经山间公路，适合家庭出游。',
                    duration: 2,
                    likes: 5,
                    liked: false,
                    createdAt: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 'sample2',
                    name: '川西高原探险',
                    category: 'adventure',
                    start: '成都',
                    end: '稻城亚丁',
                    description: '挑战高原驾驶，欣赏绝美风景，建议准备充分。',
                    duration: 8,
                    likes: 12,
                    liked: false,
                    createdAt: new Date(Date.now() - 172800000).toISOString()
                }
            ];

            this.routes = [...sampleRoutes, ...this.routes];
            this.saveRoutes();
        }
    }

    // 工具函数：HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 显示通知
    showNotification(message) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            z-index: 3000;
            animation: slideDown 0.3s;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

// 启动应用
const app = new DriveShareApp();
