# 🕐 桌面时钟 · 天气

精美的 PWA 桌面数字时钟应用，集成实时天气信息与未来一周天气预报。自动检测地理位置，支持离线缓存，可安装到桌面使用。

## 功能特性

- **数字时钟** — Orbitron 字体大屏显示，渐变发光效果，等宽数字无抖动
- **实时天气** — 温度、体感温度、天气状况、湿度
- **UV 指数** — 彩色分级显示（低/中等/高/很高/极高）
- **空气质量** — 欧洲 AQI 指数，6 级彩色标注
- **未来 7 天预报** — 每日天气图标、最高/最低温
- **自动定位** — 浏览器 Geolocation API + 反向地理编码（城市名）
- **自动刷新** — 每 10 分钟更新一次天气数据
- **PWA 支持** — 可安装到主屏幕，离线访问基本功能
- **响应式设计** — 适配手机、平板、桌面、大屏电视
- **玻璃态设计** — 毛玻璃卡片、深色渐变背景、星空点缀

## 技术栈

| 技术 | 用途 |
|---|---|
| HTML5 | 语义化页面结构 |
| CSS3 | 玻璃态设计、渐变背景、弹性布局 |
| JavaScript (ES6+) | 核心逻辑、API 调用、DOM 操作 |
| Open-Meteo API | 免费天气数据（无需 API Key） |
| Nominatim API | 反向地理编码 |
| Service Worker | 离线缓存策略 |
| PWA Manifest | 可安装到桌面 |

## 快速开始

### 方式一：直接运行

```bash
# Python 3
cd clock-with-weather
python -m http.server 8099
```

```bash
# 或者用 Node.js
cd clock-with-weather
npx serve -l 8099 .
```

打开浏览器访问 `http://localhost:8099`

### 方式二：安装到桌面

1. 用 Chrome 打开应用
2. 地址栏右侧点击安装图标，或菜单 → 安装"时钟天气"
3. 安装后可在桌面独立启动，无浏览器边框

## 项目结构

```
clock-with-weather/
├── index.html          # 主页面
├── styles.css           # 样式表
├── app.js               # 应用逻辑
├── manifest.json        # PWA 清单
├── sw.js                # Service Worker
├── icons/
│   └── icon.svg         # 应用图标
└── README.md            # 本文件
```

## API 接口说明

应用使用免费 API，无需注册或 API Key：

- **天气数据**: [Open-Meteo](https://open-meteo.com/) — 当前天气 + 7 天预报
- **空气质量**: [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api)
- **地理编码**: [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap)

## 浏览器兼容

| 浏览器 | 支持情况 |
|---|---|
| Chrome 90+ | 完全支持，含 PWA 安装 |
| Edge 90+ | 完全支持 |
| Firefox 90+ | 支持基本功能 |
| Safari 15+ | 支持基本功能 |
| Chrome Android | 完全支持 |
| Safari iOS | 支持基本功能 |

## 自定义配置

在 `app.js` 中可修改：

```js
const REFRESH_INTERVAL = 10 * 60 * 1000;  // 刷新间隔（默认 10 分钟）
const CACHE_MAX_AGE = 30 * 60 * 1000;      // 缓存有效期（默认 30 分钟）
```

在 `styles.css` 的 `:root` 中可调整颜色主题和字体。

## 许可

MIT License
