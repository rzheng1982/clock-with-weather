/* ========================================
   Modern Clock & Weather PWA - App Logic
   ======================================== */

'use strict';

// --- DOM References ---
const $ = (id) => document.getElementById(id);

const els = {
    locationText: $('locationText'),
    dateDisplay: $('dateDisplay'),
    hours: $('hours'),
    minutes: $('minutes'),
    seconds: $('seconds'),
    refreshBtn: $('refreshBtn'),
    updateTime: $('updateTime'),

    tempValue: $('tempValue'),
    feelsLike: $('feelsLike'),
    conditionIcon: $('conditionIcon'),
    conditionText: $('conditionText'),
    humidityText: $('humidityText'),
    uvValue: $('uvValue'),
    uvLevel: $('uvLevel'),
    aqiValue: $('aqiValue'),
    aqiLevel: $('aqiLevel'),

    forecastContainer: $('forecastContainer'),

    cards: document.querySelectorAll('.weather-card'),
};

// --- State ---
const state = {
    lat: null,
    lon: null,
    locationName: null,
};

// --- Constants ---
// --- QWeather Configuration ---
const QWEATHER_KEY = '995725a47cc546f097e1c75a8a46a876';
const QWEATHER_HOST = 'k64d945tk8.re.qweatherapi.com';

// QWeather icon code → emoji mapping
const QW_ICON_MAP = {
    '100': '☀️', '101': '⛅', '102': '🌤️', '103': '🌤️', '104': '☁️',
    '150': '🌫️', '151': '🌫️', '152': '🌫️', '153': '🌫️',
    '154': '🌫️', '155': '🌫️',
    '300': '🌦️', '301': '🌧️', '302': '⛈️', '303': '⛈️', '304': '⛈️',
    '305': '🌧️', '306': '🌧️', '307': '🌧️', '308': '🌧️', '309': '🌦️',
    '310': '🌧️', '311': '🌧️', '312': '🌧️', '313': '🌧️',
    '314': '🌧️', '315': '🌧️', '316': '🌧️', '317': '🌧️', '318': '🌧️',
    '399': '🌧️',
    '400': '❄️', '401': '❄️', '402': '❄️', '403': '❄️',
    '404': '🌨️', '405': '🌨️', '406': '🌨️', '407': '🌨️',
    '408': '❄️', '409': '❄️', '410': '❄️',
    '499': '❄️',
    '500': '🌫️', '501': '🌫️', '502': '🌫️', '503': '🌫️', '504': '🌫️',
    '507': '🌫️', '508': '🌫️', '509': '🌫️', '510': '🌫️',
    '511': '🌫️', '512': '🌫️', '513': '🌫️', '514': '🌫️', '515': '🌫️',
};

function qwIcon(icon, fallback) {
    return QW_ICON_MAP[icon] || fallback || '🌤️';
}

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const UV_LEVELS = [
    { max: 2,  label: '低', color: '#66bb6a' },
    { max: 5,  label: '中等', color: '#ffa726' },
    { max: 7,  label: '高', color: '#ff7043' },
    { max: 10, label: '很高', color: '#ef5350' },
    { max: Infinity, label: '极高', color: '#ab47bc' },
];

const AQI_LEVELS = [
    { max: 50,   label: '优', color: '#66bb6a' },
    { max: 100,  label: '良', color: '#aed581' },
    { max: 150,  label: '轻度污染', color: '#ffa726' },
    { max: 200,  label: '中度污染', color: '#ff7043' },
    { max: 300,  label: '重度污染', color: '#ef5350' },
    { max: Infinity, label: '严重污染', color: '#b71c1c' },
];

const CACHE_KEY = 'clockWeatherCache_v2';
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 min
const REFRESH_INTERVAL = 10 * 60 * 1000;

// --- Clock (smart: only touches DOM on actual value change) ---
let _prevH = '', _prevM = '', _prevS = '', _prevDate = '';

function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');

    if (h !== _prevH) { els.hours.textContent = h; _prevH = h; }
    if (m !== _prevM) { els.minutes.textContent = m; _prevM = m; }
    if (s !== _prevS) { els.seconds.textContent = s; _prevS = s; }

    // Date: only update when day rolls over
    const dateKey = now.toISOString().slice(0, 10);
    if (dateKey !== _prevDate) {
        els.dateDisplay.textContent = now.toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
        });
        _prevDate = dateKey;
    }
}

updateClock();

// --- QWeather API ---
async function qwFetch(path, params = {}) {
    params.key = QWEATHER_KEY;
    const qs = new URLSearchParams(params);
    const res = await fetch(`https://${QWEATHER_HOST}${path}?${qs}`);
    if (!res.ok) throw new Error(`QWeather ${res.status}`);
    return res.json();
}

async function fetchWeather(lat, lon) {
    const loc = `${lon.toFixed(2)},${lat.toFixed(2)}`;
    const [now, daily] = await Promise.all([
        qwFetch('/v7/weather/now', { location: loc }),
        qwFetch('/v7/weather/7d', { location: loc }),
    ]);
    // Wrap QWeather responses in a structure the UI functions expect
    return {
        current: {
            temp: now.now.temp,
            feelsLike: now.now.feelsLike,
            icon: now.now.icon,
            text: now.now.text,
            humidity: now.now.humidity,
            uvIndex: daily.daily[0]?.uvIndex,
        },
        daily: daily.daily,
    };
}

