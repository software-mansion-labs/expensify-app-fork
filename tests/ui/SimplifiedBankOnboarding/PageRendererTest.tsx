import {fireEvent, render, screen} from '@testing-library/react-native';

import OnyxListItemProvider from '@components/OnyxListItemProvider';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import createPicklistField from '@pages/SimplifiedBankOnboarding/core/form/fields/createPicklistField';
import createTextField from '@pages/SimplifiedBankOnboarding/core/form/fields/createTextField';
import createYesNoField from '@pages/SimplifiedBankOnboarding/core/form/fields/createYesNoField';
import PageRenderer from '@pages/SimplifiedBankOnboarding/core/form/pages/PageRenderer';
import type {CustomPageConfig, PageConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/core/plan/types';

import ONYXKEYS from '@src/ONYXKEYS';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

const {PAGE_NAMES, BENEFICIAL_OWNERS_SUB_PAGES, BANK_INFO_SUB_PAGES, COUNTRY_SUB_PAGES} = SBO_CONST.USD;
const QUESTION = 'Do you own 25% or more?';
const ROUTING_NUMBER = '011401533';
const MASKED_ACCOUNT_NUMBER = 'XXXXXX7890';
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

const bankNumbersPage: PageConfig = {
    kind: 'form',
    id: BANK_INFO_SUB_PAGES.MANUAL,
    title: 'Bank account',
    isComplete: true,
    fields: [createTextField('routingNumber', {label: 'Routing number'}), createTextField('accountNumber', {label: 'Account number', isLocked: true})],
};

const countryPage: PageConfig = {
    kind: 'form',
    id: COUNTRY_SUB_PAGES.CONFIRM_CURRENCY,
    title: 'Confirm the country',
    isComplete: false,
    fields: [createPicklistField('country', {label: 'Country', options: [{value: SBO_CONST.COUNTRY.US, label: 'United States'}], defaultValue: SBO_CONST.COUNTRY.US, isLocked: true})],
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

    describe('a locked field', () => {
        it('submits no value of a text field that the server holds', async () => {
            // Given a page with a routing number that the user may change and an account number that the server holds and
            // shows masked
            const {onSubmit} = await renderPage(bankNumbersPage, {routingNumber: ROUTING_NUMBER, accountNumber: MASKED_ACCOUNT_NUMBER});

            // When the user submits the page as it opened
            fireEvent.press(screen.getByText('common.next'));
            await waitForBatchedUpdatesWithAct();

            // Then only the routing number is submitted, because the masked number would stay in the draft, hide the server
            // value and could be sent later as the real number
            expect(onSubmit).toHaveBeenCalledWith({routingNumber: ROUTING_NUMBER});
        });

        it('submits the shown option of a locked picklist', async () => {
            // Given a country picklist locked to the only country of the flow, which the user has not confirmed yet
            const {onSubmit} = await renderPage(countryPage);

            // When the user confirms the page
            fireEvent.press(screen.getByText('common.next'));
            await waitForBatchedUpdatesWithAct();

            // Then the shown country is submitted, because confirming it is the answer of the page
            expect(onSubmit).toHaveBeenCalledWith({country: SBO_CONST.COUNTRY.US});
        });
    });
});
