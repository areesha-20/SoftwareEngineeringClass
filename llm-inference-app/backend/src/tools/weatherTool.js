/**
 * weatherTool.js
 * Fetches real weather data from Open-Meteo (free, no API key required)
 */

class WeatherTool {
  static NAME = 'weather';
  static DESCRIPTION = 'Fetches real current weather for a city';

  static canHandle(prompt) {
    const p = prompt.toLowerCase();
    return /weather|temperature|temp|forecast|raining|sunny|humid|wind speed/.test(p);
  }

  static extractCity(prompt) {
    const p = prompt.toLowerCase().replace(/[?!.]/g, '');
    const patterns = [
      /(?:weather|temperature|temp|forecast)\s+(?:in|at|for)\s+([a-z][a-z\s]{1,30}?)(?:\s*$)/i,
      /(?:in|at|for)\s+([a-z][a-z\s]{1,30}?)(?:\s*$)/i,
      /([a-z][a-z\s]{1,20}?)\s+weather/i
    ];
    for (const pattern of patterns) {
      const match = p.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  static async geocode(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    if (!data.results || data.results.length === 0) throw new Error(`City not found: ${city}`);
    const { latitude, longitude, name, country } = data.results[0];
    return { latitude, longitude, name, country };
  }

  static async fetchWeather(latitude, longitude) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');
    return res.json();
  }

  static describeWeatherCode(code) {
    if (code === 0) return 'Clear sky';
    if (code <= 3) return 'Partly cloudy';
    if (code <= 49) return 'Foggy';
    if (code <= 67) return 'Rainy';
    if (code <= 77) return 'Snowy';
    if (code <= 82) return 'Rain showers';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
  }

  static async run(prompt) {
    try {
      const city = WeatherTool.extractCity(prompt);
      if (!city) return null;

      const { latitude, longitude, name, country } = await WeatherTool.geocode(city);
      const weatherData = await WeatherTool.fetchWeather(latitude, longitude);
      const current = weatherData.current;

      const condition = WeatherTool.describeWeatherCode(current.weather_code);
      const temp = current.temperature_2m;
      const humidity = current.relative_humidity_2m;
      const wind = current.wind_speed_10m;

      return {
        tool: 'weather',
        city: `${name}, ${country}`,
        result: { temp, humidity, wind, condition },
        message: `Current weather in **${name}, ${country}**: ${condition}, ${temp}°F, humidity ${humidity}%, wind ${wind} mph.`
      };
    } catch (e) {
      return null;
    }
  }
}

module.exports = WeatherTool;
