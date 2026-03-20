const CACHE_NAME = 'driveshare-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('缓存静态资源...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
    // 忽略非 GET 请求
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // 如果缓存中有，返回缓存
                if (cachedResponse) {
                    return cachedResponse;
                }

                // 否则从网络获取
                return fetch(event.request)
                    .then((response) => {
                        // 只缓存成功的响应
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 克隆响应，因为响应流只能使用一次
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // 网络失败时，返回离线页面（可选）
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// 处理后台同步
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-routes') {
        event.waitUntil(syncRoutes());
    }
});

// 处理推送通知
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'DriveShare 有新动态',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '查看详情',
                icon: 'icons/icon-96.png'
            },
            {
                action: 'close',
                title: '关闭',
                icon: 'icons/icon-96.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('DriveShare', options)
    );
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// 后台同步函数
async function syncRoutes() {
    // 这里可以实现与服务器的数据同步
    console.log('同步路线数据...');
    // 实际应用中，这里会发送请求到服务器
}
