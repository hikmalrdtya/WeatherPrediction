require("dotenv").config({ path: './backend/.env' });

const {
  fetchWeatherData,
  getAirQualityStatus,
  getHourlyForecast,
  getDailyForecast
} = require("../utils/weatherUtils.js");

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;

exports.getWeatherByCity = async (req, res) => {
  const city = req.params.city;

  if (!OPENWEATHERMAP_API_KEY || !WEATHERAPI_KEY) {
    return res
      .status(500)
      .json({ error: "API key tidak ditemukan. Cek file .env" });
  }

  try {
    const currentWeatherData = await fetchWeatherData(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`
    );

    const forecastData = await fetchWeatherData(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`
    );

    const weatherApiData = await fetchWeatherData(
      `http://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${city}&aqi=yes&days=1`
    );

    const astronomyData = weatherApiData.forecast?.forecastday?.[0]?.astro;
    const uvIndex = weatherApiData.current.uv;
    const airQuality = weatherApiData.current.air_quality;
    const epaIndex = airQuality["us-epa-index"];
    let airStatus = getAirQualityStatus(epaIndex);

    const hourlyData = getHourlyForecast(forecastData);
    const dailyForecastArray = getDailyForecast(forecastData);

    const responseData = {
      current: {
        temp: currentWeatherData.main.temp,
        humidity: currentWeatherData.main.humidity,
        wind_speed: currentWeatherData.wind.speed,
        uv: Number(weatherApiData.current.uv).toFixed(1),
        pressure: currentWeatherData.main.pressure,
        sunrise: new Date(
          currentWeatherData.sys.sunrise * 1000
        ).toLocaleTimeString(),
        sunset: new Date(
          currentWeatherData.sys.sunset * 1000
        ).toLocaleTimeString(),
        air_condition: {
          index: epaIndex,
          status: airStatus,
          co: airQuality.co,
          ozone: airQuality.o3,
          sulfur: airQuality.so2,
        },
      },
      hourly: hourlyData,
      daily: dailyForecastArray,
      astronomy: astronomyData
        ? {
            moon_phase: astronomyData.moon_phase,
            moon_illumination: astronomyData.moon_illumination,
          }
        : null,
      coord: {
        lat: currentWeatherData.coord.lat,
        lon: currentWeatherData.coord.lon,
      },
    };

  res.json(responseData);
  } catch (error) {
    console.error("Error", error.message);
    res
      .status(500)
      .json({ error: error.message || "Terjadi kesalahan server" });
  }
};

exports.searchCities = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  try {
    const data = await fetchWeatherData(
      `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${OPENWEATHERMAP_API_KEY}`
    );
    res.json(data);
  } catch (error) {
    console.error("Error fetching cities:", error);
    res.status(500).json({ error: "Failed to fetch city suggestions" });
  }
};

exports.getWeatherMap = async (req, res) => {
  const layer = req.params.layer;
  const { lat, lon, zoom } = req.query;

  try {
    const layerMap = {
      temp: "temp_new",
      clouds: "clouds_new",
      precipitation: "precipitation_new",
      wind: "wind_new",
    };

    const layerType = layerMap[layer] || "temp_new";
    const tileUrl = `https://tile.openweathermap.org/map/${layerType}/${zoom}/${lat}/${lon}.png?appid=${OPENWEATHERMAP_API_KEY}`;
    const response = await fetch(tileUrl);
    const buffer = await response.buffer();

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (error) {
    console.error("Map tile error:", error);
    res.status(500).json({ error: "Failed to fetch map tiles" });
  }
};

exports.getMapConfig = async (req, res) => {
  if (!OPENWEATHERMAP_API_KEY) {
    return res.status(500).json({ error: "API key tidak ditemukan" });
  }
  res.json({ apiKey: OPENWEATHERMAP_API_KEY });
};