import { WeatherData } from './hub';
import { supabase } from '../lib/supabase';

class WeatherService {
  private readonly BASE_URL = 'https://api.open-meteo.com/v1/forecast';

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      // Fetch current weather and hourly forecast from Open-Meteo with additional parameters
      const response = await fetch(
        `${this.BASE_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,precipitation_probability,rain,showers,visibility,windspeed_10m,winddirection_10m,relativehumidity_2m,uv_index&forecast_days=1`
      );

      if (!response.ok) {
        throw new Error(`Open-Meteo API error: ${response.status}`);
      }

      const data = await response.json();

      // Extract current weather data
      const current = data.current_weather;
      const hourly = data.hourly;

      // Check if rain is expected in the next few hours
      const rainData = this.getRainForecastFromHourly(hourly);

      // Get current visibility (use first hour of forecast as approximation)
      const currentVisibility = hourly.visibility ? hourly.visibility[0] : 10000;

      // Get additional weather parameters
      const windSpeed = hourly.windspeed_10m ? hourly.windspeed_10m[0] : 0;
      const windDirection = hourly.winddirection_10m ? hourly.winddirection_10m[0] : 0;
      const humidity = hourly.relativehumidity_2m ? hourly.relativehumidity_2m[0] : 50;
      const uvIndex = hourly.uv_index ? hourly.uv_index[0] : 0;

      // Calculate weather data
      const temperature = Math.round(current.temperature);
      // Use the first hour of hourly forecast for more accurate weather codes
      const currentWeatherCode = hourly.weathercode ? hourly.weathercode[0] : current.weathercode;
      const condition = this.mapOpenMeteoWeatherCode(currentWeatherCode);
      const visibility = this.calculateVisibility(currentVisibility);
      const pedestrianTraffic = this.calculatePedestrianImpact({ ...current, weathercode: currentWeatherCode }, rainData);
      const visibilityKm = this.convertVisibilityToKm(currentVisibility);

      // Get hourly forecast for next 6 hours
      const hourlyForecast = this.getHourlyForecast(hourly);

      // TODO: Weather data storage disabled to prevent 404 errors
      // Re-enable when store_weather_data function is created in Supabase
      // this.storeWeatherData(latitude, longitude, currentVisibility, temperature, current.weathercode, hourly)
      //   .catch(error => console.warn('Failed to store weather data:', error));

