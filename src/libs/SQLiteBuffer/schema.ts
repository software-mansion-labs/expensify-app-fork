/**
 * Typed schema for the SQLite buffer — the single source of truth from which the table DDL and the
 * per-entity CRUD statements are generated.
 *
 * Every generated column is bound to a top-level field of the corresponding Onyx type: renaming or
 * retyping that field in `src/types/onyx` fails compilation here, instead of silently turning the
 * column into NULLs at runtime. Columns are deliberately limited to top-level fields (`keyof T`) —
 * deeper projections would need escaped json paths and recursive path types for no current benefit.
 * The FTS index and its triggers stay as raw DDL: they have no type-level source to derive from.
 */
// cspell:ignore lvac UNINDEXED
import type {PersonalDetails, Policy, Report, ReportAction, ReportAttributesDerivedValue, ReportNameValuePairs, Transaction, TransactionViolation} from '@src/types/onyx';

import type {BufferEntity} from './protocol';

type ReportAttributes = ReportAttributesDerivedValue['reports'][string];

type SQLiteColumnType = 'TEXT' | 'INTEGER';

/** SQLite column type a `json_extract` of a field with the given TS type is allowed to declare. */
type SQLiteTypeFor<TValue> = NonNullable<TValue> extends string ? 'TEXT' : NonNullable<TValue> extends number | boolean ? 'INTEGER' : never;

/**
 * One VIRTUAL generated column projecting a top-level field of the Onyx type T.
 * `presence: true` stores `json_extract(...) IS NOT NULL` (0/1) instead of the field's value.
 */
type GeneratedColumn<T> = {
    [K in keyof T & string]: {path: K; type: SQLiteTypeFor<T[K]>; presence?: false} | {path: K; type: 'INTEGER'; presence: true};
}[keyof T & string];

/** TS type of a generated column read back from SQLite (NULL when the source field is absent). */
type ColumnValue<TColumn extends {type: SQLiteColumnType}> = (TColumn['type'] extends 'TEXT' ? string : number) | null;

/** Row shape produced by SELECTing a set of generated columns. */
type RowOf<TColumns extends Record<string, {type: SQLiteColumnType}>> = {[K in keyof TColumns]: ColumnValue<TColumns[K]>};

const REPORT_COLUMNS = {
    lastVisibleActionCreated: {path: 'lastVisibleActionCreated', type: 'TEXT'},
    isPinned: {path: 'isPinned', type: 'INTEGER'},
    reportType: {path: 'type', type: 'TEXT'},
} as const satisfies Record<string, GeneratedColumn<Report>>;

const REPORT_ACTION_COLUMNS = {
    created: {path: 'created', type: 'TEXT'},
} as const satisfies Record<string, GeneratedColumn<ReportAction>>;

const TRANSACTION_COLUMNS = {
    reportID: {path: 'reportID', type: 'TEXT'},
} as const satisfies Record<string, GeneratedColumn<Transaction>>;

const REPORT_ATTRIBUTE_COLUMNS = {
    reportName: {path: 'reportName', type: 'TEXT'},
    requiresAttention: {path: 'requiresAttention', type: 'INTEGER'},
} as const satisfies Record<string, GeneratedColumn<ReportAttributes>>;

const RNVP_COLUMNS = {
    isArchived: {path: 'private_isArchived', type: 'INTEGER', presence: true},
} as const satisfies Record<string, GeneratedColumn<ReportNameValuePairs>>;

const POLICY_COLUMNS = {
    policyName: {path: 'name', type: 'TEXT'},
    policyType: {path: 'type', type: 'TEXT'},
} as const satisfies Record<string, GeneratedColumn<Policy>>;

// personalDetailsList is a single Onyx key holding {accountID: PersonalDetails}; the mirror explodes
// it into one row per account so contacts are queryable/searchable (the OptionsListUtils enabler).
const PERSONAL_DETAILS_COLUMNS = {
    login: {path: 'login', type: 'TEXT'},
    displayName: {path: 'displayName', type: 'TEXT'},
} as const satisfies Record<string, GeneratedColumn<PersonalDetails>>;

/** Rows of the generated report columns, as returned by the LHN queries. */
type ReportGeneratedRow = RowOf<typeof REPORT_COLUMNS>;

type TableSpec = {
    name: string;
    /** Physical column DDL, verbatim (ids, the JSON blob, JS-populated columns). */
    base: readonly string[];
    generated: Readonly<Record<string, {path: string; type: SQLiteColumnType; presence?: boolean}>>;
    /** Table-level constraint DDL (e.g. a composite primary key), verbatim. */
    constraint?: string;
    indexes?: ReadonlyArray<{name: string; on: string}>;
};

