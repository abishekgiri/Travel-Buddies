import React, { useState, useEffect } from 'react';
import './WeatherWidget.css';

const WeatherWidget = ({ destination, date }) => {
    const [weatherDataList, setWeatherDataList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchWeather = async () => {
            if (!destination) return;

            setLoading(true);
            setError('');

            try {
                const apiKey = import.meta.env.VITE_OWM_API_KEY;
                if (!apiKey) {
                    throw new Error('Weather API key missing');
                }

                // Split destination into cities
                const cities = destination.split(',').map(c => c.trim()).filter(Boolean);
                const results = [];

                for (const city of cities) {
                    try {
                        // First get coordinates
                        const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`);
                        const geoData = await geoRes.json();

                        if (!geoData.length) {
                            console.warn(`Location not found: ${city}`);
                            continue;
                        }

                        const { lat, lon } = geoData[0];

                        // Then get weather
                        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
                        const weatherData = await weatherRes.json();

                        results.push({
                            city: city,
                            temp: Math.round(weatherData.main.temp),
                            condition: weatherData.weather[0].main,
                            description: weatherData.weather[0].description,
                            humidity: weatherData.main.humidity,
                            wind: Math.round(weatherData.wind.speed * 3.6), // Convert m/s to km/h
                            icon: weatherData.weather[0].icon
                        });
                    } catch (e) {
                        console.warn(`Failed to fetch weather for ${city}:`, e);
                    }
                }

                if (results.length === 0) {
                    throw new Error('Could not load weather for any location');
                }

                setWeatherDataList(results);

            } catch (err) {
                console.error('Weather fetch error:', err);
                setError(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [destination]);

    if (loading) return <div className="weather-widget glass loading">Loading weather...</div>;
    if (error) return <div className="weather-widget glass error">{error}</div>;
    if (weatherDataList.length === 0) return null;

    return (
        <div className="weather-widget glass">
            <h3>Trip Weather</h3>
            <div className="weather-list">
                {weatherDataList.map((weather, index) => (
                    <div key={index} className="weather-item" style={{ borderBottom: index < weatherDataList.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        <div className="weather-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h4 style={{ margin: 0 }}>{weather.city}</h4>
                            <span className="weather-temp" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{weather.temp}°C</span>
                        </div>
                        <div className="weather-content" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="weather-main">
                                <img
                                    src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                                    alt={weather.condition}
                                    className="weather-icon-img"
                                    style={{ width: '50px', height: '50px' }}
                                />
                            </div>
                            <div className="weather-details" style={{ fontSize: '0.9rem', color: '#ccc' }}>
                                <p className="condition" style={{ textTransform: 'capitalize', margin: 0 }}>{weather.description}</p>
                                <p style={{ margin: 0 }}>💧 {weather.humidity}%  💨 {weather.wind} km/h</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeatherWidget;
