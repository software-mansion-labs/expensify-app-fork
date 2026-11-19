/**
 * The database of the mock backend. It lives in memory and is mirrored to Onyx so that the server state survives a reload,
 * the same way a real server keeps its state between visits.
 */
/* eslint-disable rulesdir/prefer-actions-set-data -- The mock server mirrors its state into Onyx the way a server response would */
/* eslint-disable no-param-reassign -- The mock server keeps its database in memory and the handlers change it in place */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import type {MockServerDatabase, RequestLogEntry} from './types';

const MAX_REQUEST_LOG_LENGTH = 30;

function buildSeedDatabase(): MockServerDatabase {
    const {ADMIN, USER} = SBO_CONST.WORKSPACE_ROLE;
    return {
        user: {validated: true},
        workspaces: {
            usd: {id: 'usd', name: 'Acme US', outputCurrency: SBO_CONST.CURRENCY.USD, role: ADMIN},
            eur: {id: 'eur', name: 'Acme Europe', outputCurrency: SBO_CONST.CURRENCY.EUR, role: ADMIN},
            aud: {id: 'aud', name: 'Acme Australia', outputCurrency: SBO_CONST.CURRENCY.AUD, role: ADMIN},
            jpy: {id: 'jpy', name: 'Acme Japan (unsupported currency)', outputCurrency: 'JPY', role: ADMIN},
            guest: {id: 'guest', name: 'Acme Guest (you are not an admin)', outputCurrency: SBO_CONST.CURRENCY.USD, role: USER},
        },
        bankAccounts: {},
        lastBankAccountID: 1000,
        settings: {
            latencyMs: SBO_CONST.MOCK.DEFAULT_LATENCY_MS,
            failureMode: SBO_CONST.MOCK.FAILURE_MODE.NONE,
            isThrottled: false,
            shouldRequireKYBDocuments: false,
        },
        requestLog: [],
    };
}

let database = buildSeedDatabase();
let hasHydrated = false;
let markHydrated: () => void = () => {};
const hydration = new Promise<void>((resolve) => {
    markHydrated = resolve;
});

// The mock backend plays the server, so it runs outside React and cannot read this key with useOnyx.
Onyx.connectWithoutView({
    key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_MOCK_SERVER,
    callback: (value) => {
        // After the first read the memory copy is the source of truth. A missing value means Onyx was cleared, so the server starts over.
        if (!hasHydrated || !value) {
            database = value ?? buildSeedDatabase();
        }
        hasHydrated = true;
        markHydrated();
    },
});

function waitForDatabase(): Promise<void> {
    return hydration;
}

function getDatabase(): MockServerDatabase {
    return database;
}

/** Runs a change on a copy of the database, then commits the copy and mirrors it to Onyx */
function changeDatabase<TResult>(change: (draft: MockServerDatabase) => TResult): TResult {
    const draft = structuredClone(database);
    const result = change(draft);
    database = draft;
    Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_MOCK_SERVER, draft);
    return result;
}

function resetDatabase() {
    changeDatabase((draft) => {
        Object.assign(draft, buildSeedDatabase());
    });
}

function logRequest(entry: Omit<RequestLogEntry, 'id'>) {
    changeDatabase((draft) => {
        const lastID = draft.requestLog.at(0)?.id ?? CONST.DEFAULT_NUMBER_ID;
        draft.requestLog = [{...entry, id: lastID + 1}, ...draft.requestLog].slice(0, MAX_REQUEST_LOG_LENGTH);
    });
}

export {changeDatabase, getDatabase, logRequest, resetDatabase, waitForDatabase};
