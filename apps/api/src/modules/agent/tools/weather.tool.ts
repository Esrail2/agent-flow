export const WeatherToolSchema = {
  type: 'function',
  function: {
    name: 'get_current_weather',
    description: 'Get the current weather for a specific location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city and state/country, e.g., San Francisco, CA or Tokyo, Japan',
        },
      },
      required: ['location'],
    },
  },
};

export async function executeWeatherTool(args: any): Promise<string> {
  const { location } = args;
  try {
    // For simplicity, we use open-meteo which requires lat/lon. 
    // We will do a simple geocoding using a free geocoding API or just mock it if it's too complex.
    // Let's use a mock implementation for now to satisfy the PRD quickly, 
    // or we could use the open-meteo geocoding API.
    
    const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
    const geoData = await geoResponse.json() as any;

    if (!geoData.results || geoData.results.length === 0) {
      return JSON.stringify({ error: `Could not find coordinates for location: ${location}` });
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`);
    const weatherData = await weatherResponse.json() as any;

    return JSON.stringify({
      location: `${name}, ${country}`,
      temperature: weatherData.current.temperature_2m + '°C',
      humidity: weatherData.current.relative_humidity_2m + '%',
      wind_speed: weatherData.current.wind_speed_10m + ' km/h',
    });
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to fetch weather: ${error.message}` });
  }
}
