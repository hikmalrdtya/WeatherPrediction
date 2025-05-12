let currentCity = 'Jakarta'; // Default city

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Initialize theme
    initTheme();

    // Initialize weather map
    if (document.getElementById("weather-map")) {
      window.weatherMap = await initializeWeatherMap();
    }

    // Setup search functionality
    setupSearch();

    // Load default city
    getWeatherData("Jakarta");
  } catch (error) {
    console.error("Initialization error:", error);
    alert("Terjadi kesalahan saat menginisialisasi aplikasi");
  }
});

function setupSearch() {
  const searchInputs = document.querySelectorAll(".search-input");
  const searchButtons = document.querySelectorAll(".search-input + button");

  searchInputs.forEach((input) => {
        // Handle Enter key press
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                const query = input.value.trim();
                if (query) {
                    getWeatherData(query);
                } else {
                    showCustomAlert("Please enter a city name");
                }
                // Hide suggestions
                const suggestionsBox = input.parentElement.querySelector(".suggestions-box");
                if (suggestionsBox) {
                    suggestionsBox.remove();
                }
            }
        });

    // Add autocomplete functionality
    input.addEventListener(
      "input",
      debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
          try {
            const response = await fetch(
              `http://localhost:3000/search/cities?q=${encodeURIComponent(
                query
              )}`
            );
            if (!response.ok) {
              throw new Error("Failed to fetch suggestions");
            }
            const cities = await response.json();
            showSuggestions(cities, input);
          } catch (error) {
            console.error("Error fetching city suggestions:", error);
          }
        } else {
          // Remove suggestions if query is too short
          const suggestionsBox =
            input.parentElement.querySelector(".suggestions-box");
          if (suggestionsBox) {
            suggestionsBox.remove();
          }
        }
      }, 300)
    );

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target)) {
        const suggestionsBox =
          input.parentElement.querySelector(".suggestions-box");
        if (suggestionsBox) {
          suggestionsBox.remove();
        }
      }
    });
  });

  // Add click handler for search buttons
  searchButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const input = button.previousElementSibling;
            const query = input.value.trim();
            if (query) {
                getWeatherData(query);
            } else {
                showCustomAlert("Please enter a city name");
            }
            // Hide suggestions
            const suggestionsBox = input.parentElement.querySelector(".suggestions-box");
            if (suggestionsBox) {
                suggestionsBox.remove();
            }
        });
    });
}

// Add suggestion box functionality
function showSuggestions(cities, input) {
  // Remove existing suggestion box if any
  const existingSuggestions =
    input.parentElement.querySelector(".suggestions-box");
  if (existingSuggestions) {
    existingSuggestions.remove();
  }

  if (!cities.length) return;

  const suggestionsBox = document.createElement("div");
  suggestionsBox.className =
    "suggestions-box absolute w-full bg-white dark:bg-gray-800 mt-1 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto";

  cities.forEach((city) => {
    const suggestion = document.createElement("div");
    suggestion.className =
      "p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer";

    // Format city name with state/country
    const cityDisplay = city.state
      ? `${city.name}, ${city.state}, ${city.country}`
      : `${city.name}, ${city.country}`;

    suggestion.textContent = cityDisplay;

    suggestion.addEventListener("click", () => {
      input.value = cityDisplay;
      getWeatherData(city.name);
      suggestionsBox.remove();
    });
    suggestionsBox.appendChild(suggestion);
  });

  input.parentElement.appendChild(suggestionsBox);
}

// Debounce helper function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function initializeWeatherMap(lat = -6.2088, lon = 106.8456) {
  try {
    // Get API key from server
    const response = await fetch("/map-config");
    const config = await response.json();

    if (!config.apiKey) {
      throw new Error("API key tidak tersedia");
    }

    const mapContainer = document.getElementById("weather-map");
    if (!mapContainer) return null;

    // Set fixed height for map container
    mapContainer.style.height = "400px";

    // Initialize the map
    const map = L.map("weather-map").setView([lat, lon], 10);

    // Add OpenStreetMap base layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Initialize weather layer variable
    let weatherLayer = null;

    // Function to change weather layer
    function changeWeatherLayer(layerType) {
      if (weatherLayer) {
        map.removeLayer(weatherLayer);
      }

      const layerConfigs = {
        temp: "temp_new",
        clouds: "clouds_new",
        precipitation: "precipitation_new",
        wind: "wind_new",
      };

      weatherLayer = L.tileLayer(
        `https://tile.openweathermap.org/map/${layerConfigs[layerType]}/{z}/{x}/{y}.png?appid=${config.apiKey}`,
        {
          attribution: "© OpenWeatherMap",
          opacity: 0.6,
        }
      ).addTo(map);
    }

    // Add click handlers for layer buttons
    document.querySelectorAll(".map-layer-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".map-layer-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        changeWeatherLayer(btn.dataset.layer);
      });
    });

    // Initialize with temperature layer
    changeWeatherLayer("temp");

    // Return the map instance directly
    return map;
  } catch (error) {
    console.error("Error initializing weather map:", error);
    alert("Gagal memuat peta cuaca");
    return null;
  }
}

