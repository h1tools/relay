import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import chalk from "chalk";
import { isDev } from "./utils/consts";

const logDir = path.join(__dirname, "..", "logs");

const colors = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.cyan,
  http: chalk.gray,
  verbose: chalk.gray,
  debug: chalk.blue,
  silly: chalk.white,
};

// Console format with colors
const consoleFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message }) => {
    const coloredLevel =
      typeof colors[level as keyof typeof colors] === "function"
        ? colors[level as keyof typeof colors](
            level.toUpperCase().padEnd(isDev ? 7 : 5, " ")
          )
        : level.toUpperCase().padEnd(isDev ? 7 : 5, " ");

    return `${chalk.gray(timestamp)} ${chalk.gray(
      "["
    )}${coloredLevel}${chalk.gray("]:")} ${message}`;
  })
);

// File format without colors
const fileFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${(
      message as string
    ).replace(/\u001b\[[0-9;]*m/g, "")}`;
  })
);

// Daily rotate file transport with its own format
const dailyRotateTransport = new DailyRotateFile({
  dirname: logDir,
  filename: "app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  format: fileFormat, // <-- assign format here
});

const logger = createLogger({
  level: isDev ? "silly" : "info",
  transports: [
    new transports.Console({ format: consoleFormat }),
    dailyRotateTransport,
  ],
});

export default logger;
