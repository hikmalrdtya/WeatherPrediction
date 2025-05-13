const express = require("express");
require("dotenv").config({ path: './backend/.env' });
const router = express.Router();

const {
  getWeatherByCity,
  searchCities,
  getWeatherMap,
  getMapConfig,
} = require("../handler/weatherHandler.js");

router.get("/weather/:city", getWeatherByCity);
router.get("/search/cities", searchCities);
router.get("/weather-map/:layer", getWeatherMap);
router.get("/map-config", getMapConfig);

module.exports = router;