import winston from 'winston'
import path from 'path'

// Настройка форматов вывода
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Автоматически выводит стек ошибок
  winston.format.splat(),
  winston.format.json()
)

// Настройка формата для консоли (с цветами и понятным текстом)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}] ${level}: ${message} ${stack ? `\n${stack}` : ''}`
  })
)

// Определяем путь к папке с логами на сервере Ubuntu
// Логи будут создаваться в корне проекта в папке /logs
const logDir = path.join(process.cwd(), 'logs')

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    // 1. Запись всех ошибок в отдельный файл
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB, после чего файл архивируется
      maxFiles: 5,
    }),
    // 2. Запись общей оперативной информации в основной лог
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 7,
    }),
    // 3. Вывод в консоль сервера (Ubuntu/консоль разработки)
    new winston.transports.Console({
      format: consoleFormat
    })
  ],
})
