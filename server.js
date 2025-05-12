const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET');
	next();
});

app.get('/', (req, res) => {
	res.send('Welcome to Backend Weather Prediction');
});

app.get('/weather/:city', async (req, res) => {
	const city = req.params.city;
	const openWeatherKey = process.env.OPENWEATHERMAP_API_KEY;
	const weatherApiKey = process.env.WEATHERAPI_KEY;

	if (!openWeatherKey || !weatherApiKey) {
		return res.status(500).json({ error: 'API key tidak ditemukan. Cek file .env' });
	}

	try {
		const currentWeatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${openWeatherKey}&units=metric`);
		if (!currentWeatherResponse.ok) {
			const errorData = await currentWeatherResponse.json();
			return res.status(currentWeatherResponse.status).json({ error: errorData.message || 'Gagal mengambil data cuaca saat ini' });
		}
		const currentWeatherData = await currentWeatherResponse.json();

		const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${openWeatherKey}&units=metric`);
		if (!forecastResponse.ok) {
			const errorData = await forecastResponse.json();
			return res.status(forecastResponse.status).json({ error: errorData.message || 'Gagal mengambil data prakiraan cuaca' });
		}
		const forecastData = await forecastResponse.json();

		const weatherApiResponse = await fetch(`http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${city}&aqi=yes`);
		if (!weatherApiResponse.ok) {
			const errorData = await weatherApiResponse.json();
			return res.status(weatherApiResponse.status).json({ error: errorData.message || 'Gagal mengambil data dari WeatherAPI' });
		}
		const weatherApiData = await weatherApiResponse.json();
		const uvIndex = weatherApiData.current.uv;
		const airQuality = weatherApiData.current.air_quality;
		const epaIndex = airQuality["us-epa-index"];
		let airStatus = "Tidak diketahui";

		switch (epaIndex) {
			case 1: airStatus = "Baik"; break;
			case 2: airStatus = "Sedang"; break;
			case 3: airStatus = "Tidak sehat bagi kelompok sensitif"; break;
			case 4: airStatus = "Tidak sehat"; break;
			case 5: airStatus = "Sangat tidak sehat"; break;
			case 6: airStatus = "Berbahaya"; break;
		}

		const now = new Date();
		const hourlyData = [];
		for (let i = 1; i < 8; i++) {
			const targetTime = new Date(now.getTime() + i * 60 * 60 * 1000);
			let closestData = forecastData.list.reduce((prev, curr) => {
				const prevDiff = Math.abs(new Date(prev.dt * 1000) - targetTime);
				const currDiff = Math.abs(new Date(curr.dt * 1000) - targetTime);
				return prevDiff < currDiff ? prev : curr;
			});
			hourlyData.push({
				waktu: targetTime.toLocaleString(),
				suhu: closestData.main.temp,
				deskripsi: closestData.weather[0].description,
				ikon: closestData.weather[0].icon
			});
		}

		const dailyDataMap = {};
		const today = new Date();

		forecastData.list.forEach(item => {
			const dateKey = new Date(item.dt * 1000).toISOString().split('T')[0];
			const diffDay = Math.ceil(Math.abs(new Date(dateKey) - today) / (1000 * 60 * 60 * 24));

			if (diffDay < 7) {
				if (!dailyDataMap[dateKey]) {
					dailyDataMap[dateKey] = {
						date: dateKey,
						minTemp: item.main.temp_min,
						maxTemp: item.main.temp_max,
						deskripsi: item.weather[0].description,
						ikon: item.weather[0].icon
					};
				} else {
					dailyDataMap[dateKey].minTemp = Math.min(dailyDataMap[dateKey].minTemp, item.main.temp_min);
					dailyDataMap[dateKey].maxTemp = Math.max(dailyDataMap[dateKey].maxTemp, item.main.temp_max);
				}
			}
		});

		const dailyForecastArray = Object.values(dailyDataMap);
		const maxAvailableDay = 5;

		for (let i = dailyForecastArray.length; i < 7; i++) {
			const nextDay = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
			const nextDayFormatted = nextDay.toISOString().split('T')[0];

			const closestData = forecastData.list.find(item => {
				const itemDate = new Date(item.dt * 1000).toISOString().split('T')[0];
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
				ikon: closestData.weather[0].icon
			});
		}

		const responseData = {
			current: {
				humidity: currentWeatherData.main.humidity,
				wind_speed: currentWeatherData.wind.speed,
				uv: uvIndex,
				pressure: currentWeatherData.main.pressure,
				sunrise: new Date(currentWeatherData.sys.sunrise * 1000).toLocaleTimeString(),
				sunset: new Date(currentWeatherData.sys.sunset * 1000).toLocaleTimeString(),
				air_condition: {
					index: epaIndex,
					status: airStatus,
					co: airQuality.co,
					ozone: airQuality.o3,
					sulfur: airQuality.so2
				}
			},
			hourly: hourlyData,
			daily: dailyForecastArray
		};

		res.json(responseData);

	} catch (error) {
		res.status(500).json({ error: error.message || 'Terjadi kesalahan server' });
	}
});

app.listen(port, () => {
	console.log(`Server berjalan di http://localhost:${port}`);
});
