import type {SqlBatchCommand, SqlDriver, SqlExecutor, SqlRow, SqlValue} from '@libs/SqlEngine/SqlDriver';

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

import type {VfsMode} from './protocol';

type Sqlite3 = Awaited<ReturnType<typeof sqlite3InitModule>>;
type SqliteDatabase = InstanceType<Sqlite3['oo1']['DB']>;

type WasmSqlEngine = {
    driver: SqlDriver;
    sqliteVersion: string;
    /** The VFS actually in use. It is `memory` when `opfs` was requested but is unavailable. */
    vfs: VfsMode;
};

const OPFS_POOL_NAME = 'onyx-sql-engine';
const OPFS_DB_FILE = '/onyx-sql-engine.sqlite3';

const COMMON_PRAGMAS = ['PRAGMA temp_store = MEMORY;', 'PRAGMA cache_size = -32000;', 'PRAGMA foreign_keys = OFF;'];

/** The OPFS SAH pool VFS does not support WAL, so a durable configuration means a DELETE journal. */
const VFS_PRAGMAS: Record<VfsMode, string[]> = {
    memory: ['PRAGMA journal_mode = MEMORY;', 'PRAGMA synchronous = OFF;'],
    opfs: ['PRAGMA journal_mode = DELETE;', 'PRAGMA synchronous = FULL;'],
};

function toSqlValue(value: unknown): SqlValue {
    if (typeof value === 'string' || typeof value === 'number' || value instanceof Uint8Array) {
        return value;
    }
    if (typeof value === 'bigint') {
        return Number(value);
    }
    return null;
}

function readRows(database: SqliteDatabase, sql: string, params: SqlValue[]): SqlRow[] {
    const statement = database.prepare(sql);
    const rows: SqlRow[] = [];
    try {
        if (params.length > 0) {
            statement.bind(params);
        }
        while (statement.step()) {
            const row: SqlRow = {};
            for (const [column, value] of Object.entries(statement.get({}))) {
                row[column] = toSqlValue(value);
            }
            rows.push(row);
        }
    } finally {
        statement.finalize();
    }
    return rows;
}

function runCommand(database: SqliteDatabase, command: SqlBatchCommand) {
    const statement = database.prepare(command.sql);
    try {
        for (const params of command.params ?? [[]]) {
            if (params.length > 0) {
                statement.bind(params);
            }
            statement.stepReset();
        }
    } finally {
        statement.finalize();
    }
}

function createExecutor(database: SqliteDatabase): SqlExecutor {
    return {
        execute: (sql, params) => Promise.resolve(readRows(database, sql, params ?? [])),
        executeBatch: (commands) => {
            for (const command of commands) {
                runCommand(database, command);
            }
            return Promise.resolve();
        },
    };
}

function createDriver(database: SqliteDatabase): SqlDriver {
    const executor = createExecutor(database);
    return {
        ...executor,
        transaction: async (work) => {
            database.exec('BEGIN IMMEDIATE;');
            try {
                const result = await work(executor);
                database.exec('COMMIT;');
                return result;
            } catch (error) {
                database.exec('ROLLBACK;');
                throw error;
            }
        },
    };
}

async function openDatabase(sqlite3: Sqlite3, vfs: VfsMode): Promise<{database: SqliteDatabase; vfs: VfsMode}> {
    if (vfs === 'memory') {
        return {database: new sqlite3.oo1.DB(':memory:', 'c'), vfs};
    }
    try {
        const pool = await sqlite3.installOpfsSAHPoolVfs({name: OPFS_POOL_NAME, clearOnInit: false, initialCapacity: 2});
        return {database: new pool.OpfsSAHPoolDb(OPFS_DB_FILE), vfs};
    } catch (error) {
        console.debug('[SqlEngine] OPFS is unavailable, falling back to the memory VFS', error);
        return {database: new sqlite3.oo1.DB(':memory:', 'c'), vfs: 'memory'};
    }
}

async function createWasmSqlEngine(requestedVfs: VfsMode): Promise<WasmSqlEngine> {
    const sqlite3 = await sqlite3InitModule();
    const {database, vfs} = await openDatabase(sqlite3, requestedVfs);
    for (const pragma of [...VFS_PRAGMAS[vfs], ...COMMON_PRAGMAS]) {
        database.exec(pragma);
    }
    return {driver: createDriver(database), sqliteVersion: sqlite3.version.libVersion, vfs};
}

export default createWasmSqlEngine;
export type {WasmSqlEngine};
