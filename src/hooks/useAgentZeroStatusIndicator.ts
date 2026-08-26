import {clearAgentZeroProcessingIndicator, getNewerActions} from '@libs/actions/Report';
import AgentZeroOptimisticStore, {MAX_AGE_MS as OPTIMISTIC_MAX_AGE_MS} from '@libs/AgentZeroOptimisticStore';
import AgentZeroReasoningStore from '@libs/AgentZeroReasoningStore';
import type {ReasoningEntry} from '@libs/AgentZeroReasoningStore';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportNameValuePairs} from '@src/types/onyx';

import type {NewestReportAction} from '@selectors/ReportAction';
import type {OnyxEntry} from 'react-native-onyx';

import {getNewestReportActionSelector} from '@selectors/ReportAction';
import {getAgentZeroProcessingLabel} from '@selectors/ReportNameValuePairs';
import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';

import {useClaimOnce} from './useActivityIdentityGuard';
import useLocalize from './useLocalize';
import useNetwork from './useNetwork';
import useOnyx from './useOnyx';

type AgentZeroStatusState = {
    isProcessing: boolean;
    reasoningHistory: ReasoningEntry[];
    statusLabel: string;
};

/**
 * Maximum duration the indicator stays active before we hard-clear it as a safety net.
 *
 * Recovery for missed Pusher events relies on Pusher's own reconnect-and-replay buffer
 * (most cases) plus the one-shot `getNewerActions` fetch fired by `useNetwork` on HTTP
 * reconnect. If neither delivers within this window, the safety timeout clears the
 * stuck local state.
 *
 * Shared with `AgentZeroOptimisticStore` so the cross-mount remaining window stays
 * consistent — a remount mid-thinking resumes the same cap from the original kickoff.
 */
const MAX_INDICATOR_DURATION_MS = OPTIMISTIC_MAX_AGE_MS;

// Minimum time to display a label before allowing change (prevents rapid flicker)
const MIN_DISPLAY_TIME = 300; // ms
// Debounce delay for server label updates
const DEBOUNCE_DELAY = 150; // ms

/**
 * Hook to manage the AgentZero status indicator for a single agent in a chat where AgentZero
 * responds. One instance runs per actively-thinking agent (a room can hold several), so all
 * its state — server label, optimistic store, reasoning store — is keyed by `(reportID,
 * agentAccountID)`. The reasoning Pusher subscription is owned by `AgentZeroStatusProvider`
 * (one per report), not here.
 *
 * @param reportID - The report ID to monitor
 * @param agentAccountID - The agent this indicator tracks (Concierge for Concierge/admin chats;
 *   the custom agent's accountID otherwise). Used to read this agent's server label and to
 *   decide when its final reply has landed: the indicator only clears once the newest
 *   reportAction's actorAccountID matches this agent AND the server NVP signals done.
 */
