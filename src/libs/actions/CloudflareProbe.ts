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

import {getCfSession, isSessionNearExpiry, refreshCfSession, startQAAuthFlow} from './CloudflareSession';

type QAProbeStatus = 'success' | 'cancelled' | 'reauthRequired' | 'error';

type QAProbeResult = {
    /** Semantic outcome — the UI translates these */
    status: QAProbeStatus;

    /** Raw diagnostic output (Worker echo / error text) — deliberately untranslated, like raw server errors elsewhere */
    detail?: string;
};

/**
 * Runs the end-to-end probe. Never rejects: popup failures, state mismatches and exchange errors all
 * come back as semantic results, so the UI consumes it with `.then` only.
 */
async function runQAProbe(): Promise<QAProbeResult> {
    try {
        // No awaits before the popup branch: TestToolMenu keeps the button disabled until
        // prepareQAAuthFlow() resolved, so the cache is hydrated and PKCE is pre-warmed
        const session = getCfSession();
        if (!session) {
            // window.open fires synchronously inside — this must stay within the press's user activation
            const didAuthenticate = await startQAAuthFlow();
            if (!didAuthenticate) {
                return {status: 'cancelled'};
            }
        } else if (isSessionNearExpiry(session)) {
            // Transient refresh failures throw and land in the catch below as a plain 'error' —
            // the session is kept, so "try again" is honest advice there
            const refreshResult = await refreshCfSession();
            if (refreshResult === 'reauth-required') {
                // Terminal failure already cleared the session. Deliberately no popup from here — the
                // failed round trip consumed the user activation; the NEXT press lands in the popup branch
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
