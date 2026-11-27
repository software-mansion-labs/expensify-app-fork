import {render, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {NonUSDFlowPage} from '@pages/SimplifiedBankOnboarding';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {clearRequestState} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import PAGES from '@pages/SimplifiedBankOnboarding/flows/nonUSD/businessInfo/businessInfoPages';
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';
import {BUSINESS_TYPES} from '@pages/SimplifiedBankOnboarding/mockBackend/serverCatalog';

import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';
import type {OnyxData} from '@src/types/onyx/Request';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';
import type {OnyxKey} from 'react-native-onyx';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    useRoute: () => ({key: 'current-route', name: 'CurrentScreen'}),
    useNavigation: () => ({
        getState: () => ({routes: []}),
        isFocused: () => true,
        addListener: () => () => {},
    }),
    useNavigationState: <TResult,>(selector: (state: {routes: []}) => TResult) => selector({routes: []}),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    dismissModal: jest.fn(),
}));

jest.mock('@pages/SimplifiedBankOnboarding/core/accountRead/openOnboardingPage', () => ({
    __esModule: true,
    default: jest.fn(() => Promise.resolve({status: 'succeeded'})),
    getAccountLoadingData: jest.fn(() => ({})),
}));

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({
    read: jest.fn(),
    write: jest.fn(),
}));

jest.mock('@pages/ErrorPage/NotFoundPage', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return () => <RN.Text>not found</RN.Text>;
});

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack. The stand-in renders the content of the step.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({children}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => <RN.View>{children}</RN.View>;
});

type NonUSDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP>;

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the page never reads navigation, so an empty object stands in for the prop that the navigator gives
const navigation = {} as NonUSDFlowPageProps['navigation'];

const POLICY_ID = '1';

type ServerAnswer = 'success' | 'failure';

/** Applies the data of a picklists read the way the mock API does: the server merges the key, then the status data follows */
function answerReads(answer: ServerAnswer) {
    jest.mocked(read).mockImplementation((_command, _params, onyxData: OnyxData<OnyxKey> = {}) => {
        const serverUpdate = answer === 'success' ? Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS, {picklists: {businessType: BUSINESS_TYPES}}) : Promise.resolve();
        Onyx.update(onyxData.optimisticData ?? [])
            .then(() => serverUpdate)
            .then(() => Onyx.update(answer === 'success' ? (onyxData.successData ?? []) : (onyxData.failureData ?? [])))
            .then(() => Onyx.update(onyxData.finallyData ?? []));
    });
}

/** A EUR workspace whose account was read for Germany, so the gate of the flow shows the step without a read */
async function setUpAccount() {
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
        achData: {
            policyID: POLICY_ID,
            bankAccountID: 5,
            country: SBO_CONST.COUNTRY.DE,
        },
    });
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {
        [POLICY_ID]: {
            id: POLICY_ID,
            name: 'Workspace',
            outputCurrency: SBO_CONST.CURRENCY.EUR,
            role: SBO_CONST.WORKSPACE_ROLE.ADMIN,
        },
    });
    await waitForBatchedUpdatesWithAct();
}

async function renderBusinessTypePage() {
    render(
        <OnyxListItemProvider>
            <NavigationContainer>
                <NonUSDFlowPage
                    route={{
                        key: 'nonUSD',
                        name: SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP,
                        params: {
                            policyID: POLICY_ID,
                            page: SBO_CONST.NON_USD.PAGE_NAMES.BUSINESS_INFO,
                            subPage: PAGES.BUSINESS_TYPE,
                        },
                    }}
                    navigation={navigation}
                />
            </NavigationContainer>
        </OnyxListItemProvider>,
    );
    await waitForBatchedUpdatesWithAct();
}

describe('NonUSD BusinessInfoStep', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(read).mockReset();
        await clearRequestState();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    afterAll(() => clearRequestState());

    it('reads the picklists and shows the business type input once they arrive', async () => {
        // Given a server that answers the picklists read
        answerReads('success');
        await setUpAccount();

        // When the business type page opens
        await renderBusinessTypePage();

        // Then the picklists of the country are read and the business type input replaces the loader
        expect(read).toHaveBeenCalledWith(READ_COMMANDS.GET_ONBOARDING_FIELDS, {countryISO: SBO_CONST.COUNTRY.DE}, expect.anything());
        expect(screen.getByText('businessInfoStep.businessType')).toBeOnTheScreen();
        expect(screen.queryByText('not found')).not.toBeOnTheScreen();
    });

    it('shows the not found page when the server cannot send the picklists', async () => {
        // Given a server that fails the picklists read
        answerReads('failure');
        await setUpAccount();

        // When the business type page opens
        await renderBusinessTypePage();

        // Then the user sees the not found page, because an empty picker would let the step go on without a business type
        expect(screen.getByText('not found')).toBeOnTheScreen();
        expect(screen.queryByText('businessInfoStep.businessType')).not.toBeOnTheScreen();
    });
});
