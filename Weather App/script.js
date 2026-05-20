const cityInput = document.getElementById('city-input');
const searchResults = document.getElementById('search-results');
const locationBtn = document.getElementById('location-btn');
const loadingSection = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const weatherContent = document.getElementById('weather-content');
const appWrapper = document.getElementById('app-wrapper');

// Debounce timer for search
let searchTimeout = null;

// Base URLs
const GEO_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

// Weather Icons Base URL
const ICON_BASE_URL = 'https://bmcdn.nl/assets/weather-icons/v3.0/fill/svg/';

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
const weatherCodeMap = {
    0: { desc: 'Clear sky', iconDay: 'clear-day.svg', iconNight: 'clear-night.svg', theme: 'clear' },
    1: { desc: 'Mainly clear', iconDay: 'partly-cloudy-day.svg', iconNight: 'partly-cloudy-night.svg', theme: 'clear' },
    2: { desc: 'Partly cloudy', iconDay: 'partly-cloudy-day.svg', iconNight: 'partly-cloudy-night.svg', theme: 'cloudy' },
    3: { desc: 'Overcast', iconDay: 'overcast-day.svg', iconNight: 'overcast-night.svg', theme: 'cloudy' },
    45: { desc: 'Fog', iconDay: 'fog-day.svg', iconNight: 'fog-night.svg', theme: 'cloudy' },
    48: { desc: 'Depositing rime fog', iconDay: 'fog-day.svg', iconNight: 'fog-night.svg', theme: 'cloudy' },
    51: { desc: 'Light drizzle', iconDay: 'drizzle.svg', iconNight: 'drizzle.svg', theme: 'rainy' },
    53: { desc: 'Moderate drizzle', iconDay: 'drizzle.svg', iconNight: 'drizzle.svg', theme: 'rainy' },
    55: { desc: 'Dense drizzle', iconDay: 'drizzle.svg', iconNight: 'drizzle.svg', theme: 'rainy' },
    56: { desc: 'Light freezing drizzle', iconDay: 'sleet.svg', iconNight: 'sleet.svg', theme: 'snowy' },
    57: { desc: 'Dense freezing drizzle', iconDay: 'sleet.svg', iconNight: 'sleet.svg', theme: 'snowy' },
    61: { desc: 'Slight rain', iconDay: 'rain.svg', iconNight: 'rain.svg', theme: 'rainy' },
    63: { desc: 'Moderate rain', iconDay: 'rain.svg', iconNight: 'rain.svg', theme: 'rainy' },
    65: { desc: 'Heavy rain', iconDay: 'rain.svg', iconNight: 'rain.svg', theme: 'rainy' },
    66: { desc: 'Light freezing rain', iconDay: 'sleet.svg', iconNight: 'sleet.svg', theme: 'snowy' },
    67: { desc: 'Heavy freezing rain', iconDay: 'sleet.svg', iconNight: 'sleet.svg', theme: 'snowy' },
    71: { desc: 'Slight snow fall', iconDay: 'snow.svg', iconNight: 'snow.svg', theme: 'snowy' },
    73: { desc: 'Moderate snow fall', iconDay: 'snow.svg', iconNight: 'snow.svg', theme: 'snowy' },
    75: { desc: 'Heavy snow fall', iconDay: 'snow.svg', iconNight: 'snow.svg', theme: 'snowy' },
    77: { desc: 'Snow grains', iconDay: 'snow.svg', iconNight: 'snow.svg', theme: 'snowy' },
    80: { desc: 'Slight rain showers', iconDay: 'partly-cloudy-day-rain.svg', iconNight: 'partly-cloudy-night-rain.svg', theme: 'rainy' },
    81: { desc: 'Moderate rain showers', iconDay: 'partly-cloudy-day-rain.svg', iconNight: 'partly-cloudy-night-rain.svg', theme: 'rainy' },
    82: { desc: 'Violent rain showers', iconDay: 'rain.svg', iconNight: 'rain.svg', theme: 'rainy' },
    85: { desc: 'Slight snow showers', iconDay: 'partly-cloudy-day-snow.svg', iconNight: 'partly-cloudy-night-snow.svg', theme: 'snowy' },
    86: { desc: 'Heavy snow showers', iconDay: 'snow.svg', iconNight: 'snow.svg', theme: 'snowy' },
    95: { desc: 'Thunderstorm', iconDay: 'thunderstorms-day.svg', iconNight: 'thunderstorms-night.svg', theme: 'rainy' },
    96: { desc: 'Thunderstorm with slight hail', iconDay: 'thunderstorms-day-extreme.svg', iconNight: 'thunderstorms-night-extreme.svg', theme: 'rainy' },
    99: { desc: 'Thunderstorm with heavy hail', iconDay: 'thunderstorms-day-extreme.svg', iconNight: 'thunderstorms-night-extreme.svg', theme: 'rainy' }
};

// Default fallback
const defaultWeather = { desc: 'Unknown', iconDay: 'not-available.svg', iconNight: 'not-available.svg', theme: 'clear' };

// Event Listeners
cityInput.addEventListener('input', handleSearchInput);
locationBtn.addEventListener('click', getUserLocation);

// Initialize with a default city if no location permission
window.addEventListener('load', () => {
    // Try to get user location first, if fails or denied, show default (e.g. London)
    getWeatherData(51.5085, -0.1257, 'London', 'United Kingdom', 'Europe/London');
});

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    if (!cityInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
    }
});

