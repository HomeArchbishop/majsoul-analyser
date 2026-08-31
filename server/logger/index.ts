import path from 'path'
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.File({
      filename: path.resolve(__dirname, '../../logs/server.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple(),
      ),
    }),
    // new winston.transports.Console({
    //   format: winston.format.combine(
    //     winston.format.colorize(),
    //     winston.format.timestamp(),
    //     winston.format.simple()
    //   )
    // })
  ],
})

export default logger
