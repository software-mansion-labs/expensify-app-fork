import Pusher from '@libs/Pusher';
import type {ConciergeDraftEvent} from '@libs/Pusher/types';

import {ConciergeDraftProvider, useConciergeDraft} from '@pages/inbox/ConciergeDraftContext';
import {setCachedDraft} from '@pages/inbox/conciergeDraftState';

import ONYXKEYS from '@src/ONYXKEYS';

import React, {act, useEffect} from 'react';
import Onyx from 'react-native-onyx';

import renderCoverableScreen from '../utils/ScreenCoverHarness';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const REPORT_ID = '123';
const REPORT_ACTION_ID = '456';
const STREAM_SESSION_ID = 'stream-session-1';
const CREATED = '2026-04-03 10:00:00.000';
const DRAFT_EVENT_BINDING_COUNT = 6;

// A real-Pusher-shaped registry: unsubscribe unbinds the listener, so a later emit reaches nobody.
const mockPusherListeners = new Map<string, (data: unknown) => void>();
const mockPusherUnsubscribe = jest.fn();

jest.mock('@libs/Pusher', () => ({
    TYPE: {
        CONCIERGE_DRAFT_EVENTS: 'conciergeDraftEvents',
        CONCIERGE_DRAFT_STARTED: 'conciergeDraftStarted',
        CONCIERGE_DRAFT_UPDATED: 'conciergeDraftUpdated',
        CONCIERGE_DRAFT_COMPLETED: 'conciergeDraftCompleted',
        CONCIERGE_DRAFT_FAILED: 'conciergeDraftFailed',
        CONCIERGE_DRAFT_CLEARED: 'conciergeDraftCleared',
    },
    subscribe: jest.fn((channelName: string, eventName: string, callback: (data: unknown) => void) => {
        mockPusherListeners.set(eventName, callback);
        return Object.assign(Promise.resolve(), {
            unsubscribe: () => {
                mockPusherUnsubscribe(eventName);
                mockPusherListeners.delete(eventName);
            },
        });
    }),
}));

// Only the channel-name builder is used by the hook, so the heavy Report actions module stays out.
jest.mock('@libs/actions/Report', () => ({
    getReportChannelName: (reportID: string) => `private-report-${reportID}`,
}));

// Browser-tab visibility never changes during an Activity hide, so the recovery hook stays silent.
jest.mock('@libs/Visibility', () => ({
    __esModule: true,
    default: {
        hasFocus: jest.fn(() => true),
        isVisible: jest.fn(() => true),
        onVisibilityChange: jest.fn(() => () => {}),
    },
}));

const mockedSubscribe = jest.mocked(Pusher.subscribe);

const publishedDraft: {current: ReturnType<typeof useConciergeDraft> | undefined} = {current: undefined};

function DraftProbe() {
    const draft = useConciergeDraft();

    useEffect(() => {
        publishedDraft.current = draft;
    });

    return null;
}

function emitPusherEvent(eventType: string, event: ConciergeDraftEvent) {
    // A missing listener is exactly what a covered Activity screen looks like, so the event just evaporates.
    mockPusherListeners.get(eventType)?.(event);
}

function createDraftEvent(bodyMarkdown: string): ConciergeDraftEvent {
    return {
        reportID: REPORT_ID,
        reportActionID: REPORT_ACTION_ID,
        streamSessionID: STREAM_SESSION_ID,
        sequence: 1,
        status: 'updated',
        created: CREATED,
        bodyMarkdown,
    };
}

/**
 * Concierge streams its reply as one-shot `conciergeDraft*` Pusher events on the report channel. The subscription
 * effect's cleanup unbinds all six listeners, so anything streamed while nobody is bound is gone for good, and the
 * hook's own recovery path (`Visibility.onVisibilityChange`) only fires for browser-tab changes, never for a cover.
 * Covering the chat with a thread must not drop the bindings. The assertions describe behavior that ships today.
 */
describe('ConciergeDraftProvider across a cover/reveal cycle', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        mockPusherListeners.clear();
        publishedDraft.current = undefined;
        setCachedDraft(REPORT_ID, null);
        await Onyx.clear();
        await Onyx.merge(ONYXKEYS.CONCIERGE_REPORT_ID, REPORT_ID);
        await waitForBatchedUpdatesWithAct();
    });

    it('keeps the concierge draft Pusher bindings while the chat is covered by a thread', async () => {
        const screen = renderCoverableScreen(
            <ConciergeDraftProvider reportID={REPORT_ID}>
                <DraftProbe />
            </ConciergeDraftProvider>,
        );
        await waitForBatchedUpdatesWithAct();
        expect(mockedSubscribe).toHaveBeenCalledTimes(DRAFT_EVENT_BINDING_COUNT);

        await screen.hide();
        await screen.reveal();
        await waitForBatchedUpdatesWithAct();

        // The stream is one-shot: unbinding on hide loses every chunk of that window, resubscribing cannot get them back.
        expect(mockPusherUnsubscribe).not.toHaveBeenCalled();
        expect(mockedSubscribe).toHaveBeenCalledTimes(DRAFT_EVENT_BINDING_COUNT);

        screen.unmount();
    });

    it('still shows a draft that Concierge streamed while the chat was covered by a thread', async () => {
        const screen = renderCoverableScreen(
            <ConciergeDraftProvider reportID={REPORT_ID}>
                <DraftProbe />
            </ConciergeDraftProvider>,
        );
        await waitForBatchedUpdatesWithAct();
        expect(mockedSubscribe).toHaveBeenCalledTimes(DRAFT_EVENT_BINDING_COUNT);

        await screen.hide();
        act(() => {
            emitPusherEvent(Pusher.TYPE.CONCIERGE_DRAFT_UPDATED, createDraftEvent('Hello'));
        });
        await screen.reveal();
        await waitForBatchedUpdatesWithAct();

        // Today the listener survives the cover, so the reply streamed behind the thread is on screen after the return.
        expect(publishedDraft.current?.hasActiveDraft).toBe(true);

        screen.unmount();
    });
});
