import type {ReactElement} from 'react';

import {isValidElement} from 'react';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

function hasOwn(object: UnknownRecord, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(object, key);
}

/** True when both values are objects with the same own keys and identical (===) values. */
function shallowEqualObjects(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }
    if (!isRecord(a) || !isRecord(b)) {
        return false;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
        return false;
    }
    for (const key of keysA) {
        if (!hasOwn(b, key) || a[key] !== b[key]) {
            return false;
        }
    }
    return true;
}

/**
 * Structural equality for plain data (plain objects, arrays, primitives), bounded by depth.
 * Anything else (functions, elements, class instances such as shared values) is compared by identity.
 */
function deepEqualPlain(a: unknown, b: unknown, depth = 4): boolean {
    if (a === b) {
        return true;
    }
    if (depth <= 0 || !isRecord(a) || !isRecord(b)) {
        return false;
    }
    const isArrayA = isUnknownArray(a);
    if (isArrayA !== isUnknownArray(b)) {
        return false;
    }
    if (!isArrayA) {
        const protoA: unknown = Object.getPrototypeOf(a);
        if ((protoA !== Object.prototype && protoA !== null) || Object.getPrototypeOf(b) !== protoA) {
            return false;
        }
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
        return false;
    }
    for (const key of keysA) {
        if (!hasOwn(b, key) || !deepEqualPlain(a[key], b[key], depth - 1)) {
            return false;
        }
    }
    return true;
}

/** Style props may be functions of pressable state: those compare by identity, style data structurally. */
function styleEqual(a: unknown, b: unknown): boolean {
    if (typeof a === 'function' || typeof b === 'function') {
        return a === b;
    }
    return deepEqualPlain(a, b);
}

/**
 * Two elements with the same type, key and (structurally, to a bounded depth) equal props render the same output,
 * so the previous element can be handed to React again and its subtree bails out.
 */
function elementsEqual(a: ReactElement<UnknownRecord>, b: ReactElement<UnknownRecord>, depth = 3): boolean {
    if (a === b) {
        return true;
    }
    if (depth <= 0 || a.type !== b.type || a.key !== b.key) {
        return false;
    }
    const propsA = a.props;
    const propsB = b.props;
    const keysA = Object.keys(propsA);
    const keysB = Object.keys(propsB);
    if (keysA.length !== keysB.length) {
        return false;
    }
    for (const key of keysA) {
        if (!hasOwn(propsB, key)) {
            return false;
        }
        const valueA = propsA[key];
        const valueB = propsB[key];
        if (valueA === valueB) {
            continue;
        }
        if (key === 'children') {
            if (!childrenEqual(valueA, valueB, depth - 1)) {
                return false;
            }
            continue;
        }
        if (key === 'style') {
            if (!styleEqual(valueA, valueB)) {
                return false;
            }
            continue;
        }
        if (isValidElement<UnknownRecord>(valueA) && isValidElement<UnknownRecord>(valueB)) {
            if (!elementsEqual(valueA, valueB, depth - 1)) {
                return false;
            }
            continue;
        }
        return false;
    }
    return true;
}

/**
 * ReactNode equality: identical primitives, equal element trees (bounded depth) or arrays of those.
 * Functions and anything unrecognized compare by identity.
 */
function childrenEqual(a: unknown, b: unknown, depth = 3): boolean {
    if (a === b) {
        return true;
    }
    if (depth <= 0) {
        return false;
    }
    if (isUnknownArray(a) && isUnknownArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!childrenEqual(a.at(i), b.at(i), depth)) {
                return false;
            }
        }
        return true;
    }
    if (isValidElement<UnknownRecord>(a) && isValidElement<UnknownRecord>(b)) {
        return elementsEqual(a, b, depth);
    }
    return false;
}

export {shallowEqualObjects, deepEqualPlain, styleEqual, elementsEqual, childrenEqual};
