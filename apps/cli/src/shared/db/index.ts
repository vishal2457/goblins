import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNodePostgres } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import * as schema from "./schema/index";
import { APP_SETTINGS } from "../app-settings";

const DRIZZLE_MIGRATIONS_TABLE = "__drizzle_migrations";
const MIGRATIONS_FOLDER_CANDIDATES = [
  path.resolve(__dirname, "drizzle"),
  path.resolve(process.cwd(), "src/shared/db/drizzle"),
];
type AppDb = ReturnType<typeof drizzleNodePostgres<typeof schema>>;

type NodePostgresConnection = {
  kind: "node-postgres";
  pool: Pool;
  db: AppDb;
};

type PgliteConnection = {
  kind: "pglite";
  client: PGlite;
  db: ReturnType<typeof drizzlePglite<typeof schema>>;
  lockFd: number | null;
  lockFile: string | null;
};

type DbConnection = NodePostgresConnection | PgliteConnection;
type EmbeddedMigrationRecorder = Pick<PGlite, "query">;

function createNodePostgresConnection(): NodePostgresConnection {
  const pool = new Pool({
    connectionString: APP_SETTINGS.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return {
    kind: "node-postgres",
    pool,
    db: drizzleNodePostgres({ client: pool, schema }),
  };
}

function createPgliteConnection(): PgliteConnection {
  const dataDir = path.resolve(
    process.cwd(),
    APP_SETTINGS.EMBEDDED_DATABASE_DIR,
  );
  mkdirSync(dataDir, { recursive: true });
  const { lockFd, lockFile } = acquireEmbeddedDatabaseLock(dataDir);
  const client = new PGlite(dataDir);

  return {
    kind: "pglite",
    client,
    db: drizzlePglite(client, { schema }),
    lockFd,
    lockFile,
  };
}

function processIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockPid(lockFile: string): number | null {
  try {
    const value = Number(readFileSync(lockFile, "utf8").trim());
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function acquireEmbeddedDatabaseLock(dataDir: string): {
  lockFd: number | null;
  lockFile: string | null;
} {
  if (APP_SETTINGS.NODE_ENV === "test") {
    return { lockFd: null, lockFile: null };
  }

  const lockFile = path.join(dataDir, ".goblins-pglite.lock");
  const existingPid = existsSync(lockFile) ? readLockPid(lockFile) : null;

  if (existingPid !== null && processIsRunning(existingPid)) {
    throw new Error(
      `Embedded database is already in use by process ${existingPid}. Stop the other Goblins API process before starting another one.`,
    );
  }

  if (existingPid !== null) {
    rmSync(lockFile, { force: true });
  }

  try {
    const lockFd = openSync(lockFile, "wx");
    writeFileSync(lockFd, String(process.pid));
    return { lockFd, lockFile };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") throw error;

    const pid = readLockPid(lockFile);
    throw new Error(
      `Embedded database is already in use${pid ? ` by process ${pid}` : ""}. Stop the other Goblins API process before starting another one.`,
    );
  }
}

const connection: DbConnection = APP_SETTINGS.USE_EMBEDDED_DATABASE
  ? createPgliteConnection()
  : createNodePostgresConnection();

let readyPromise: Promise<void> | null = null;

export const db = connection.db as AppDb;

async function listMigrationFiles(): Promise<
  Array<{ name: string; path: string }>
> {
  for (const migrationsFolder of MIGRATIONS_FOLDER_CANDIDATES) {
    try {
      const entries = await readdir(migrationsFolder, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
        .map((entry) => ({
          name: entry.name,
          path: path.join(migrationsFolder, entry.name),
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
  }

  throw new Error("No Drizzle migrations folder found for embedded database");
}

function splitMigrationStatements(content: string): string[] {
  return content
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function embeddedMigrationExists(
  client: PGlite,
  migration: { name: string; hash: string },
): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1
      FROM drizzle.${DRIZZLE_MIGRATIONS_TABLE}
      WHERE hash = $1 OR migration_name = $2
    ) AS exists`,
    [migration.hash, migration.name],
  );

  return result.rows[0]?.exists ?? false;
}

async function embeddedObjectExists(
  client: PGlite,
  query: string,
  params: unknown[],
): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(query, params);
  return result.rows[0]?.exists ?? false;
}

async function embeddedRelationExists(
  client: PGlite,
  relationName: string,
): Promise<boolean> {
  return embeddedObjectExists(
    client,
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [relationName],
  );
}

async function embeddedColumnExists(
  client: PGlite,
  relationName: string,
  columnName: string,
): Promise<boolean> {
  return embeddedObjectExists(
    client,
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) AS exists`,
    [relationName, columnName],
  );
}

async function embeddedMigrationAppearsApplied(
  client: PGlite,
  migrationName: string,
): Promise<boolean> {
  switch (migrationName) {
    case "0000_goblins_baseline.sql":
      return (
        (await embeddedRelationExists(client, "projects")) &&
        (await embeddedRelationExists(client, "tickets"))
      );
    default:
      return false;
  }
}

async function recordEmbeddedMigration(
  client: EmbeddedMigrationRecorder,
  migration: { name: string; hash: string },
): Promise<void> {
  await client.query(
    `INSERT INTO drizzle.${DRIZZLE_MIGRATIONS_TABLE} (
      hash,
      created_at,
      migration_name
    )
    VALUES ($1, $2, $3)`,
    [migration.hash, Date.now(), migration.name],
  );
}

async function applyEmbeddedMigrations(client: PGlite): Promise<void> {
  await client.exec("CREATE SCHEMA IF NOT EXISTS drizzle");
  await client.exec(
    `CREATE TABLE IF NOT EXISTS drizzle.${DRIZZLE_MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint,
      migration_name text
    )`,
  );
  await client.exec(
    `ALTER TABLE drizzle.${DRIZZLE_MIGRATIONS_TABLE}
     ADD COLUMN IF NOT EXISTS migration_name text`,
  );
  await client.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${DRIZZLE_MIGRATIONS_TABLE}_name_idx
     ON drizzle.${DRIZZLE_MIGRATIONS_TABLE} (migration_name)
     WHERE migration_name IS NOT NULL`,
  );

  const migrationFiles = await listMigrationFiles();
  for (const migrationFile of migrationFiles) {
    const content = await readFile(migrationFile.path, "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    const migration = { name: migrationFile.name, hash };
    if (await embeddedMigrationExists(client, migration)) continue;

    if (await embeddedMigrationAppearsApplied(client, migration.name)) {
      await recordEmbeddedMigration(client, migration);
      continue;
    }

    await client.transaction(async (tx) => {
      for (const statement of splitMigrationStatements(content)) {
        await tx.exec(statement);
      }

      await recordEmbeddedMigration(tx, migration);
    });
  }
}

async function ensureDBReady(): Promise<void> {
  if (connection.kind === "pglite") {
    await applyEmbeddedMigrations(connection.client);
  }
}

export const initializeDB = async (): Promise<void> => {
  readyPromise ??= ensureDBReady();
  await readyPromise;
};

export const checkDBConnection = async (): Promise<void> => {
  await initializeDB();
  await db.execute("select 1");
};

export const closeDB = async (): Promise<void> => {
  if (readyPromise) {
    await readyPromise.catch(() => undefined);
  }

  if (connection.kind === "node-postgres") {
    await connection.pool.end();
    return;
  }

  try {
    await connection.client.close();
  } finally {
    if (connection.lockFd !== null) {
      closeSync(connection.lockFd);
    }
    if (connection.lockFile !== null) {
      rmSync(connection.lockFile, { force: true });
    }
  }
};
