process.loadEnvFile();
import type { MigrationConfig } from "drizzle-orm/migrator";
export type APIConfig = {
  fileserverHits: number;
  platform: string
};

export type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};
export type AppConfig = {
  api: APIConfig;
  db: DBConfig;
  JWT_SECRET:string;
  POLKA_KEY:string;
};
const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
}; 

export const config: AppConfig = {
  api:{
  fileserverHits:0,
  platform: envOrThrow("PLATFORM") || "prod",
},

db:{
  url:envOrThrow("DB_URL"),
  migrationConfig,
}
,
JWT_SECRET:envOrThrow("JWT_SECRET"),
POLKA_KEY :envOrThrow("POLKA_KEY"),
} 
function envOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}



