# DriveShare - 自驾游社交网络 PWA

一个开源的 PWA 应用，用于分享和发现自驾游路线。

## 功能特点

- ✅ **路线创建与分享**：创建自驾路线，设置起点、终点、分类和描述
- ✅ **地图可视化**：使用 Leaflet + OpenStreetMap 显示路线
- ✅ **社交互动**：点赞、分享其他用户的路线
- ✅ **离线使用**：支持 Service Worker，离线可浏览缓存数据
- ✅ **安装到主屏幕**：真正的 PWA，可像原生应用一样使用
- ✅ **响应式设计**：完美适配手机和桌面端

## 快速开始

### 本地开发

```bash
# 1. 克隆或下载项目
git clone https://github.com/your-username/driveshare-pwa.git
cd driveshare-pwa

# 2. 使用 Python 服务器（推荐）
python -m http.server 8000

# 或者使用 Node.js 服务器
npx http-server -p 8000

# 3. 打开浏览器访问
# http://localhost:8000
