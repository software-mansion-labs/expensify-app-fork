import {act} from '@testing-library/react-native';

import usePaginatedReportActions from '@hooks/usePaginatedReportActions';

import {resetReportActionsOrderStore} from '@libs/ReportActionsOrder/ReportActionsOrderStore';
import {setReportActionsEngineMode} from '@libs/SqlEngine/engineMode';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportActions} from '@src/types/onyx';

import React from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';
import {measureRenders} from 'reassure';

import createRandomReportAction from '../utils/collections/reportActions';
import {resetMockEngine, setMockEngineAvailable} from '../utils/mockSqlEngineClient';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- a jest.mock factory cannot reach a typed import, so the stand-in module is pulled in with require
jest.mock('@libs/SqlEngine/EngineClient', () => require('../utils/mockSqlEngineClient'));

const REPORT_ID = '1';
const REPORT_ACTIONS_KEY = `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${REPORT_ID}` as const;
const ACTION_COUNT = 5000;

function buildReportActions(): ReportActions {
    const actions: ReportActions = {};
    for (let index = 1; index <= ACTION_COUNT; index++) {
        actions[index] = createRandomReportAction(index);
    }
    return actions;
}

const REPORT_ACTIONS = buildReportActions();

let incomingActionIndex = ACTION_COUNT;

function mergeOneAction(): Promise<void> {
    incomingActionIndex += 1;
    const reportAction = {...createRandomReportAction(incomingActionIndex), created: `2030-01-01 00:00:${String(incomingActionIndex % 60).padStart(2, '0')}.000`};
    return Onyx.merge(REPORT_ACTIONS_KEY, {[incomingActionIndex]: reportAction});
}

function ReportActionsHarness() {
    const {sortedAllReportActions} = usePaginatedReportActions(REPORT_ID);
    return <View testID={`sorted-${sortedAllReportActions?.length ?? 0}`} />;
}

async function mergeOneActionScenario() {
    await act(async () => {
        await mergeOneAction();
        await waitForBatchedUpdates();
    });
}

describe('usePaginatedReportActions', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS, evictableKeys: [ONYXKEYS.COLLECTION.REPORT_ACTIONS]});
    });

    beforeEach(async () => {
        resetMockEngine();
        resetReportActionsOrderStore();
        incomingActionIndex = ACTION_COUNT;
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, {reportID: REPORT_ID, type: CONST.REPORT.TYPE.CHAT});
        await Onyx.set(REPORT_ACTIONS_KEY, REPORT_ACTIONS);
        await waitForBatchedUpdates();
    });

    afterAll(() => {
        Onyx.clear();
    });

    test(`[usePaginatedReportActions] ${ACTION_COUNT} actions, engine unavailable`, async () => {
        setReportActionsEngineMode('off');
        setMockEngineAvailable(false);

        await measureRenders(<ReportActionsHarness />, {scenario: mergeOneActionScenario});
    });

    test(`[usePaginatedReportActions] ${ACTION_COUNT} actions, mocked engine`, async () => {
        setReportActionsEngineMode('preview');
        setMockEngineAvailable(true);

        await measureRenders(<ReportActionsHarness />, {scenario: mergeOneActionScenario});
    });
});