function useAgentZeroStatusIndicator(reportID: string, agentAccountID: number = CONST.ACCOUNT_ID.CONCIERGE): AgentZeroStatusState {
    // Server-driven processing label for this agent, from report name-value pairs (e.g. "Looking
    // up categories..."). The selector narrows to this agent's slot so the hook only re-renders
    // when its own label changes.
    const serverLabelSelector = useCallback((reportNameValuePairs: OnyxEntry<ReportNameValuePairs>) => getAgentZeroProcessingLabel(reportNameValuePairs, agentAccountID), [agentAccountID]);
    const [serverLabel] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`, {selector: serverLabelSelector});

    // Track the newest report action so we can fetch missed actions and detect actual Concierge replies.
    const [newestReportAction] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`, {selector: getNewestReportActionSelector});
    const newestReportActionRef = useRef<NewestReportAction | undefined>(newestReportAction);
    useEffect(() => {
        newestReportActionRef.current = newestReportAction;
    }, [newestReportAction]);

    // Track pending optimistic requests with a counter, backed by a module-level store so
    // the state survives ReportScreen remounts (switching chats and coming back). Each
    // kickoffWaitingIndicator() call increments the counter; when a Concierge reply is
    // detected (via Pusher, reconnect, or safety timeout), the entry is cleared — any
    // signal that a response arrived resolves all pending requests (optimistic state is
    // a display signal, not a queue).
    const subscribeToOptimisticStore = (onStoreChange: () => void) =>
        AgentZeroOptimisticStore.subscribe((updatedReportID, updatedAgentAccountID) => {
            if (updatedReportID !== reportID || updatedAgentAccountID !== agentAccountID) {
                return;
            }
            onStoreChange();
        });
    const getOptimisticSnapshot = () => AgentZeroOptimisticStore.getEntry(reportID, agentAccountID);
    const optimisticEntry = useSyncExternalStore(subscribeToOptimisticStore, getOptimisticSnapshot, getOptimisticSnapshot);
    const pendingOptimisticRequests = optimisticEntry?.count ?? 0;
    const optimisticStartedAt = optimisticEntry?.startedAt;
    const prevOptimisticStartedAtRef = useRef<number | undefined>(optimisticStartedAt);
    // Debounced label shown to the user — smooths rapid server label changes.
    // displayedLabelRef mirrors state so the label-sync effect can read the current value
    // without including displayedLabel in its dependency array (avoids extra effect cycles).
    const displayedLabelRef = useRef<string>('');
    const [displayedLabel, setDisplayedLabel] = useState<string>('');
    const {translate} = useLocalize();
    const prevServerLabelRef = useRef<string>(serverLabel ?? '');
    const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastUpdateTimeRef = useRef<number>(0);
    const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
    // Absolute expiry of the running safety window. It is what survives a teardown of the timeout itself, so an
    // Activity hide and reveal resumes the same cap instead of restarting it from zero.
    const safetyDeadlineRef = useRef<number | null>(null);
    const isOfflineRef = useRef<boolean>(false);
    // Newest reportActionID at the moment the indicator became active (raw state, ignoring
    // offline). Lets us distinguish "a pre-existing Concierge action was already the newest"
    // (common in Concierge DMs, where the previous reply is still the latest action) from
    // "a new Concierge reply arrived after the indicator started." Without this, sending a
    // message in a Concierge DM would immediately clear the just-activated indicator.
    //
    // Seeded from the optimistic store so a remount mid-thinking (chat switch) restores the
    // original baseline instead of capturing the current newest action — otherwise a reply
    // that landed while the provider was unmounted would be adopted as the baseline and go
    // undetected. `initialRestoredEntry` is read on every render (cheap Map lookup), but the
    // refs only consume the first-render value.
    const initialRestoredEntry = AgentZeroOptimisticStore.getEntry(reportID, agentAccountID);
    const restoredOptimisticOnMountRef = useRef<ReturnType<typeof AgentZeroOptimisticStore.getEntry>>(initialRestoredEntry);
    const indicatorBaselineActionIDRef = useRef<string | null>(initialRestoredEntry?.baselineActionID ?? null);
    const wasIndicatorActiveRef = useRef<boolean>(!!initialRestoredEntry);

    /**
     * Clear the pending safety timeout without ending the window it belongs to. Used by the
     * teardown effect, which also runs when an Activity hide cleans the subtree up while the
     * indicator is still on screen.
     *
     * Kept in useCallback because it's referenced in several useEffect dep arrays below. The
     * react-compiler-compat ESLint processor (which would otherwise suppress the exhaustive-deps
     * false positive) only runs on .tsx/.jsx files, not .ts.
     */
    const clearSafetyTimer = useCallback(() => {
        if (!safetyTimerRef.current) {
            return;
        }
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
    }, []);

    /** End the safety window for good, so nothing resumes it afterwards. Called when this processing cycle is over. */
    const endSafetyWindow = useCallback(() => {
        safetyDeadlineRef.current = null;
        clearSafetyTimer();
    }, [clearSafetyTimer]);

    /**
     * Hard-clear the indicator by resetting local state and clearing the Onyx NVP.
     * Called as a safety net after MAX_INDICATOR_DURATION_MS if no response has arrived.
     */
    const hardClearIndicator = useCallback(() => {
        // If offline, don't clear — the response may arrive when reconnected
        if (isOfflineRef.current) {
            return;
        }
        endSafetyWindow();
        AgentZeroOptimisticStore.clear(reportID, agentAccountID);
        displayedLabelRef.current = '';
        setDisplayedLabel('');
        clearAgentZeroProcessingIndicator(reportID, agentAccountID);
        getNewerActions(reportID, newestReportActionRef.current?.reportActionID);
    }, [endSafetyWindow, reportID, agentAccountID]);

    /**
     * Arm a timeout for the given part of the safety window. The timer fires `hardClearIndicator`
     * once it elapses, if nothing has cleared the indicator by then.
     *
     * Recovery itself is delegated upstream: Pusher's own reconnect-and-replay buffer
     * delivers missed events on most drops, and `useNetwork().onReconnect` fires a
     * one-shot `getNewerActions` on HTTP reconnect. The safety timer is the backstop
     * for the long tail.
     */
    const armSafetyTimer = useCallback(
        (safetyDurationMs: number) => {
            clearSafetyTimer();

            if (safetyDurationMs <= 0) {
                // The window is already spent (a remount or a cover longer than the cap) —
                // hard-clear immediately rather than arming a timer that would fire at zero.
                hardClearIndicator();
                return;
            }

            safetyTimerRef.current = setTimeout(() => {
                hardClearIndicator();
            }, safetyDurationMs);
        },
        [clearSafetyTimer, hardClearIndicator],
    );

    /** Open a fresh safety window. Called when processing becomes active or the server renews the lease with a new label. */
    const startSafetyTimer = useCallback(
        (safetyDurationMs: number = MAX_INDICATOR_DURATION_MS) => {
            safetyDeadlineRef.current = Date.now() + safetyDurationMs;
            armSafetyTimer(safetyDurationMs);
        },
        [armSafetyTimer],
    );

    /**
     * Put a timeout back on the window that is already running, or open one when none is. A teardown drops the
     * timeout while the deadline survives, so this is what an Activity reveal needs instead of a fresh window.
     */
    const resumeSafetyTimer = useCallback(() => {
        const deadline = safetyDeadlineRef.current;
        if (deadline === null) {
            startSafetyTimer();
            return;
        }
        if (safetyTimerRef.current) {
            return;
        }
        armSafetyTimer(deadline - Date.now());
    }, [armSafetyTimer, startSafetyTimer]);

    // On reconnect, defensively clear any stale NVP, refetch missed actions, and rearm the
    // safety timer so the cap measures from reconnect rather than the original kickoff.
    //
    // If the server SET+CLEARED the NVP while Pusher was disconnected, Onyx sync can deliver
    // only the stale SET on reconnect. Clearing the NVP locally when we were optimistic-only
    // prevents a stuck label.
    const {isOffline} = useNetwork({
        onReconnect: () => {
            const wasOptimistic = pendingOptimisticRequests > 0;

            if (wasOptimistic) {
                clearAgentZeroProcessingIndicator(reportID, agentAccountID);
            }

            // Fetch missed actions so the Onyx-driven Concierge-reply detection can fire.
            getNewerActions(reportID, newestReportActionRef.current?.reportActionID);

            if (serverLabel || wasOptimistic) {
                startSafetyTimer();
            }
        },
    });

    // Subscribe to AgentZeroReasoningStore using useSyncExternalStore for correct
    // synchronization with React's render cycle. React Compiler memoizes these closures
    // based on reportID, so useSyncExternalStore doesn't unsubscribe/resubscribe on every render.
    const subscribeToReasoningStore = (onStoreChange: () => void) => {
        const unsubscribe = AgentZeroReasoningStore.subscribe((updatedReportID, updatedAgentAccountID) => {
            if (updatedReportID !== reportID || updatedAgentAccountID !== agentAccountID) {
                return;
            }
            onStoreChange();
        });
        return unsubscribe;
    };
    const getReasoningSnapshot = () => AgentZeroReasoningStore.getReasoningHistory(reportID, agentAccountID);
    const reasoningHistory = useSyncExternalStore(subscribeToReasoningStore, getReasoningSnapshot, getReasoningSnapshot);

    // Synchronize the displayed label with debounce and minimum display time.
    // displayedLabelRef mirrors state so the effect can check the current value without depending on displayedLabel.
    useEffect(() => {
        const hadServerLabel = !!prevServerLabelRef.current;
        const hasServerLabel = !!serverLabel;

        let targetLabel = '';
        const thinkingLabel = translate(agentAccountID === CONST.ACCOUNT_ID.CONCIERGE ? 'common.thinking' : 'common.agentThinking');
        if (hasServerLabel) {
            targetLabel = serverLabel ?? '';
        } else if (pendingOptimisticRequests > 0) {
            targetLabel = thinkingLabel;
        }

        // (Re)arm the safety timer whenever this agent is active — a server label arrived (lease
        // renewal) or an optimistic kickoff is pending. Keep the optimistic store entry alive —
        // the server NVP can briefly go truthy→falsy→truthy between processing phases (e.g.,
        // "thinking..." → (gap) → "searching documentation..."), and clearing the optimistic
        // floor here means a chat-switch during the gap lands on "no optimistic, no serverLabel
        // → no indicator." The optimistic entry is cleared by authoritative signals only: the
        // reply-detection effect (new agent action newer than baseline), the 120s safety
        // timeout, or the onReconnect handler.
        //
        // Only a new label or a new kickoff renews the lease: this effect also re-runs after an Activity hide with
        // every dependency unchanged, and renewing there would restart the cap from zero on every reveal.
        const hasNewServerLabel = hasServerLabel && serverLabel !== prevServerLabelRef.current;
        const hasNewOptimisticKickoff = optimisticStartedAt !== undefined && optimisticStartedAt !== prevOptimisticStartedAtRef.current;
        prevOptimisticStartedAtRef.current = optimisticStartedAt;
        if (hasServerLabel || pendingOptimisticRequests > 0) {
            if (hasNewServerLabel || hasNewOptimisticKickoff) {
                startSafetyTimer();
            } else {
                resumeSafetyTimer();
            }
        }
        // Clear the safety timer when processing ends
        else {
            endSafetyWindow();
            if (hadServerLabel && reasoningHistory.length > 0) {
                AgentZeroReasoningStore.clearReasoning(reportID, agentAccountID);
            }
        }

        // Use ref to check current value without depending on displayedLabel in deps
        if (displayedLabelRef.current === targetLabel) {
            prevServerLabelRef.current = serverLabel ?? '';
            return;
        }

        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
        const remainingMinTime = Math.max(0, MIN_DISPLAY_TIME - timeSinceLastUpdate);

        if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
            updateTimerRef.current = null;
        }

        // Immediate update when enough time has passed or when clearing the label
        if (remainingMinTime === 0 || targetLabel === '') {
            displayedLabelRef.current = targetLabel;
            setDisplayedLabel(targetLabel);
            lastUpdateTimeRef.current = now;
        } else {
            // Schedule update after debounce + remaining min display time
            const delay = DEBOUNCE_DELAY + remainingMinTime;
            updateTimerRef.current = setTimeout(() => {
                displayedLabelRef.current = targetLabel;
                setDisplayedLabel(targetLabel);
                lastUpdateTimeRef.current = Date.now();
                updateTimerRef.current = null;
            }, delay);
        }

        prevServerLabelRef.current = serverLabel ?? '';

        return () => {
            if (!updateTimerRef.current) {
                return;
            }
            clearTimeout(updateTimerRef.current);
            updateTimerRef.current = null;
        };
    }, [serverLabel, reasoningHistory.length, reportID, agentAccountID, pendingOptimisticRequests, optimisticStartedAt, translate, startSafetyTimer, resumeSafetyTimer, endSafetyWindow]);

    useEffect(() => {
        isOfflineRef.current = isOffline;
    }, [isOffline]);

    // Drop the pending safety timeout on teardown. The deadline it was arming against is kept, so a reveal
    // resumes the same window instead of losing the cap.
    useEffect(
        () => () => {
            clearSafetyTimer();
        },
        [clearSafetyTimer],
    );

    // If we restored optimistic state from a previous mount (e.g. user switched chats and
    // came back mid-thinking), arm the safety timer with whatever time remains on the
    // window. If a server label is also present on mount, the label-sync effect runs in
    // the same commit and opens a fresh window — this effect runs after it, so the shorter
    // restored window wins.
    //
    // The claim is keyed on the restored entry rather than on the mount, because an Activity reveal re-runs the
    // effect against the very same snapshot, whose remaining window has shrunk in the meantime.
    const claimRestoredSafetyWindow = useClaimOnce();
    useEffect(() => {
        const restored = restoredOptimisticOnMountRef.current;
        if (!restored || !claimRestoredSafetyWindow(`${reportID}:${agentAccountID}:${restored.startedAt}`)) {
            return;
        }
        const elapsed = Date.now() - restored.startedAt;
        const remaining = MAX_INDICATOR_DURATION_MS - elapsed;
        startSafetyTimer(remaining);
    }, [startSafetyTimer, claimRestoredSafetyWindow, reportID, agentAccountID]);

    // Capture the newest reportActionID as a baseline whenever the indicator transitions
    // from inactive to active (serverLabel or optimistic). The baseline survives offline
    // cycles (it tracks raw active state, not UI-visible isProcessing) so a new agent
    // reply that arrives during offline → online is still detected as "new" on reconnect.
    const isIndicatorActive = !!serverLabel || pendingOptimisticRequests > 0;
    useEffect(() => {
        if (isIndicatorActive && !wasIndicatorActiveRef.current) {
            // The store's own baseline is preferred because it was recorded at the kickoff, while the newest action
            // seen here is only the one that happens to be current when this effect gets to run.
            const kickoffBaselineActionID = AgentZeroOptimisticStore.getEntry(reportID, agentAccountID)?.baselineActionID;
            indicatorBaselineActionIDRef.current = kickoffBaselineActionID ?? newestReportActionRef.current?.reportActionID ?? null;
        } else if (!isIndicatorActive) {
            indicatorBaselineActionIDRef.current = null;
        }
        wasIndicatorActiveRef.current = isIndicatorActive;
    }, [isIndicatorActive, reportID, agentAccountID]);

    // Clear the indicator when this agent has *actually completed* processing. A newer
    // action from the agent alone isn't enough: during processing, the agent can post
    // intermediate actions (reasoning dumps, status updates) that aren't the final reply,
    // and clearing on those makes the indicator flicker away mid-stream. Only treat the
    // combination as the real "done" signal: a new action from this agent *and* the server
    // has cleared its NVP slot (serverLabel falsy). Safety nets for server-side misses:
    //   - 120s safety timeout (hardClearIndicator) catches a stuck optimistic entry.
    //   - onReconnect defensively clears the NVP when optimistic-only.
    const newestActorAccountID = newestReportAction?.actorAccountID;
    const newestActionID = newestReportAction?.reportActionID;
    useEffect(() => {
        if (newestActorAccountID !== agentAccountID) {
            return;
        }
        if (pendingOptimisticRequests === 0 && !serverLabel) {
            return;
        }
        if (!newestActionID || newestActionID === indicatorBaselineActionIDRef.current) {
            return;
        }
        // Server hasn't signaled done yet — this is an intermediate agent action, not
        // the final reply. Wait for the NVP to clear before tearing everything down.
        if (serverLabel) {
            return;
        }
        clearAgentZeroProcessingIndicator(reportID, agentAccountID);
        endSafetyWindow();
        AgentZeroOptimisticStore.clear(reportID, agentAccountID);
    }, [newestActorAccountID, newestActionID, serverLabel, pendingOptimisticRequests, reportID, endSafetyWindow, agentAccountID]);

    const isProcessing = !isOffline && isIndicatorActive;

    return {
        isProcessing,
        reasoningHistory,
        statusLabel: displayedLabel,
    };
}

export default useAgentZeroStatusIndicator;
