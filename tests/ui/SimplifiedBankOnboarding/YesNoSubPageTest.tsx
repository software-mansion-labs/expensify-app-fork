import {fireEvent, screen} from '@testing-library/react-native';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {clearRequestState} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import type {OnboardingRequest, RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import {PageNavigationActionsContext, PageNavigationStateContext} from '@pages/SimplifiedBankOnboarding/core/step/pageNavigation';
import type {PageNavigationActions, PageNavigationState} from '@pages/SimplifiedBankOnboarding/core/step/pageNavigation';
import {NEXT_STEP} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';
import type {PageTarget} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';
import YesNoSubPage from '@pages/SimplifiedBankOnboarding/core/subPageForms/YesNoSubPage';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import Onyx from 'react-native-onyx';

import {answerWrites, createTestFlowActions, renderInFlow} from '../../utils/BankOnboardingLabStepTestUtils';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({
    read: jest.fn(),
    write: jest.fn(),
}));

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

const POLICY_ID = '1';
const QUESTION = 'Do you own 25% or more?';

const OWNERS_REQUEST: OnboardingRequest = {
    name: 'usd.beneficialOwners.confirm',
    build: ({bankAccount}) => ({
        type: 'write',
        command: WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS,
        params: {...bankAccount, ownsMoreThan25Percent: false, beneficialOwners: '[]', beneficialOwnerKeys: []},
    }),
};

type NavigatedPage = {outcome: RequestOutcome | void; target: PageTarget | undefined};

type RenderedQuestion = {
    saveDraft: jest.Mock<Promise<void>, [OnboardingDraft]>;
    getNavigatedPage: () => Promise<NavigatedPage>;
};

type QuestionOptions = {
    request?: OnboardingRequest;
    isEditing?: boolean;
    isAnswerSaved?: boolean;
};

async function renderQuestion({request, isEditing = false, isAnswerSaved = true}: QuestionOptions = {}): Promise<RenderedQuestion> {
    const saveDraft = jest.fn<Promise<void>, [OnboardingDraft]>(() => Promise.resolve());
    let navigatedPage: Promise<NavigatedPage> = Promise.reject(new Error('The page did not move'));
    navigatedPage.catch(() => {});

    const pageState: PageNavigationState = {page: 'is-user-ubo', isEditing};
    const pageActions: PageNavigationActions = {
        goNext: jest.fn(),
        goNextAfter: (outcome, target) => {
            navigatedPage = outcome.then((result) => ({outcome: result, target}));
        },
        goBack: jest.fn(),
        openPage: jest.fn(),
    };

    await renderInFlow(
        <PageNavigationStateContext.Provider value={pageState}>
            <PageNavigationActionsContext.Provider value={pageActions}>
                <YesNoSubPage
                    name="is-user-ubo"
                    inputID={isAnswerSaved ? 'ownsMoreThan25Percent' : undefined}
                    title={QUESTION}
                    defaultValue={false}
                    getNext={(answer) => (answer ? 'legal-name' : NEXT_STEP)}
                    getDraftUpdate={(answer) => (answer ? {} : {usdOwners: []})}
                    request={request}
                />
            </PageNavigationActionsContext.Provider>
        </PageNavigationStateContext.Provider>,
        {target: {kind: 'usd', policyID: POLICY_ID, backTo: undefined}, flowActions: createTestFlowActions(saveDraft)},
    );
    return {saveDraft, getNavigatedPage: () => navigatedPage};
}

async function chooseAnswer(label: 'common.yes' | 'common.no') {
    fireEvent.press(screen.getByText(label));
    fireEvent.press(screen.getByText('common.confirm'));
    await waitForBatchedUpdatesWithAct();
}

describe('YesNoSubPage', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.mocked(write).mockReset();
        answerWrites('success');
        await clearRequestState();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    afterAll(() => clearRequestState());

    it('saves the answer with its values and moves to the page of the answer', async () => {
        // Given a question without a request
        const {saveDraft, getNavigatedPage} = await renderQuestion();

        // When the user answers "No"
        await chooseAnswer('common.no');

        // Then the answer and the values that come with it reach the draft, and the step ends because "No" leads there
        expect(saveDraft).toHaveBeenCalledWith({ownsMoreThan25Percent: false, usdOwners: []});
        await expect(getNavigatedPage()).resolves.toEqual({outcome: undefined, target: NEXT_STEP});
        expect(write).not.toHaveBeenCalled();
    });

    it('saves only the values that come with the answer when the question has no input', async () => {
        // Given a question with no input, like "are there more owners", whose answer has no place in the draft
        const {saveDraft, getNavigatedPage} = await renderQuestion({isAnswerSaved: false});

        // When the user answers "No"
        await chooseAnswer('common.no');

        // Then only the values that come with the answer reach the draft, so no earlier answer is overwritten
        expect(saveDraft).toHaveBeenCalledWith({usdOwners: []});
        await expect(getNavigatedPage()).resolves.toEqual({outcome: undefined, target: NEXT_STEP});
    });

    it('sends no request for an answer that stays in the step', async () => {
        // Given a question with a request, whose "Yes" leads to another page of the step
        const {getNavigatedPage} = await renderQuestion({request: OWNERS_REQUEST});

        // When the user answers "Yes"
        await chooseAnswer('common.yes');

        // Then nothing is sent and the page of "Yes" opens, because the owners are sent after the user lists them
        await expect(getNavigatedPage()).resolves.toEqual({outcome: undefined, target: 'legal-name'});
        expect(write).not.toHaveBeenCalled();
    });

    it('sends the request before the step ends for an answer that ends it', async () => {
        // Given a question with a request, whose "No" ends the step
        const {getNavigatedPage} = await renderQuestion({request: OWNERS_REQUEST});

        // When the user answers "No"
        await chooseAnswer('common.no');

        // Then the request goes out and the step ends after its success
        await expect(getNavigatedPage()).resolves.toEqual({outcome: {status: 'succeeded'}, target: NEXT_STEP});
        expect(write).toHaveBeenCalledWith(WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS, expect.objectContaining({policyID: POLICY_ID}), expect.anything());
    });

    it('sends nothing in edit mode', async () => {
        // Given a question that the user opened from the confirmation
        const {saveDraft, getNavigatedPage} = await renderQuestion({request: OWNERS_REQUEST, isEditing: true});

        // When the user changes the answer
        await chooseAnswer('common.yes');

        // Then only the draft changes, because the confirmation sends the step
        expect(saveDraft).toHaveBeenCalledWith({ownsMoreThan25Percent: true});
        await expect(getNavigatedPage()).resolves.toMatchObject({outcome: undefined});
        expect(write).not.toHaveBeenCalled();
    });
});
