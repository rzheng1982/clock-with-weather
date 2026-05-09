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
const WMO_CODES = {
    0:  { icon: '☀️', text: '晴朗' },
    1:  { icon: '🌤️', text: '大部晴朗' },
    2:  { icon: '⛅',  text: '多云' },
    3:  { icon: '☁️',  text: '阴天' },
    45: { icon: '🌫️', text: '雾' },
    48: { icon: '🌫️', text: '雾凇' },
    51: { icon: '🌦️', text: '小毛毛雨' },
    53: { icon: '🌦️', text: '毛毛雨' },
    55: { icon: '🌦️', text: '大毛毛雨' },
    56: { icon: '🌧️', text: '冻毛毛雨' },
    57: { icon: '🌧️', text: '冻毛毛雨' },
    61: { icon: '🌧️', text: '小雨' },
    63: { icon: '🌧️', text: '中雨' },
    65: { icon: '🌧️', text: '大雨' },
    66: { icon: '🌧️', text: '冻雨' },
    67: { icon: '🌧️', text: '冻雨' },
    71: { icon: '🌨️', text: '小雪' },
    73: { icon: '🌨️', text: '中雪' },
    75: { icon: '❄️',  text: '大雪' },
    77: { icon: '❄️',  text: '雪粒' },
    80: { icon: '🌦️', text: '阵雨' },
    81: { icon: '🌧️', text: '中阵雨' },
    82: { icon: '🌧️', text: '大阵雨' },
    85: { icon: '🌨️', text: '阵雪' },
    86: { icon: '❄️',  text: '大阵雪' },
    95: { icon: '⛈️', text: '雷暴' },
    96: { icon: '⛈️', text: '雷暴伴冰雹' },
    99: { icon: '⛈️', text: '强雷暴伴冰雹' },
};

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const UV_LEVELS = [
    { max: 2,  label: '低', color: '#66bb6a' },
    { max: 5,  label: '中等', color: '#ffa726' },
    { max: 7,  label: '高', color: '#ff7043' },
    { max: 10, label: '很高', color: '#ef5350' },
    { max: Infinity, label: '极高', color: '#ab47bc' },
];

const AQI_LEVELS = [
    { max: 20,   label: '优', color: '#66bb6a' },
    { max: 40,   label: '良好', color: '#aed581' },
    { max: 60,   label: '中等', color: '#ffa726' },
    { max: 80,   label: '差', color: '#ff7043' },
    { max: 100,  label: '很差', color: '#ef5350' },
    { max: Infinity, label: '极差', color: '#b71c1c' },
];

const CACHE_KEY = 'clockWeatherCache';
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 min
const REFRESH_INTERVAL = 10 * 60 * 1000;

// --- Clock ---
function updateClock() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();

    els.hours.textContent   = String(h).padStart(2, '0');
    els.minutes.textContent = String(m).padStart(2, '0');
    els.seconds.textContent = String(s).padStart(2, '0');

    els.dateDisplay.textContent = now.toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
}

setInterval(updateClock, 1000);
updateClock();

// --- API ---
async function fetchWeather(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,uv_index',
        daily: 'temperature_2m_max,temperature_2m_min,weather_code',
        forecast_days: 7,
        timezone: 'auto',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    return res.json();
}

async function fetchAQI(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'european_aqi',
    });
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
    if (!res.ok) throw new Error(`AQI API ${res.status}`);
    return res.json();
}

async function fetchLocationName(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=zh`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ClockWeatherApp/2.0' } });
    if (!res.ok) throw new Error(`Geocode ${res.status}`);
    const data = await res.json();
    const a = data.address || {};
    return a.city || a.town || a.village || a.county || a.state || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
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
    els.tempValue.textContent = `${Math.round(c.temperature_2m)}°C`;
    els.feelsLike.textContent = `体感 ${Math.round(c.apparent_temperature)}°C`;
    pulseCard(els.tempValue.closest('.weather-card'));

    // Condition
    const w = WMO_CODES[c.weather_code] || WMO_CODES[0];
    els.conditionIcon.textContent = w.icon;
    els.conditionText.textContent = w.text;
    els.humidityText.textContent = `湿度: ${c.relative_humidity_2m}%`;
    pulseCard(els.conditionText.closest('.weather-card'));

    // UV Index
    const uv = c.uv_index;
    els.uvValue.textContent = uv.toFixed(1);
    const uvInfo = UV_LEVELS.find(l => uv <= l.max);
    els.uvValue.style.color = uvInfo.color;
    els.uvLevel.textContent = uvInfo.label;
    els.uvLevel.style.color = uvInfo.color;
    els.uvValue.closest('.weather-card').style.setProperty('--accent', uvInfo.color);
    pulseCard(els.uvValue.closest('.weather-card'));
}

function updateAQIUI(data) {
    const aqi = data.current?.european_aqi;
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
    if (!daily || !daily.time) return;

    const container = els.forecastContainer;
    container.innerHTML = '';

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    for (let i = 0; i < daily.time.length; i++) {
        const dateStr = daily.time[i];
        const date = new Date(dateStr + 'T12:00:00');
        const isToday = dateStr === todayStr;

        // Day name
        let dayName;
        if (isToday) {
            dayName = '今天';
        } else if (i === 1) {
            dayName = '明天';
        } else {
            dayName = DAY_NAMES[date.getDay()];
        }

        const weather = WMO_CODES[daily.weather_code[i]] || WMO_CODES[0];
        const high = Math.round(daily.temperature_2m_max[i]);
        const low  = Math.round(daily.temperature_2m_min[i]);

        const card = document.createElement('div');
        card.className = 'forecast-card' + (isToday ? ' today' : '');
        card.innerHTML = `
            <div class="fc-day">${dayName}</div>
            <div class="fc-icon">${weather.icon}</div>
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
        els.locationText.textContent = '浏览器不支持定位，使用默认位置';
        const fallback = { lat: 39.9042, lon: 116.4074 };
        state.lat = fallback.lat;
        state.lon = fallback.lon;
        fetchAllWeather(fallback.lat, fallback.lon);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            state.lat = pos.coords.latitude;
            state.lon = pos.coords.longitude;
            fetchAllWeather(state.lat, state.lon);
        },
        (err) => {
            console.warn('Geolocation error:', err.message);
            if (cached) {
                els.locationText.textContent = '位置获取失败，使用上次位置';
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
document.addEventListener('DOMContentLoaded', () => {
    getLocation();
    registerSW();
    setInterval(() => {
        if (state.lat && state.lon) fetchAllWeather(state.lat, state.lon);
    }, REFRESH_INTERVAL);
});
