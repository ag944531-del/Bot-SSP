import winston from 'winston';
import { blue, green, red, yellow, gray, bold, cyan } from 'colorette';

const customFormat = winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
  let colorizedLevel = level.toUpperCase();
  switch (level) {
    case 'info':
      colorizedLevel = cyan(bold(`[INFO]`));
      break;
    case 'warn':
      colorizedLevel = yellow(bold(`[WARN]`));
      break;
    case 'error':
      colorizedLevel = red(bold(`[ERRO]`));
      break;
    case 'debug':
      colorizedLevel = gray(bold(`[DEBUG]`));
      break;
  }

  const time = gray(timestamp ? String(timestamp) : new Date().toISOString());
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  const errorStack = stack ? `\n${red(String(stack))}` : '';

  return `${time} ${colorizedLevel} ${message}${metaStr}${errorStack}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    customFormat
  ),
  transports: [
    new winston.transports.Console()
  ]
});
