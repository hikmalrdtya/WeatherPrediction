require("dotenv").config({ path: './backend/.env' });

exports.fetchWeatherData = async (url) => {
  const res = await fetch(url);
  const contentType = res.headers.get("content-type");

  if (!res.ok) {
    let errorMessage = "Failed to fetch weather data";

    if (contentType && contentType.includes("application/json")) {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
    } else {
      const text = await res.text();
      console.error("Non-JSON error response:", text);
    }
    throw new Error(errorMessage);
  }

  return res.json();
};

exports.getAirQualityStatus = (index) => {
  const statusMap = {
    1: "Good",
    2: "Normal",
    3: "Unhealthy for Sensitive Groups",
    4: "Not Healthy",
    5: "Very Unhealthy",
    6: "Hazardous"
  };
  return statusMap[index] || "Not Known";
};

exports.getHourlyForecast = (forecastData) => {
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
    waktu: targetTime.toISOString(),
    suhu: closestData.main.temp,
    deskripsi: closestData.weather[0].description,
    ikon: closestData.weather[0].icon,
    humidity: closestData.main.humidity,
    wind_speed: closestData.wind.speed,
  });
}

  return hourlyData;
};

exports.getDailyForecast = (forecastData) => {
  const dailyDataMap = {};
  const today = new Date();

  forecastData.list.forEach( (item) => {
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

  return Object.values(dailyDataMap);
};