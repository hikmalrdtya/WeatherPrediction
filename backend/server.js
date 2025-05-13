const express = require("express");
require("dotenv").config({ path: './backend/.env' });

const app = express();
const port = process.env.PORT || 3000;
const weatherRoutes = require("./routes/weatherRoutes.js");

app.use(express.static("public"));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  next();
});

app.use("/", weatherRoutes);

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});