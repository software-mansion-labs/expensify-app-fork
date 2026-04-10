// Ported from TanStack Query
// https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts
//
// Structural sharing: returns `a` (the previous value) whenever it is deeply
// equal to `b` (the next value), recursing into plain objects and arrays so
// that unchanged nested references are also preserved.  This keeps downstream
// useMemo / useCallback stable even when the data source produces new object
// identities for values that have not actually changed.
//
// Onyx extension: keys whose value is null/undefined in both `a` and `b` (or
// absent in one and null/undefined in the other) are treated as "phantom" keys
// and excluded from the size comparison.  Onyx's mergeDeep often stamps these
// tombstone entries onto objects during optimistic updates; ignoring them
// prevents spurious reference breaks when only those phantom keys differ.

type StableArrayConfig = {
    key: string;
    nested?: Record<string, StableArrayConfig>;
};

const hasOwn = (obj: Record<PropertyKey, unknown>, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(obj, key);

function isPlainArray(value: unknown): value is unknown[] {
    return Array.isArray(value) && value.length === Object.keys(value).length;
}

function hasObjectPrototype(o: unknown): boolean {
    return Object.prototype.toString.call(o) === '[object Object]';
}

function isPlainObject(o: unknown): o is Record<PropertyKey, unknown> {
    if (!hasObjectPrototype(o)) {
        return false;
    }
    const obj = o as Record<PropertyKey, unknown>;
    const ctor = obj.constructor;
    if (ctor === undefined) {
        return true;
    }
    const prot = (ctor as {prototype: unknown}).prototype;
    if (!hasObjectPrototype(prot)) {
        return false;
    }
    if (!hasOwn(prot as Record<PropertyKey, unknown>, 'isPrototypeOf')) {
        return false;
    }
    if (Object.getPrototypeOf(o) !== Object.prototype) {
        return false;
    }
    return true;
}

function replaceEqualDeep<T>(a: unknown, b: T, depth?: number, config?: StableArrayConfig): T;
function replaceEqualDeep(a: unknown, b: unknown, depth = 0, config?: StableArrayConfig): unknown {
    if (a === b) {
        return a;
    }

    if (depth > 500) {
        return b;
    }

    const array = isPlainArray(a) && isPlainArray(b);

    if (!array && !(isPlainObject(a) && isPlainObject(b))) {
        return b;
    }

    // Array matching by key field when config is provided
    if (array && config) {
        const aArray = a;
        const bArray = b;
        const keyField = config.key;

        // Build a map of b array items by their key
        const bMap = new Map<unknown, unknown>();
        for (const item of bArray) {
            if (isPlainObject(item)) {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                const itemKey = (item as Record<PropertyKey, unknown>)[keyField];
                bMap.set(itemKey, item);
            }
        }

        const copy: unknown[] = new Array(bArray.length);
        let equalItems = 0;

        for (let i = 0; i < bArray.length; i++) {
            const bItem = bArray.at(i);
            if (!isPlainObject(bItem)) {
                copy[i] = bItem;
                continue;
            }

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            const bItemKey = (bItem as Record<PropertyKey, unknown>)[keyField];
            let aItem: unknown;

            // Find matching item in a array by key
            for (const aArrayItem of aArray) {
                if (isPlainObject(aArrayItem)) {
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                    if ((aArrayItem as Record<PropertyKey, unknown>)[keyField] === bItemKey) {
                        aItem = aArrayItem;
                        break;
                    }
                }
            }

            if (aItem === undefined) {
                copy[i] = bItem;
                continue;
            }

            const nestedConfig = config.nested ? Object.values(config.nested).at(0) : undefined;
            const v = replaceEqualDeep(aItem, bItem, depth + 1, nestedConfig);
            copy[i] = v;
            if (v === aItem) {
                equalItems++;
            }
        }

        return equalItems === bArray.length ? a : copy;
    }

    const aItems = array ? a : Object.keys(a as Record<string, unknown>);
    const aSize = aItems.length;
    const bItems = array ? b : Object.keys(b as Record<string, unknown>);
    const bSize = bItems.length;
    const copy: Record<PropertyKey, unknown> | unknown[] = array ? new Array(bSize) : {};

    let equalItems = 0;
    // Counts keys in `b` whose null/undefined value is matched by null/undefined/absent in `a`.
    // These are Onyx tombstone keys that should not affect reference stability.
    let phantomBKeys = 0;

    for (let i = 0; i < bSize; i++) {
        const key: PropertyKey = array ? i : (bItems.at(i) as string);
        const aItem = (a as Record<PropertyKey, unknown>)[key];
        const bItem = (b as Record<PropertyKey, unknown>)[key];

        if (aItem === bItem) {
            (copy as Record<PropertyKey, unknown>)[key] = aItem;
            if (array ? i < aSize : hasOwn(a as Record<PropertyKey, unknown>, key)) {
                // Null/undefined keys present in both a and b are phantom keys.
                if (!array && (bItem === null || bItem === undefined)) {
                    phantomBKeys++;
                } else {
                    equalItems++;
                }
            }
            continue;
        }

        // b has null/undefined for this key and a also lacks a meaningful value:
        // treat as a phantom Onyx tombstone, not a real change.
        if (!array && (bItem === null || bItem === undefined) && (aItem === null || aItem === undefined || !hasOwn(a as Record<PropertyKey, unknown>, key))) {
            (copy as Record<PropertyKey, unknown>)[key] = bItem;
            phantomBKeys++;
            continue;
        }

        if (aItem === null || bItem === null || typeof aItem !== 'object' || typeof bItem !== 'object') {
            (copy as Record<PropertyKey, unknown>)[key] = bItem;
            continue;
        }

        const nestedConfig = !array && config ? config.nested?.[key as string] : undefined;
        const v = replaceEqualDeep(aItem, bItem, depth + 1, nestedConfig);
        (copy as Record<PropertyKey, unknown>)[key] = v;
        if (v === aItem) {
            equalItems++;
        }
    }

    // Count phantom keys in `a`: null/undefined keys whose counterpart in `b` is also null/undefined or absent.
    let phantomAKeys = 0;
    if (!array) {
        for (let i = 0; i < aSize; i++) {
            const key = aItems.at(i) as string;
            const aItem = (a as Record<PropertyKey, unknown>)[key];
            if (aItem === null || aItem === undefined) {
                const bItem = (b as Record<PropertyKey, unknown>)[key];
                if (!hasOwn(b as Record<PropertyKey, unknown>, key) || bItem === null || bItem === undefined) {
                    phantomAKeys++;
                }
            }
        }
    }

    const effectiveASize = aSize - phantomAKeys;
    const effectiveBSize = bSize - phantomBKeys;

    return effectiveASize === effectiveBSize && equalItems === effectiveASize ? a : copy;
}

export type {StableArrayConfig};
export default replaceEqualDeep;
