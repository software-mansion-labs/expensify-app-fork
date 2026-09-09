import type sqlite3InitModule from '@sqlite.org/sqlite-wasm';

/*
 * `@sqlite.org/sqlite-wasm` only ships ES modules, which Jest cannot `require`. Building the import
 * with `new Function` keeps it out of Babel's CommonJS transform, so Node loads the package for real
 * and the SQL engine tests run the same wasm build as the browser. `jest.config.js` maps the package
 * to this loader.
 */
/* eslint-disable @typescript-eslint/no-implied-eval -- the Function constructor is what hides the import from Babel. */
/* eslint-disable @typescript-eslint/no-unsafe-call -- the Function constructor and the loaded namespace are untyped. */
/* eslint-disable @typescript-eslint/no-unsafe-return -- the loaded initializer is untyped, its result is checked by the annotation. */
import path from 'path';

type InitOptions = Parameters<typeof sqlite3InitModule>[0];
type Sqlite3 = Awaited<ReturnType<typeof sqlite3InitModule>>;

const importModule = new Function('specifier', 'return import(specifier);');

const nodeEntry = path.join(path.dirname(require.resolve('@sqlite.org/sqlite-wasm/package.json')), 'node.mjs');

async function initSqlite3(options?: InitOptions): Promise<Sqlite3> {
    const loaded: unknown = await importModule(nodeEntry);
    if (typeof loaded !== 'object' || loaded === null || !('default' in loaded) || typeof loaded.default !== 'function') {
        throw new Error('The Node build of @sqlite.org/sqlite-wasm did not export an initializer');
    }
    return loaded.default(options);
}

export default initSqlite3;