async function fetchAQI(lat, lon) {
    return qwFetch(`/airquality/v1/current/${lat.toFixed(2)}/${lon.toFixed(2)}`);
}

async function fetchLocationName(lat, lon) {
    const data = await qwFetch('/geo/v2/city/lookup', {
        location: `${lon.toFixed(2)},${lat.toFixed(2)}`,
    });
    const loc = data.location?.[0];
    return loc?.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

// --- UI Updates ---
function pulseCard(card) {
    card.style.transition = 'transform 0.15s ease';
    card.style.transform = 'scale(0.97)';
    requestAnimationFrame(() => {
        card.style.transform = '';
    });
}

function updateWeatherUI(data) {
    const c = data.current;

    // Temperature
    els.tempValue.textContent = `${Math.round(c.temp)}°C`;
    els.feelsLike.textContent = `体感 ${Math.round(c.feelsLike)}°C`;
    pulseCard(els.tempValue.closest('.weather-card'));

    // Condition
    els.conditionIcon.textContent = qwIcon(c.icon, '🌤️');
    els.conditionText.textContent = c.text;
    els.humidityText.textContent = `湿度: ${c.humidity}%`;
    pulseCard(els.conditionText.closest('.weather-card'));

    // UV Index
    const uv = parseFloat(c.uvIndex) || 0;
    els.uvValue.textContent = uv.toFixed(1);
    const uvInfo = UV_LEVELS.find(l => uv <= l.max);
    els.uvValue.style.color = uvInfo.color;
    els.uvLevel.textContent = uvInfo.label;
    els.uvLevel.style.color = uvInfo.color;
    els.uvValue.closest('.weather-card').style.setProperty('--accent', uvInfo.color);
    pulseCard(els.uvValue.closest('.weather-card'));
}

function updateAQIUI(data) {
    // Pick the best available AQI standard: cn-mee (China) > us-epa > qaqi > first
    const index = data.indexes?.find(i => i.code === 'cn-mee')
        || data.indexes?.find(i => i.code === 'us-epa')
        || data.indexes?.find(i => i.code === 'qaqi')
        || data.indexes?.[0];
    const aqi = index?.aqi;
    if (aqi == null) {
        els.aqiValue.textContent = '--';
        els.aqiLevel.textContent = '暂无数据';
        return;
    }
    els.aqiValue.textContent = Math.round(aqi);
    const info = AQI_LEVELS.find(l => aqi <= l.max);
    els.aqiValue.style.color = info.color;
    els.aqiLevel.textContent = info.label;
    els.aqiLevel.style.color = info.color;
    els.aqiValue.closest('.weather-card').style.setProperty('--accent', info.color);
    pulseCard(els.aqiValue.closest('.weather-card'));
}

// --- Forecast Rendering ---
function renderForecast(daily) {
    if (!daily || !daily.length) return;

    const container = els.forecastContainer;
    container.innerHTML = '';

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    for (let i = 0; i < daily.length; i++) {
        const d = daily[i];
        const dateStr = d.fxDate;
        const date = new Date(dateStr + 'T12:00:00');
        const isToday = dateStr === todayStr;

        let dayName;
        if (isToday) {
            dayName = '今天';
        } else if (i === 1) {
            dayName = '明天';
        } else {
            dayName = DAY_NAMES[date.getDay()];
        }

        const icon = qwIcon(d.iconDay, '🌤️');
        const high = Math.round(d.tempMax);
        const low  = Math.round(d.tempMin);

        const card = document.createElement('div');
        card.className = 'forecast-card' + (isToday ? ' today' : '');
        card.innerHTML = `
            <div class="fc-day">${dayName}</div>
            <div class="fc-icon">${icon}</div>
            <div class="fc-temps">
                <div class="fc-temp-high">${high}°</div>
                <div class="fc-temp-low">${low}°</div>
            </div>
        `;
        container.appendChild(card);
    }
}

// --- Cache ---
function saveCache(lat, lon, weather, aqi, name) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            lat, lon, weather, aqi, name,
            ts: Date.now(),
        }));
    } catch { /* quota */ }
}

function loadCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const d = JSON.parse(raw);
        if (Date.now() - d.ts > CACHE_MAX_AGE) return null;
        return d;
    } catch { return null; }
}

