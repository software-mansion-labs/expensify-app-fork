type SqlValue = string | number | null | Uint8Array;

type SqlRow = Record<string, SqlValue>;

/** One statement executed once per entry of `params`, or once when `params` is omitted. */
type SqlBatchCommand = {
    sql: string;
    params?: SqlValue[][];
};

type SqlExecutor = {
    execute(sql: string, params?: SqlValue[]): Promise<SqlRow[]>;
    executeBatch(commands: SqlBatchCommand[]): Promise<void>;
};

/** The only platform seam of the SQL engine. Trimmed to the statements this POC runs. */
type SqlDriver = SqlExecutor & {
    /** Runs `work` inside BEGIN IMMEDIATE and commits, or rolls back when `work` rejects. */
    transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
};

export type {SqlValue, SqlRow, SqlBatchCommand, SqlExecutor, SqlDriver};
