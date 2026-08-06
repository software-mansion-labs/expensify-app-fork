import HttpUtils from '@libs/HttpUtils';
/**
 * The QA auth probe for the Cloudflare Access POC (see Web_POC.md): drives the full session decision
 * tree and fires one isolated request through HttpUtils against the mock Worker. This is deliberately
 * the only module importing both HttpUtils and the session action — keeping the dependency one-way
 * (HttpUtils → session) everywhere else.
 */
import {isRecord} from '@libs/ObjectUtils';

import CONFIG from '@src/CONFIG';
import CONST from '@src/CONST';

import {beginQAAuthRedirect, getCfSession, getPendingQAAuthCompletion, isSessionNearExpiry, refreshCfSession, waitForCfSessionHydration} from './CloudflareSession';

type QAProbeStatus = 'success' | 'reauthRequired' | 'error';

type QAProbeResult = {
    /** Semantic outcome — the UI translates these */
    status: QAProbeStatus;

    /** Raw diagnostic output (Worker echo / error text) — deliberately untranslated, like raw server errors elsewhere */
    detail?: string;
};

/**
 * Runs the end-to-end probe. Never rejects: redirect failures, state mismatches and exchange errors all
 * come back as semantic results, so the UI consumes it with `.then` only. When there is no session this
 * navigates the tab away and never settles — the redirect transport needs no user activation, so unlike
 * the popup transport it is safe to await freely first.
 */
async function runQAProbe(): Promise<QAProbeResult> {
    try {
        await waitForCfSessionHydration();
        // A callback boot may still be exchanging the code — join it rather than reading a still-empty
        // session and starting a second round trip
        const pendingCompletion = getPendingQAAuthCompletion();
        if (pendingCompletion) {
            await pendingCompletion;
        }

        const session = getCfSession();
        if (!session) {
            // Navigates this tab to Cloudflare and never settles — nothing below runs
            await beginQAAuthRedirect();
        } else if (isSessionNearExpiry(session)) {
            // Transient refresh failures throw and land in the catch below as a plain 'error' —
            // the session is kept, so "try again" is honest advice there
            const refreshResult = await refreshCfSession();
            if (refreshResult === 'reauth-required') {
                // Terminal failure already cleared the session. Deliberately no redirect from here — a
                // background failure must never navigate the tab away; the NEXT press starts the round trip
                return {status: 'reauthRequired'};
            }
        }

        const response = await HttpUtils.processHTTPRequest(`${CONFIG.QA_AUTH.API_ROOT}api/CloudflareAuthProbe`, CONST.NETWORK.METHOD.POST);
        // The mock Worker echoes how the request authenticated; a loose, validated read keeps the
        // POC-only field out of the shared Response type
        const parsedResponse: unknown = response;
        const authenticatedVia = isRecord(parsedResponse) && typeof parsedResponse.authenticatedVia === 'string' ? parsedResponse.authenticatedVia : null;
        return {status: 'success', detail: `authenticatedVia: ${authenticatedVia ?? 'null'}`};
    } catch (error) {
        if (error instanceof Error && error.message === CONST.ERROR.CF_REAUTH_REQUIRED) {
            // Whoever threw this already dropped the dead session (terminal refresh inside
            // refreshCfSession, or the double-401 path via markCfSessionRejected)
            return {status: 'reauthRequired'};
        }
        return {status: 'error', detail: error instanceof Error ? error.message : undefined};
    }
}

export {runQAProbe};
export type {QAProbeResult, QAProbeStatus};
