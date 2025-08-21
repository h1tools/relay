import { readFileSync } from "fs";
import { join } from "path";

const packageJsonPath = join(__dirname, "..", "..", "package.json");
const packageJson = JSON.parse(
  readFileSync(packageJsonPath, { encoding: "utf-8" })
);
export const APP_VERSION: string = packageJson.version;

export const isDev =
  process.env.NODE_ENV === "development" || !!process.env.TS_NODE_DEV;
