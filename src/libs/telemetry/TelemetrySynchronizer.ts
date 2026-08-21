import {deferUntilAppReady} from '@libs/deferUntilAppReady';
import {getActivePolicies} from '@libs/PolicyUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, Session, TryNewDot} from '@src/types/onyx';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

/**
 * This file contains the logic for sending additional data to Sentry.
 *
 * It uses Onyx.connectWithoutView as nothing here is related to the UI. We only send data to the external provider and want to keep this outside of the render loop.
 */
import * as Sentry from '@sentry/react-native';
import Onyx from 'react-native-onyx';
import OnyxCache from 'react-native-onyx/dist/OnyxCache';

import {cleanupCrashDiagnostics, initializeCrashDiagnostics} from './crashDiagnostics';
import {cleanupMemoryTracking, initializeMemoryTracking} from './sendMemoryContext';

/**
 * Connect to Onyx to retrieve information about the user's active policies.
 */
let session: OnyxEntry<Session>;
let activePolicyID: OnyxEntry<string>;
let policies: OnyxCollection<Policy>;
let tryNewDot: OnyxEntry<TryNewDot>;

Onyx.connectWithoutView({
    key: ONYXKEYS.NVP_ACTIVE_POLICY_ID,
    callback: (value) => {
        if (!value) {
            return;
        }
        activePolicyID = value;
        sendPoliciesContext();
    },
});

Onyx.connectWithoutView({
    key: ONYXKEYS.SESSION,
    callback: (value) => {
        if (!value?.email) {
            return;
        }
        session = value;
        sendPoliciesContext();
    },
});

// Lazy-Onyx POC (purity lane): a whole-collection POLICY subscription registered at module load
// would hydrate every policy during boot just to feed Sentry tags. Deferred until the app is
// interactive — session-level tags/context settle after the drain, like the reports-count tag below.
deferUntilAppReady(() => {
    Onyx.connectWithoutView({
        key: ONYXKEYS.COLLECTION.POLICY,
        callback: (value) => {
            if (!value) {
                return;
            }
            policies = value;
            sendPoliciesContext();
        },
    });
}, 'low');

// Lazy-Onyx POC: the reports count is derived from the key INDEX (always complete, no values
// needed) instead of a whole-collection subscription that would pin every report in RAM just to
// send an integer to Sentry. Sent once post-ready — good enough for a session-level tag.
deferUntilAppReady(() => {
    let reportsCount = 0;
    for (const key of OnyxCache.getAllKeys()) {
        // The `report_` prefix (trailing underscore included) cannot match reportActions_/reportDraft_/etc.
        if (key.startsWith(ONYXKEYS.COLLECTION.REPORT)) {
            reportsCount++;
        }
    }
    sendReportsCountTag(reportsCount);
}, 'low');

Onyx.connectWithoutView({
    key: ONYXKEYS.PERSONAL_DETAILS_LIST,
    callback: (value) => {
        if (!value) {
            return;
        }
        sendPersonalDetailsCountTag(Object.keys(value).length);
    },
});

Onyx.connectWithoutView({
    key: ONYXKEYS.NVP_TRY_NEW_DOT,
    callback: (value) => {
        tryNewDot = value;
        sendTryNewDotCohortTag();
    },
});

/**
 * Buckets policy count into cohorts for Sentry tagging
 */
function bucketPolicyCount(count: number): string {
    if (count <= 1) {
        return '0-1';
    }
    if (count <= 10) {
        return '2-10';
    }
    if (count <= 50) {
        return '11-50';
    }
    if (count <= 100) {
        return '51-100';
    }
    if (count <= 250) {
        return '101-250';
    }
    if (count <= 500) {
        return '251-500';
    }
    if (count <= 1000) {
        return '501-1000';
    }
    return '1000+';
}

/**
 * Buckets report count into cohorts for Sentry tagging
 */
function bucketReportCount(count: number): string {
    if (count <= 60) {
        return '0-60';
    }
    if (count <= 300) {
        return '61-300';
    }
    if (count <= 1000) {
        return '301-1000';
    }
    if (count <= 2500) {
        return '1001-2500';
    }
    if (count <= 5000) {
        return '2501-5000';
    }
    if (count <= 10000) {
        return '5001-10000';
    }
    return '10000+';
}

function sendPoliciesContext() {
    if (!policies || !session?.email || !activePolicyID) {
        return;
    }
    const activePolicies = getActivePolicies(policies, session.email).map((policy) => policy.id);

    let userRole: string = CONST.POLICY.ROLE.USER;
    for (const policy of Object.values(policies)) {
        if (policy?.role === CONST.POLICY.ROLE.ADMIN) {
            userRole = CONST.POLICY.ROLE.ADMIN;
            break;
        }
        if (policy?.role === CONST.POLICY.ROLE.AUDITOR) {
            userRole = CONST.POLICY.ROLE.AUDITOR;
        }
    }

    const policiesCountBucket = bucketPolicyCount(activePolicies.length);
    Sentry.setTag(CONST.TELEMETRY.TAGS.ACTIVE_POLICY, activePolicyID);
    Sentry.setTag(CONST.TELEMETRY.TAGS.POLICIES_COUNT, policiesCountBucket);
    Sentry.setTag(CONST.TELEMETRY.TAGS.USER_ROLE, userRole);
    Sentry.setContext(CONST.TELEMETRY.CONTEXT_POLICIES, {activePolicyID, activePolicies});
}

function sendTryNewDotCohortTag() {
    const cohort = tryNewDot?.nudgeMigration?.cohort;
    if (!cohort) {
        return;
    }
    Sentry.setTag(CONST.TELEMETRY.TAGS.NUDGE_MIGRATION_COHORT, cohort);
}

function sendReportsCountTag(reportsCount: number) {
    const reportsCountBucket = bucketReportCount(reportsCount);
    Sentry.setTag(CONST.TELEMETRY.TAGS.REPORTS_COUNT, reportsCountBucket);
}

function sendPersonalDetailsCountTag(personalDetailsCount: number) {
    const personalDetailsCountBucket = bucketReportCount(personalDetailsCount);
    Sentry.setTag(CONST.TELEMETRY.TAGS.PERSONAL_DETAILS_COUNT, personalDetailsCountBucket);
}

function initializeTelemetryTrackers() {
    initializeMemoryTracking();
    initializeCrashDiagnostics();
}

function cleanupTelemetryTrackers() {
    cleanupMemoryTracking();
    cleanupCrashDiagnostics();
}

export {initializeTelemetryTrackers, cleanupTelemetryTrackers};