const TABLES: readonly TableSpec[] = [
    {
        name: 'reports',
        base: ['id TEXT PRIMARY KEY', 'data TEXT NOT NULL'],
        generated: REPORT_COLUMNS,
        indexes: [{name: 'idx_reports_lvac', on: 'lastVisibleActionCreated DESC'}],
    },
    {
        name: 'report_actions',
        base: ['reportID TEXT NOT NULL', 'actionID TEXT NOT NULL', 'data TEXT NOT NULL'],
        generated: REPORT_ACTION_COLUMNS,
        constraint: 'PRIMARY KEY (reportID, actionID)',
        indexes: [{name: 'idx_actions_report_created', on: 'reportID, created DESC'}],
    },
    {
        name: 'transactions',
        base: ['id TEXT PRIMARY KEY', 'data TEXT NOT NULL'],
        generated: TRANSACTION_COLUMNS,
        indexes: [{name: 'idx_transactions_report', on: 'reportID'}],
    },
    {
        name: 'report_attributes',
        base: ['id TEXT PRIMARY KEY', 'data TEXT NOT NULL', 'hasErrors INTEGER NOT NULL DEFAULT 0'],
        generated: REPORT_ATTRIBUTE_COLUMNS,
    },
    {
        name: 'drafts',
        base: ['id TEXT PRIMARY KEY', 'hasDraft INTEGER NOT NULL'],
        generated: {},
    },
    {
        name: 'rnvp',
        base: ['id TEXT PRIMARY KEY', 'data TEXT NOT NULL'],
        generated: RNVP_COLUMNS,
    },
    {
        name: 'policies',
        base: ['id TEXT PRIMARY KEY', 'data TEXT NOT NULL'],
        generated: POLICY_COLUMNS,
    },
    {
        name: 'personal_details',
        base: ['id TEXT PRIMARY KEY', 'data TEXT NOT NULL'],
        generated: PERSONAL_DETAILS_COLUMNS,
        indexes: [{name: 'idx_personal_details_login', on: 'login'}],
    },
    {
        // transactionViolations is an array (TransactionViolation[]), so it has no top-level fields to
        // project — store the blob plus a JS-computed hasViolations flag for cheap RBR filtering.
        name: 'transaction_violations',
        base: ['id TEXT PRIMARY KEY', 'data TEXT NOT NULL', 'hasViolations INTEGER NOT NULL DEFAULT 0'],
        generated: {},
        indexes: [{name: 'idx_txn_violations_has', on: 'hasViolations'}],
    },
];

function generatedColumnDDL(name: string, column: {path: string; type: SQLiteColumnType; presence?: boolean}): string {
    const extract = `json_extract(data, '$.${column.path}')`;
    return `${name} ${column.type} GENERATED ALWAYS AS (${column.presence ? `${extract} IS NOT NULL` : extract}) VIRTUAL`;
}

function buildTablesDDL(): string {
    return TABLES.map((table) => {
        const columns = [...table.base, ...Object.entries(table.generated).map(([name, column]) => generatedColumnDDL(name, column)), ...(table.constraint ? [table.constraint] : [])];
        const indexes = (table.indexes ?? []).map((index) => `CREATE INDEX IF NOT EXISTS ${index.name} ON ${table.name} (${index.on});`);
        return [`CREATE TABLE IF NOT EXISTS ${table.name} (\n    ${columns.join(',\n    ')}\n);`, ...indexes].join('\n');
    }).join('\n');
}