      return {
        temperature,
        condition,
        rainStartsIn: rainData.rainStartsIn,
        visibility,
        pedestrianTraffic,
        visibilityChange: visibilityKm,
        windSpeed: Math.round(windSpeed),
        windDirection: Math.round(windDirection),
        humidity: Math.round(humidity),
        uvIndex: Math.round(uvIndex * 10) / 10, // Round to 1 decimal place
        hourlyForecast
      };
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return this.getLocationAwareMockWeatherData(latitude, longitude);
    }
  }

  private getRainForecastFromHourly(hourly: any): { rainStartsIn: number | undefined } {
    try {
      const now = new Date();
      const currentHour = now.getHours();

      // Check next 12 hours for rain (Open-Meteo provides hourly data)
      for (let i = 0; i < Math.min(hourly.time.length, 12); i++) {
        const forecastTime = new Date(hourly.time[i]);
        const hourDiff = (forecastTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Only consider forecasts within the next 3 hours
        if (hourDiff >= 0 && hourDiff < 3) {
          const precipitationProb = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;
          const rainAmount = hourly.rain ? hourly.rain[i] : 0;
          const showersAmount = hourly.showers ? hourly.showers[i] : 0;

          // Check for rain if precipitation probability > 50% or rain/showers amount > 0.1mm
          if (precipitationProb > 50 || rainAmount > 0.1 || showersAmount > 0.1) {
            const minutesUntilRain = Math.round((forecastTime.getTime() - now.getTime()) / (1000 * 60));
            return { rainStartsIn: Math.max(1, minutesUntilRain) };
          }
        }
      }

      return { rainStartsIn: undefined };
    } catch (error) {
      console.error('Error processing rain forecast:', error);
      return { rainStartsIn: undefined };
    }
  }

  private mapWeatherCondition(condition: string): string {
    const conditionMap: { [key: string]: string } = {
      'Clear': 'Clear',
      'Clouds': 'Cloudy',
      'Rain': 'Rain',
      'Drizzle': 'Light Rain',
      'Thunderstorm': 'Thunderstorm',
      'Snow': 'Snow',
      'Mist': 'Foggy',
      'Fog': 'Foggy',
      'Haze': 'Hazy'
    };

    return conditionMap[condition] || 'Partly Cloudy';
  }

  private mapOpenMeteoWeatherCode(code: number): string {
    // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
    // Updated mapping to be more user-friendly and match common expectations
    const codeMap: { [key: number]: string } = {
      0: 'Sunny',        // Clear sky - show as Sunny for better UX
      1: 'Mostly Sunny', // Mainly clear - show as Mostly Sunny
      2: 'Partly Sunny', // Partly cloudy - show as Partly Sunny
      3: 'Cloudy',       // Overcast
      45: 'Foggy',       // Fog
      48: 'Foggy',       // Depositing rime fog
      51: 'Light Rain',  // Drizzle: Light
      53: 'Light Rain',  // Drizzle: Moderate
      55: 'Light Rain',  // Drizzle: Dense
      56: 'Light Rain',  // Freezing Drizzle: Light
      57: 'Light Rain',  // Freezing Drizzle: Dense
      61: 'Rain',        // Rain: Slight
      63: 'Rain',        // Rain: Moderate
      65: 'Rain',        // Rain: Heavy
      66: 'Rain',        // Freezing Rain: Light
      67: 'Rain',        // Freezing Rain: Heavy
      71: 'Snow',        // Snow fall: Slight
      73: 'Snow',        // Snow fall: Moderate
      75: 'Snow',        // Snow fall: Heavy
      77: 'Snow',        // Snow grains
      80: 'Rain',        // Rain showers: Slight
      81: 'Rain',        // Rain showers: Moderate
      82: 'Rain',        // Rain showers: Violent
      85: 'Snow',        // Snow showers slight
      86: 'Snow',        // Snow showers heavy
      95: 'Thunderstorm', // Thunderstorm: Slight or moderate
      96: 'Thunderstorm', // Thunderstorm with slight hail
      99: 'Thunderstorm'  // Thunderstorm with heavy hail
    };

    return codeMap[code] || 'Partly Sunny';
  }

  private calculateVisibility(visibility: number): 'Low' | 'Medium' | 'High' {
    // Visibility in meters
    if (visibility < 1000) return 'Low';
    if (visibility < 5000) return 'Medium';
    return 'High';
  }

  private calculatePedestrianImpact(weather: any, rainData: any): number {
    let impact = 0;

    // Rain impact - check weather code for rain conditions or if rain is starting soon
    const weatherCode = weather.weathercode;
    const isRaining = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode);
    if (isRaining || rainData.rainStartsIn) {
      impact -= 40; // Significant reduction in pedestrian traffic
    }

    // Temperature impact (extreme temperatures reduce outdoor activity)
    const temperature = weather.temperature;
    if (temperature < 5 || temperature > 30) {
      impact -= 20;
    }

    // Wind impact (high winds discourage walking) - Open-Meteo doesn't include wind in current_weather
    // Could be added if we fetch additional hourly data, but for now we'll skip this

    return Math.max(-80, Math.min(20, impact)); // Clamp between -80% and +20%
  }

  private convertVisibilityToKm(visibilityMeters: number): number {
    // Convert meters to kilometers and round to 1 decimal place
    const km = visibilityMeters / 1000;
    return Math.round(km * 10) / 10;
  }

  private async storeWeatherData(
    latitude: number,
    longitude: number,
    visibility: number,
    temperature: number,
    weatherCode: number,
    hourlyData: any
  ): Promise<void> {
    try {
      // Extract additional weather data from hourly data
      const humidity = hourlyData.relativehumidity_2m ? hourlyData.relativehumidity_2m[0] : null;
      const windSpeed = hourlyData.windspeed_10m ? hourlyData.windspeed_10m[0] : null;
      const precipitation = hourlyData.precipitation ? hourlyData.precipitation[0] : null;

      // Store using the database function
      const { error } = await supabase.rpc('store_weather_data', {
        p_latitude: latitude,
        p_longitude: longitude,
        p_visibility_meters: Math.round(visibility),
        p_temperature_celsius: temperature,
        p_humidity_percent: humidity,
        p_wind_speed_ms: windSpeed,
        p_precipitation_mm: precipitation,
        p_weather_code: weatherCode
      });

      if (error) {
        console.warn('Error storing weather data:', error);
      }
    } catch (error) {
      console.warn('Error in storeWeatherData:', error);
    }
  }

  private getLocationAwareMockWeatherData(latitude: number, longitude: number): WeatherData {
    // Generate realistic weather data based on location and time
    const now = new Date();
    const hour = now.getHours();

    // Base temperature varies by latitude (rough approximation)
    let baseTemp = 20;
    if (Math.abs(latitude) > 40) baseTemp = 10; // Colder at higher latitudes
    else if (Math.abs(latitude) < 20) baseTemp = 25; // Warmer at lower latitudes

    // Add daily temperature variation
    const tempVariation = Math.sin((hour - 6) * Math.PI / 12) * 8; // Peak at 6 PM
    const temperature = Math.round(baseTemp + tempVariation + (Math.random() - 0.5) * 6);

    // Weather conditions based on time and location
    const conditions = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Mist', 'Fog'];
    let conditionWeights = [0.4, 0.3, 0.1, 0.1, 0.05, 0.05]; // Default weights

    // Adjust for time of day
    if (hour >= 6 && hour <= 18) {
      conditionWeights[0] += 0.2; // More clear during day
    } else {
      conditionWeights[1] += 0.1; // More cloudy at night
      conditionWeights[4] += 0.05; // More mist/fog at night
      conditionWeights[5] += 0.05;
    }

    // Adjust for latitude (more rain at certain latitudes)
    if (Math.abs(latitude) > 30 && Math.abs(latitude) < 60) {
      conditionWeights[2] += 0.1; // More rain in temperate zones
      conditionWeights[3] += 0.1;
    }

    const condition = this.weightedRandomChoice(conditions, conditionWeights);

    // Rain timing (if rainy condition)
    let rainStartsIn: number | undefined;
    if (condition === 'Rain' || condition === 'Drizzle') {
      rainStartsIn = Math.floor(Math.random() * 180) + 15; // 15-195 minutes
    }

    // Visibility based on condition and time
    let visibility: 'Low' | 'Medium' | 'High' = 'High';
    if (condition === 'Fog' || condition === 'Mist') {
      visibility = 'Low';
    } else if (condition === 'Rain' || condition === 'Drizzle') {
      visibility = Math.random() > 0.5 ? 'Medium' : 'Low';
    } else if (hour < 6 || hour > 20) {
      visibility = Math.random() > 0.7 ? 'Medium' : 'High'; // Sometimes lower at night
    }

    // Pedestrian traffic impact
    let pedestrianTraffic = 0;
    if (condition === 'Rain' || condition === 'Drizzle' || rainStartsIn) {
      pedestrianTraffic -= 30 + Math.random() * 30; // -30% to -60%
    }
    if (temperature < 5 || temperature > 30) {
      pedestrianTraffic -= 15 + Math.random() * 10; // Additional impact from temperature
    }

    // Visibility change (random variation)
    const visibilityChange = Math.round((Math.random() - 0.5) * 40); // -20% to +20%

    return {
      temperature,
      condition: this.mapWeatherCondition(condition),
      rainStartsIn,
      visibility,
      pedestrianTraffic: Math.round(Math.max(-80, Math.min(20, pedestrianTraffic))),
      visibilityChange
    };
  }

  private weightedRandomChoice(options: string[], weights: number[]): string {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < options.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return options[i];
      }
    }

    return options[0]; // Fallback
  }

  private getHourlyForecast(hourly: any): Array<{
    time: string;
    temperature: number;
    condition: string;
    precipitationProbability: number;
  }> {
    try {
      const now = new Date();
      const forecast = [];

      // Get next 6 hours of forecast
      for (let i = 0; i < Math.min(hourly.time.length, 6); i++) {
        const forecastTime = new Date(hourly.time[i]);
        const hourDiff = (forecastTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Only include future hours
        if (hourDiff >= 0) {
          const temp = Math.round(hourly.temperature_2m[i]);
          const weatherCode = hourly.weathercode ? hourly.weathercode[i] : 0;
          const precipProb = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;

          forecast.push({
            time: forecastTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              hour12: true
            }),
            temperature: temp,
            condition: this.mapOpenMeteoWeatherCode(weatherCode),
            precipitationProbability: Math.round(precipProb)
          });
        }
      }

      return forecast;
    } catch (error) {
      console.error('Error processing hourly forecast:', error);
      return [];
    }
  }

  private getMockWeatherData(): WeatherData {
    return {
      temperature: 15,
      condition: 'Partly Cloudy',
      rainStartsIn: 42,
      visibility: 'Low',
      pedestrianTraffic: -60,
      visibilityChange: -23
    };
  }
}

export const weatherService = new WeatherService();
