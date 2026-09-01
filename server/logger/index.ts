import path from 'path'
import winston from 'winston'

export default winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.File({
      filename: path.resolve(__dirname, '../../logs/server.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple(),
      ),
    }),
  ],
})