// No type-level source to derive full-text search from: which fields are searchable is a product
// decision, and the triggers reference a nested array path ('$.message[0].text') that the
// top-level-only column specs deliberately don't model.
const FTS_DDL = `
CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(
    text,
    kind UNINDEXED,
    reportID UNINDEXED,
    actionID UNINDEXED,
    tokenize = 'unicode61 remove_diacritics 2'
);
CREATE TRIGGER IF NOT EXISTS fts_actions_ai AFTER INSERT ON report_actions BEGIN
    INSERT INTO fts (text, kind, reportID, actionID)
    SELECT json_extract(new.data, '$.message[0].text'), 'msg', new.reportID, new.actionID
    WHERE json_extract(new.data, '$.message[0].text') IS NOT NULL;
END;
CREATE TRIGGER IF NOT EXISTS fts_actions_ad AFTER DELETE ON report_actions BEGIN
    DELETE FROM fts WHERE kind = 'msg' AND actionID = old.actionID;
END;
CREATE TRIGGER IF NOT EXISTS fts_attrs_ai AFTER INSERT ON report_attributes BEGIN
    INSERT INTO fts (text, kind, reportID)
    SELECT json_extract(new.data, '$.reportName'), 'report', new.id
    WHERE json_extract(new.data, '$.reportName') IS NOT NULL;
END;
CREATE TRIGGER IF NOT EXISTS fts_attrs_ad AFTER DELETE ON report_attributes BEGIN
    DELETE FROM fts WHERE kind = 'report' AND reportID = old.id;
END;
CREATE TRIGGER IF NOT EXISTS fts_contacts_ai AFTER INSERT ON personal_details BEGIN
    INSERT INTO fts (text, kind, reportID)
    SELECT trim(coalesce(json_extract(new.data, '$.displayName'), '') || ' ' || coalesce(json_extract(new.data, '$.login'), '')), 'contact', new.id
    WHERE coalesce(json_extract(new.data, '$.displayName'), json_extract(new.data, '$.login')) IS NOT NULL;
END;
CREATE TRIGGER IF NOT EXISTS fts_contacts_ad AFTER DELETE ON personal_details BEGIN
    DELETE FROM fts WHERE kind = 'contact' AND reportID = old.id;
END;
`;

const SCHEMA = `${buildTablesDDL()}\n${FTS_DDL}`;

type BlobEntitySpec = {
    entity: BufferEntity;
    table: string;
    /** Physical columns whose values are computed in JS from the incoming value at write time. */
    extra?: {
        columns: readonly string[];
        values: (value: unknown) => ReadonlyArray<string | number>;
    };
};

/**
 * Entities stored as one JSON blob row per collection member — their CRUD is fully generated.
 * `draft` (a presence-only table) and `reportActions` (one row per action, replaced per report)
 * have bespoke shapes and keep hand-written handling in the worker.
 */
const BLOB_ENTITIES: readonly BlobEntitySpec[] = [
    {entity: 'report', table: 'reports'},
    {entity: 'transaction', table: 'transactions'},
    {entity: 'rnvp', table: 'rnvp'},
    {entity: 'policy', table: 'policies'},
    {entity: 'personalDetails', table: 'personal_details'},
    {
        entity: 'reportAttributes',
        table: 'report_attributes',
        extra: {
            columns: ['hasErrors'],
            // The mirror forwards post-merge values of the derived reportAttributes key verbatim.
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            values: (value: unknown) => [Object.keys((value as ReportAttributes).reportErrors ?? {}).length > 0 ? 1 : 0],
        },
    },
    {
        entity: 'transactionViolations',
        table: 'transaction_violations',
        extra: {
            columns: ['hasViolations'],
            // transactionViolations is an array; flag rows that carry any violation for cheap RBR filters.
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            values: (value: unknown) => [Array.isArray(value) && (value as TransactionViolation[]).length > 0 ? 1 : 0],
        },
    },
];

type BlobStatements = {
    upsert: string;
    remove: string;
    /** Values for the extra physical columns, bound after (id, data). */
    extraValues?: (value: unknown) => ReadonlyArray<string | number>;
};

const BLOB_STATEMENTS: Partial<Record<BufferEntity, BlobStatements>> = Object.fromEntries(
    BLOB_ENTITIES.map((spec) => {
        const columns = ['id', 'data', ...(spec.extra?.columns ?? [])];
        return [
            spec.entity,
            {
                upsert: `INSERT OR REPLACE INTO ${spec.table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
                remove: `DELETE FROM ${spec.table} WHERE id = ?`,
                extraValues: spec.extra?.values,
            },
        ];
    }),
);

const TABLE_BY_ENTITY = {
    report: 'reports',
    reportActions: 'report_actions',
    transaction: 'transactions',
    reportAttributes: 'report_attributes',
    draft: 'drafts',
    rnvp: 'rnvp',
    policy: 'policies',
    personalDetails: 'personal_details',
    transactionViolations: 'transaction_violations',
} as const satisfies Record<BufferEntity, string>;

const ID_COLUMN_BY_ENTITY = {
    report: 'id',
    reportActions: 'reportID',
    transaction: 'id',
    reportAttributes: 'id',
    draft: 'id',
    rnvp: 'id',
    policy: 'id',
    personalDetails: 'id',
    transactionViolations: 'id',
} as const satisfies Record<BufferEntity, string>;

export {SCHEMA, BLOB_STATEMENTS, TABLE_BY_ENTITY, ID_COLUMN_BY_ENTITY, REPORT_COLUMNS};
export type {ReportAttributes, ReportGeneratedRow};