function getUVIndexInfo(uvValue) {
  const uvNum = Number(uvValue);
  if (uvNum <= 2) return { level: "Rendah", color: "text-green-500" };
  if (uvNum <= 5) return { level: "Sedang", color: "text-yellow-500" };
  if (uvNum <= 7) return { level: "Tinggi", color: "text-orange-500" };
  if (uvNum <= 10) return { level: "Sangat Tinggi", color: "text-red-500" };
  return { level: "Ekstrim", color: "text-purple-500" };
}

function getMoonPhaseEmoji(phase) {
  const phases = {
    "New Moon": "🌑",
    "Waxing Crescent": "🌒",
    "First Quarter": "🌓",
    "Waxing Gibbous": "🌔",
    "Full Moon": "🌕",
    "Waning Gibbous": "🌖",
    "Last Quarter": "🌗",
    "Waning Crescent": "🌘",
  };
  return phases[phase] || "🌑";
}

async function getWeatherData(city) {
  try {
    // Show loading state
    document.querySelector("[data-city]").textContent = "Loading...";

    const response = await fetch(
      `http://localhost:3000/weather/${encodeURIComponent(city)}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch weather data");
    }

    // Update current city if request was successful
    currentCity = city;

    // Update current weather
    document.querySelector("[data-city]").textContent = city;
    document.querySelector(
      "[data-humidity]"
    ).textContent = `${data.current.humidity}%`;
    document.querySelector(
      "[data-wind-speed]"
    ).textContent = `${data.current.wind_speed} km/h`;
    document.querySelector(
      "[data-pressure]"
    ).textContent = `${data.current.pressure} hPa`;
    document.querySelector("[data-sunrise]").textContent = data.current.sunrise;
    document.querySelector("[data-sunset]").textContent = data.current.sunset;

    // Update UV Index with color coding
    const uvElement = document.querySelector("[data-uv]");
    const uvLevelElement = document.querySelector("[data-uv-level]");

    if (uvElement && data.current.uv !== undefined) {
      const uvValue = Number(data.current.uv).toFixed(1);
      const { level, color } = getUVIndexInfo(uvValue);

      // Remove existing color classes
      uvElement.classList.remove(
        "text-green-500",
        "text-yellow-500",
        "text-orange-500",
        "text-red-500",
        "text-purple-500"
      );

      // Add new color and update text
      uvElement.classList.add(color);
      uvElement.textContent = uvValue;

      if (uvLevelElement) {
        uvLevelElement.textContent = level;
      }
    }

    // Update the astronomy section
    if (data.astronomy && data.astronomy.moon_phase) {
      const moonPhaseElement = document.querySelector("[data-moon-phase]");
      const moonIlluminationElement = document.querySelector(
        "[data-moon-illumination]"
      );
      const moonEmojiElement = document.querySelector("[data-moon-emoji]");

      if (moonPhaseElement) {
        moonPhaseElement.textContent = data.astronomy.moon_phase;
      }
      if (moonIlluminationElement) {
        moonIlluminationElement.textContent = `Illumination: ${data.astronomy.moon_illumination}%`;
      }
      if (moonEmojiElement) {
        moonEmojiElement.textContent = getMoonPhaseEmoji(
          data.astronomy.moon_phase
        );
      }
    } else {
      // Handle missing astronomy data
      const elements = [
        document.querySelector("[data-moon-phase]"),
        document.querySelector("[data-moon-illumination]"),
        document.querySelector("[data-moon-emoji]"),
      ];

      elements.forEach((el) => {
        if (el) el.textContent = "--";
      });
    }

    // Update air quality
    if (data.current.air_condition) {
      document.querySelector(
        "[data-aqi-co]"
      ).textContent = `${data.current.air_condition.co.toFixed(2)} µg/m³`;
      document.querySelector(
        "[data-aqi-ozone]"
      ).textContent = `${data.current.air_condition.ozone.toFixed(2)} µg/m³`;
      document.querySelector(
        "[data-aqi-sulfur]"
      ).textContent = `${data.current.air_condition.sulfur.toFixed(2)} µg/m³`;
    }

    // Update map if coordinates are available and map is initialized
    if (data.coord && window.weatherMap) {
      const { lat, lon } = data.coord;
      window.weatherMap.setView([lat, lon], 10);
    }

    // Update hourly and daily forecasts
    updateHourlyForecast(data.hourly);
    updateDailyForecast(data.daily);

  } catch (error) {
    console.error("Error fetching weather data:", error);
    
    // Show error alert
    showCustomAlert(`Kota "${city}" tidak ditemukan. Kembali ke kota sebelumnya.`);
    
    // Revert to previous city if we have one
    if (currentCity && currentCity !== city) {
      getWeatherData(currentCity);
    } else {
      // If no previous city, show error state
      document.querySelector("[data-city]").textContent = "Error loading data";
      document.querySelector("[data-humidity]").textContent = "--%";
      document.querySelector("[data-wind-speed]").textContent = "-- km/h";
      document.querySelector("[data-pressure]").textContent = "-- hPa";
      document.querySelector("[data-uv]").textContent = "--";
      document.querySelector("[data-sunrise]").textContent = "--:--";
      document.querySelector("[data-sunset]").textContent = "--:--";
    }

    // Clear search input
    document.querySelectorAll('.search-input').forEach(input => {
      input.value = currentCity || '';
    });
  }
}

function showCustomAlert(message) {
    const alertContainer = document.getElementById('weather-alert');
    alertContainer.innerHTML = `
        <div class="glass-card rounded-xl p-4 mb-8 bg-yellow-100 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800">
            <div class="flex items-center space-x-3">
                <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <div>
                    <h3 class="font-semibold text-yellow-800 dark:text-yellow-200">Weather Alert</h3>
                    <p class="text-sm text-yellow-700 dark:text-yellow-300">${message}</p>
                </div>
            </div>
        </div>
    `;
    alertContainer.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertContainer.classList.add('hidden');
    }, 5000);
}

function updateHourlyForecast(hourlyData) {
  const container = document.querySelector(".forecast-timeline");
  if (!container || !hourlyData) return;

  container.innerHTML = hourlyData
    .map((hour) => {
      const time = new Date(hour.waktu).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      return `
            <div class="glass-card rounded-lg p-4 min-w-[100px] text-center">
                <p class="text-sm text-gray-600 dark:text-gray-400">${time}</p>
                <div class="text-3xl my-2">
                    <img src="http://openweathermap.org/img/wn/${
                      hour.ikon
                    }@2x.png" 
                         alt="${hour.deskripsi}"
                         class="w-16 h-16 mx-auto">
                </div>
                <p class="font-semibold">${Math.round(hour.suhu)}°C</p>
                <p class="text-xs text-gray-500">${hour.deskripsi}</p>
            </div>
        `;
    })
    .join("");
}

// Add this helper function for weather icons
function getWeatherIcon(iconCode, description) {
  // Map OpenWeatherMap icon codes to custom HTML
  const iconMap = {
    "01d": "☀️", // clear sky day
    "01n": "🌙", // clear sky night
    "02d": "⛅", // few clouds day
    "02n": "☁️", // few clouds night
    "03d": "☁️", // scattered clouds
    "03n": "☁️", // scattered clouds
    "04d": "☁️", // broken clouds
    "04n": "☁️", // broken clouds
    "09d": "🌧️", // shower rain
    "09n": "🌧️", // shower rain
    "10d": "🌦️", // rain day
    "10n": "🌧️", // rain night
    "11d": "⛈️", // thunderstorm
    "11n": "⛈️", // thunderstorm
    "13d": "❄️", // snow
    "13n": "❄️", // snow
    "50d": "🌫️", // mist
    "50n": "🌫️", // mist
  };

  return `<span class="text-4xl">${iconMap[iconCode] || "❓"}</span>`;
}

function updateDailyForecast(dailyData) {
  const container = document.querySelector(
    ".grid.grid-cols-2.sm\\:grid-cols-3.md\\:grid-cols-4.lg\\:grid-cols-7"
  );
  if (!container || !dailyData) return;

  container.innerHTML = dailyData
    .map((day) => {
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString("id-ID", { weekday: "short" });

      return `
            <div class="glass-card rounded-lg p-4 text-center">
                <p class="font-semibold">${dayName}</p>
                <div class="text-3xl my-2">
                    <img src="http://openweathermap.org/img/wn/${
                      day.ikon
                    }@2x.png" 
                         alt="${day.deskripsi}"
                         class="w-16 h-16 mx-auto">
                </div>
                <div class="flex justify-center space-x-2">
                    <span class="font-semibold">${Math.round(
                      day.maxTemp
                    )}°</span>
                    <span class="text-gray-600 dark:text-gray-400">${Math.round(
                      day.minTemp
                    )}°</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">${
                  day.deskripsi
                }</p>
            </div>
        `;
    })
    .join("");
}

function initTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  const themeToggleMobile = document.getElementById("theme-toggle-mobile");

  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
  }

  themeToggle?.addEventListener("click", toggleTheme);
  themeToggleMobile?.addEventListener("click", toggleTheme);
}
