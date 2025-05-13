const express = require("express");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static("public"));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  next();
});

app.get("/", (req, res) => {
  res.send("Welcome to Backend Weather Prediction");
});

app.get("/weather/:city", async (req, res) => {
  const city = req.params.city;
  const openWeatherKey = process.env.OPENWEATHERMAP_API_KEY;
  const weatherApiKey = process.env.WEATHERAPI_KEY;

  if (!openWeatherKey || !weatherApiKey) {
    return res
      .status(500)
      .json({ error: "API key tidak ditemukan. Cek file .env" });
  }

  try {
    const currentWeatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${openWeatherKey}&units=metric`
    );
    if (!currentWeatherResponse.ok) {
      const errorData = await currentWeatherResponse.json();
      return res.status(currentWeatherResponse.status).json({
        error: errorData.message || "Gagal mengambil data cuaca saat ini",
      });
    }
    const currentWeatherData = await currentWeatherResponse.json();

    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${openWeatherKey}&units=metric`
    );
    if (!forecastResponse.ok) {
      const errorData = await forecastResponse.json();
      return res.status(forecastResponse.status).json({
        error: errorData.message || "Gagal mengambil data prakiraan cuaca",
      });
    }
    const forecastData = await forecastResponse.json();

    const weatherApiResponse = await fetch(
      `http://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${city}&aqi=yes&days=1`
    );
    if (!weatherApiResponse.ok) {
      const errorData = await weatherApiResponse.json();
      return res.status(weatherApiResponse.status).json({
        error: errorData.message || "Gagal mengambil data dari WeatherAPI",
      });
    }

    const weatherApiData = await weatherApiResponse.json();
	// Extract astronomy data
    const astronomyData = weatherApiData.forecast?.forecastday?.[0]?.astro;
    const uvIndex = weatherApiData.current.uv;
    const airQuality = weatherApiData.current.air_quality;
    const epaIndex = airQuality["us-epa-index"];
    let airStatus = "Tidak diketahui";

    switch (epaIndex) {
      case 1:
        airStatus = "Baik";
        break;
      case 2:
        airStatus = "Sedang";
        break;
      case 3:
        airStatus = "Tidak sehat bagi kelompok sensitif";
        break;
      case 4:
        airStatus = "Tidak sehat";
        break;
      case 5:
        airStatus = "Sangat tidak sehat";
        break;
      case 6:
        airStatus = "Berbahaya";
        break;
    }

    const now = new Date();
    const hourlyData = [];
    for (let i = 0; i < 8; i++) {
      const targetTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      let closestData = forecastData.list.reduce((prev, curr) => {
        const prevDiff = Math.abs(new Date(prev.dt * 1000) - targetTime);
        const currDiff = Math.abs(new Date(curr.dt * 1000) - targetTime);
        return prevDiff < currDiff ? prev : curr;
      });

      hourlyData.push({
        waktu: targetTime.toISOString(), // Changed from toLocaleString() to toISOString()
        suhu: closestData.main.temp,
        deskripsi: closestData.weather[0].description,
        ikon: closestData.weather[0].icon,
        humidity: closestData.main.humidity,
        wind_speed: closestData.wind.speed,
      });
    }

    const dailyDataMap = {};
    const today = new Date();

    forecastData.list.forEach((item) => {
      const dateKey = new Date(item.dt * 1000).toISOString().split("T")[0];
      const diffDay = Math.ceil(
        Math.abs(new Date(dateKey) - today) / (1000 * 60 * 60 * 24)
      );

      if (diffDay < 7) {
        if (!dailyDataMap[dateKey]) {
          dailyDataMap[dateKey] = {
            date: dateKey,
            minTemp: item.main.temp_min,
            maxTemp: item.main.temp_max,
            deskripsi: item.weather[0].description,
            ikon: item.weather[0].icon,
          };
        } else {
          dailyDataMap[dateKey].minTemp = Math.min(
            dailyDataMap[dateKey].minTemp,
            item.main.temp_min
          );
          dailyDataMap[dateKey].maxTemp = Math.max(
            dailyDataMap[dateKey].maxTemp,
            item.main.temp_max
          );
        }
      }
    });

    const dailyForecastArray = Object.values(dailyDataMap);
    const maxAvailableDay = 5;

    for (let i = dailyForecastArray.length; i < 7; i++) {
      const nextDay = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDayFormatted = nextDay.toISOString().split("T")[0];

      const closestData = forecastData.list.find((item) => {
        const itemDate = new Date(item.dt * 1000).toISOString().split("T")[0];
        return itemDate === nextDayFormatted;
      });

      if (!closestData) {
        console.warn(`Data untuk tanggal ${nextDayFormatted} tidak tersedia`);
        continue;
      }

      dailyForecastArray.push({
        date: nextDayFormatted,
        minTemp: closestData.main.temp_min,
        maxTemp: closestData.main.temp_max,
        deskripsi: closestData.weather[0].description,
        ikon: closestData.weather[0].icon,
      });
    }

    console.log("UV Index:", weatherApiData.current.uv);

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
    res
      .status(500)
      .json({ error: error.message || "Terjadi kesalahan server" });
  }
});

app.get("/search/cities", async (req, res) => {
  const query = req.query.q;
  const openWeatherKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  try {
    const response = await fetch(
      `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${openWeatherKey}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching cities:", error);
    res.status(500).json({ error: "Failed to fetch city suggestions" });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

app.get("/weather-map/:layer", async (req, res) => {
  const layer = req.params.layer;
  const openWeatherKey = process.env.OPENWEATHERMAP_API_KEY;
  const { lat, lon, zoom } = req.query;

  try {
    const layerMap = {
      temp: "temp_new",
      clouds: "clouds_new",
      precipitation: "precipitation_new",
      wind: "wind_new",
    };

    const layerType = layerMap[layer] || "temp_new";
    const tileUrl = `https://tile.openweathermap.org/map/${layerType}/${zoom}/${lat}/${lon}.png?appid=${openWeatherKey}`;

    const response = await fetch(tileUrl);
    const buffer = await response.buffer();

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (error) {
    console.error("Map tile error:", error);
    res.status(500).json({ error: "Failed to fetch map tiles" });
  }
});

// Add this endpoint before app.listen()
app.get("/map-config", (req, res) => {
  const openWeatherKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!openWeatherKey) {
    return res.status(500).json({ error: "API key tidak ditemukan" });
  }
  res.json({ apiKey: openWeatherKey });
});
