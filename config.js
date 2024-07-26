// config.js
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  mongo_url: process.env.MONGO_URL,
  tg_token: process.env.TG_TOKEN,
  jwtkey: process.env.JWT_KEY,
  port: process.env.PORT,
  base_url: process.env.BASE_URL,
  host_url: process.env.HOST_URL,
};
