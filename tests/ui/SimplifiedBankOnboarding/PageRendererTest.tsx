import {fireEvent, render, screen} from '@testing-library/react-native';

import OnyxListItemProvider from '@components/OnyxListItemProvider';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import createYesNoField from '@pages/SimplifiedBankOnboarding/core/form/fields/createYesNoField';
import PageRenderer from '@pages/SimplifiedBankOnboarding/core/form/pages/PageRenderer';
import type {CustomPageConfig, PageConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/core/plan/types';

import ONYXKEYS from '@src/ONYXKEYS';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

const {PAGE_NAMES, BENEFICIAL_OWNERS_SUB_PAGES} = SBO_CONST.USD;
const QUESTION = 'Do you own 25% or more?';
const READ_ONLY_ROW_ID = 'requestor';
const OWNER_ROW_ID = 'owner-1';

const questionPage: PageConfig = {
    kind: 'form',
    id: BENEFICIAL_OWNERS_SUB_PAGES.IS_USER_UBO,
    title: QUESTION,
    isComplete: false,
    fields: [createYesNoField('ownsMoreThan25Percent', {question: QUESTION})],
};

const listPage: PageConfig = {
    kind: 'list',
    id: BENEFICIAL_OWNERS_SUB_PAGES.UBOS_LIST,
    title: 'Check the owners',
    description: 'The law asks us to verify every owner',
    rowsTitle: 'Owners:',
    isComplete: true,
    rows: [
        {id: READ_ONLY_ROW_ID, title: 'Ada Lovelace', description: '1990-01-01', isReadOnly: true},
        {id: OWNER_ROW_ID, title: 'Grace Hopper', description: '1985-05-05'},
    ],
};

type RenderedPage = {
    onSubmit: jest.Mock<void, [OnboardingDraft]>;
    onRowPress: jest.Mock<void, [string]>;
};

async function renderPage(page: Exclude<PageConfig, CustomPageConfig>, answers: OnboardingDraft = {}): Promise<RenderedPage> {
    const onSubmit = jest.fn<void, [OnboardingDraft]>();
    const onRowPress = jest.fn<void, [string]>();
    const step: StepConfig = {id: PAGE_NAMES.BENEFICIAL_OWNERS, title: 'Owners', isComplete: false, pages: [page]};

    render(
        <OnyxListItemProvider>
            <NavigationContainer>
                <PageRenderer
                    formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
                    step={step}
                    page={page}
                    answers={answers}
                    isEditing={false}
                    canSubmitOffline
                    isLoading={false}
                    onSubmit={onSubmit}
                    onEdit={jest.fn()}
                    onRowPress={onRowPress}
                />
            </NavigationContainer>
        </OnyxListItemProvider>,
    );
    await waitForBatchedUpdatesWithAct();
    return {onSubmit, onRowPress};
}

describe('PageRenderer', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    describe('a yes or no question', () => {
        it('submits "No" when the user confirms without choosing', async () => {
            // Given a question that nobody answered yet
            const {onSubmit} = await renderPage(questionPage);

            // When the user submits the page as it opened
            fireEvent.press(screen.getByText('common.next'));
            await waitForBatchedUpdatesWithAct();

            // Then "No" is the answer, because the question opens with it and "No" is a valid answer, not an empty input
            expect(onSubmit).toHaveBeenCalledWith({ownsMoreThan25Percent: false});
        });

        it('submits "Yes" after the user chose it', async () => {
            // Given a question that nobody answered yet
            const {onSubmit} = await renderPage(questionPage);

            // When the user chooses "Yes" and submits
            fireEvent.press(screen.getByText('common.yes'));
            fireEvent.press(screen.getByText('common.next'));
            await waitForBatchedUpdatesWithAct();

            // Then the page submits only the boolean input of the question
            expect(onSubmit).toHaveBeenCalledWith({ownsMoreThan25Percent: true});
        });

        it('opens with the saved answer', async () => {
            // Given a question that the user answered with "Yes" before
            const {onSubmit} = await renderPage(questionPage, {ownsMoreThan25Percent: true});

            // When the user submits the page as it opened
            fireEvent.press(screen.getByText('common.next'));
            await waitForBatchedUpdatesWithAct();

            // Then the saved answer is kept, so a visit to the page does not reset it to "No"
            expect(onSubmit).toHaveBeenCalledWith({ownsMoreThan25Percent: true});
        });
    });

    describe('a list', () => {
        it('shows its heading and every entry', async () => {
            // Given a list with an entry that cannot be opened and one that can
            // When the page renders it
            await renderPage(listPage);

            // Then the title, the description, the heading of the rows and both entries are on the page
            expect(screen.getByText('Check the owners')).toBeOnTheScreen();
            expect(screen.getByText('The law asks us to verify every owner')).toBeOnTheScreen();
            expect(screen.getByText('Owners:')).toBeOnTheScreen();
            expect(screen.getByText('Ada Lovelace')).toBeOnTheScreen();
            expect(screen.getByText('Grace Hopper')).toBeOnTheScreen();
        });

        it('opens an entry when its row is pressed', async () => {
            // Given a list with an entry that can be opened
            const {onRowPress} = await renderPage(listPage);

            // When the user presses the row of that entry
            // The row ignores a press that comes without an event, so the test sends one
            fireEvent.press(screen.getByRole('button', {name: 'Grace Hopper, 1985-05-05'}), {nativeEvent: {}});

            // Then the page reports the ID of the row, which the plan turns into the owner to edit
            expect(onRowPress).toHaveBeenCalledWith(OWNER_ROW_ID);
        });

        it('opens nothing when a read only row is pressed', async () => {
            // Given a list whose first entry is the current user, who is edited in another step
            const {onRowPress} = await renderPage(listPage);

            // When the user presses the row of the current user
            fireEvent.press(screen.getByText('Ada Lovelace'), {nativeEvent: {}});

            // Then no entry opens
            expect(onRowPress).not.toHaveBeenCalled();
        });

        it('submits the step from the confirm button', async () => {
            // Given a list
            const {onSubmit} = await renderPage(listPage);

            // When the user confirms it
            fireEvent.press(screen.getByText('common.confirm'));

            // Then the page submits no values, because the entries were saved when they were edited
            expect(onSubmit).toHaveBeenCalledWith({});
        });
    });
});
