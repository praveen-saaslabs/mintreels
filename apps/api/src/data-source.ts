import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '@mintreels/db';
import { migrations } from './migrations';

// Standalone DataSource for the CLI runner. migrationsRun stays false here;
// the CLI controls execution explicitly.
export const appDataSource = new DataSource({
  ...createDataSourceOptions(),
  migrations,
  migrationsRun: false,
});
