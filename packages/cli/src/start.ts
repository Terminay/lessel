import dotenv from 'dotenv';
dotenv.config();

import { run, BootstrapOptions } from '@lessel/core';

/**
 * "lessel start" — Starts the pipeline using the bootstrap auto-detection.
 * Supports zero-config startup from environment variables.
 */
export async function runStart(): Promise<void> {
  const options: BootstrapOptions = {
    allowAutoGenerate: true,
    port: parseInt(process.env.LESSEL_API_PORT || '3100', 10),
    configPath: process.env.LESSEL_CONFIG,
    dbPath: process.env.LESSEL_DB_PATH,
  };

  await run(options);
}