function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        searchResults.classList.add('hidden');
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchCities(query);
    }, 500);
}

async function searchCities(query) {
    try {
        const response = await fetch(`${GEO_API_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            displaySearchResults(data.results);
        } else {
            searchResults.innerHTML = '<div class="search-result-item">No locations found</div>';
            searchResults.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error searching cities:', error);
    }
}

function displaySearchResults(results) {
    searchResults.innerHTML = '';
    
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        
        // Construct location string (City, Admin1, Country)
        let locationDetails = '';
        if (result.admin1) locationDetails += `${result.admin1}, `;
        locationDetails += result.country;

        item.innerHTML = `
            <div class="search-result-name">${result.name}</div>
            <div class="search-result-country">${locationDetails}</div>
        `;
        
        item.addEventListener('click', () => {
            cityInput.value = result.name;
            searchResults.classList.add('hidden');
            getWeatherData(result.latitude, result.longitude, result.name, result.country, result.timezone);
        });
        
        searchResults.appendChild(item);
    });
    
    searchResults.classList.remove('hidden');
}

function getUserLocation() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Reverse geocoding to get city name
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                    const data = await response.json();
                    
                    const city = data.address.city || data.address.town || data.address.village || 'Your Location';
                    const country = data.address.country || '';
                    
                    getWeatherData(lat, lon, city, country, 'auto');
                } catch (error) {
                    // Fallback if reverse geocoding fails
                    getWeatherData(lat, lon, 'Your Location', '', 'auto');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                showError('Location access denied. Please search for a city.');
            }
        );
    } else {
        showError('Geolocation is not supported by this browser.');
    }
}

async function getWeatherData(lat, lon, cityName, countryName, timezone) {
    showLoading();
    
    try {
        const tzParam = timezone && timezone !== 'auto' ? `&timezone=${encodeURIComponent(timezone)}` : '&timezone=auto';
        
        const response = await fetch(
            `${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timeformat=unixtime${tzParam}`
        );
        
        if (!response.ok) throw new Error('Weather data fetch failed');
        
        const data = await response.json();
        updateUI(data, cityName, countryName);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError('Failed to fetch weather data. Please try again.');
    }
}

function updateUI(data, cityName, countryName) {
    hideLoading();
    
    const current = data.current;
    const daily = data.daily;
    const isDay = current.is_day === 1;
    
    // Update Header Info
    document.getElementById('city-name').textContent = cityName;
    document.getElementById('country-name').textContent = countryName;
    
    // Format Date & Time
    const date = new Date(current.time * 1000);
    const options = { weekday: 'long', hour: 'numeric', minute: '2-digit' };
    document.getElementById('date-time').textContent = date.toLocaleDateString('en-US', options);
    
    // Weather Code Interpretation
    const weatherInfo = weatherCodeMap[current.weather_code] || defaultWeather;
    const iconName = isDay ? weatherInfo.iconDay : weatherInfo.iconNight;
    
    // Update Theme based on weather
    updateTheme(weatherInfo.theme, isDay);
    
    // Current Weather
    document.getElementById('temp').textContent = Math.round(current.temperature_2m);
    document.getElementById('weather-icon').src = `${ICON_BASE_URL}${iconName}`;
    document.getElementById('weather-description').textContent = weatherInfo.desc;
    
    // Details
    document.getElementById('feels-like').textContent = Math.round(current.apparent_temperature);
    document.getElementById('humidity').textContent = Math.round(current.relative_humidity_2m);
    document.getElementById('wind-speed').textContent = Math.round(current.wind_speed_10m);
    document.getElementById('cloud-cover').textContent = Math.round(current.cloud_cover);
    
    // Update Forecast
    updateForecast(daily);
    
    // Show Content
    weatherContent.classList.remove('hidden');
    document.getElementById('forecast-section').classList.remove('hidden');
}

function updateForecast(daily) {
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = '';
    
    // Skip today (index 0) and show next 6 days
    for (let i = 1; i <= 6; i++) {
        if (!daily.time[i]) continue;
        
        const date = new Date(daily.time[i] * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const weatherCode = daily.weather_code[i];
        const weatherInfo = weatherCodeMap[weatherCode] || defaultWeather;
        
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        
        const item = document.createElement('div');
        item.className = 'forecast-item';
        item.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <img class="forecast-icon" src="${ICON_BASE_URL}${weatherInfo.iconDay}" alt="${weatherInfo.desc}">
            <div class="forecast-temp">${maxTemp}° <span style="font-size: 0.8rem; color: var(--text-secondary)">${minTemp}°</span></div>
        `;
        
        forecastContainer.appendChild(item);
    }
}

function updateTheme(theme, isDay) {
    appWrapper.className = 'app-wrapper'; // reset
    
    if (!isDay && theme === 'clear') {
        appWrapper.classList.add('clear-night');
    } else if (theme) {
        appWrapper.classList.add(theme);
    }
}

function showLoading() {
    weatherContent.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loadingSection.classList.remove('hidden');
}

function hideLoading() {
    loadingSection.classList.add('hidden');
}

function showError(msg) {
    weatherContent.classList.add('hidden');
    loadingSection.classList.add('hidden');
    document.getElementById('error-text').textContent = msg;
    errorMessage.classList.remove('hidden');
}