// --- Main Fetch ---
async function fetchAllWeather(lat, lon) {
    els.locationText.textContent = '正在获取天气数据...';

    try {
        const [weather, name] = await Promise.all([
            fetchWeather(lat, lon),
            fetchLocationName(lat, lon),
        ]);

        state.locationName = name;
        els.locationText.textContent = name;

        // Current conditions
        updateWeatherUI(weather);
        // 7-day forecast
        if (weather.daily) renderForecast(weather.daily);

        let aqi = null;
        try {
            aqi = await fetchAQI(lat, lon);
            updateAQIUI(aqi);
        } catch (e) {
            console.warn('AQI unavailable:', e);
            els.aqiValue.textContent = '--';
            els.aqiLevel.textContent = '暂不可用';
        }

        els.updateTime.textContent = `更新于 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;

        saveCache(lat, lon, weather, aqi, name);
    } catch (e) {
        console.error('Weather fetch failed:', e);
        els.locationText.textContent = '数据获取失败，显示缓存数据';
        const cached = loadCache();
        if (cached) {
            if (cached.weather) {
                updateWeatherUI(cached.weather);
                if (cached.weather.daily) renderForecast(cached.weather.daily);
            }
            if (cached.aqi) updateAQIUI(cached.aqi);
            if (cached.name) els.locationText.textContent = cached.name + ' (缓存)';
        }
    }
}

// --- IP Geolocation Fallback ---
// 当浏览器 Geolocation API 不可用或失败时使用（如 iOS/HTTP 环境）
function fetchLocationByIP() {
    return new Promise((resolve, reject) => {
        const cb = 'ipcb_' + Date.now();
        const script = document.createElement('script');
        script.src = `https://ip-api.com/json/?fields=city,lat,lon&callback=${cb}`;
        window[cb] = (data) => {
            cleanup();
            if (data && data.lat && data.lon) {
                resolve(data);
            } else {
                reject(new Error('IP location: no data'));
            }
        };
        const cleanup = () => {
            script.remove();
            delete window[cb];
        };
        script.onerror = () => { cleanup(); reject(new Error('IP location: network error')); };
        document.body.appendChild(script);
        setTimeout(() => {
            if (window[cb]) { cleanup(); reject(new Error('IP location: timeout')); }
        }, 8000);
    });
}

async function fallbackToIP() {
    els.locationText.textContent = '尝试IP定位...';
    try {
        const ipData = await fetchLocationByIP();
        state.lat = ipData.lat;
        state.lon = ipData.lon;
        if (ipData.city) els.locationText.textContent = ipData.city;
        fetchAllWeather(ipData.lat, ipData.lon);
        return true;
    } catch (e) {
        console.warn('IP fallback failed:', e);
        return false;
    }
}

// --- Geolocation ---
function getLocation() {
    const cached = loadCache();
    if (cached && cached.lat && cached.lon) {
        state.lat = cached.lat;
        state.lon = cached.lon;
        if (cached.weather) {
            if (cached.name) els.locationText.textContent = cached.name;
            updateWeatherUI(cached.weather);
            if (cached.weather.daily) renderForecast(cached.weather.daily);
            if (cached.aqi) updateAQIUI(cached.aqi);
        }
        fetchAllWeather(cached.lat, cached.lon);
        return;
    }

    if (!navigator.geolocation) {
        els.locationText.textContent = '浏览器不支持定位';
        fallbackToIP();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            state.lat = pos.coords.latitude;
            state.lon = pos.coords.longitude;
            fetchAllWeather(state.lat, state.lon);
        },
        async (err) => {
            console.warn('Geolocation error:', err.message);
            // iOS Safari over HTTP blocks geolocation — try IP fallback
            const ipOk = await fallbackToIP();
            if (ipOk) return;
            if (cached) {
                els.locationText.textContent = '定位失败，使用上次位置';
                return;
            }
            els.locationText.textContent = '定位失败，使用默认位置 (北京)';
            const fallback = { lat: 39.9042, lon: 116.4074 };
            state.lat = fallback.lat;
            state.lon = fallback.lon;
            fetchAllWeather(fallback.lat, fallback.lon);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
}

// --- Refresh ---
els.refreshBtn.addEventListener('click', () => {
    if (state.lat && state.lon) {
        els.refreshBtn.style.transform = 'rotate(180deg)';
        fetchAllWeather(state.lat, state.lon);
        setTimeout(() => { els.refreshBtn.style.transform = ''; }, 600);
    } else {
        getLocation();
    }
});

// --- Service Worker ---
function registerSW() {
    if ('serviceWorker' in navigator) {
        const proto = window.location.protocol;
        if (proto === 'file:' || proto === 'about:') return;
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.warn('SW registration:', err));
    }
}

// --- PWA Install Prompt ---
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
});

// --- Init ---
let _clockTimer, _weatherTimer;
let _fetching = false;

function _refreshWeather() {
    if (_fetching || !state.lat || !state.lon) return;
    _fetching = true;
    fetchAllWeather(state.lat, state.lon).finally(() => { _fetching = false; });
}

document.addEventListener('DOMContentLoaded', () => {
    getLocation();
    registerSW();
    _clockTimer = setInterval(updateClock, 1000);
    _weatherTimer = setInterval(_refreshWeather, REFRESH_INTERVAL);
});

// Pause all timers when app goes to background (huge battery saving on mobile)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(_clockTimer);
        clearInterval(_weatherTimer);
    } else {
        updateClock();
        _clockTimer = setInterval(updateClock, 1000);
        _refreshWeather();
        _weatherTimer = setInterval(_refreshWeather, REFRESH_INTERVAL);
    }
});
