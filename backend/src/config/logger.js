const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: path.join('/app/logs', 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join('/app/logs', 'combined.log') }),
  ],
});

module.exports = logger;
