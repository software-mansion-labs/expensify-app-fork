import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getRequiredKYBDocuments} from '@libs/BankAccountUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {ReimbursementAccountNavigatorParamList} from '@libs/Navigation/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import React from 'react';
import {View} from 'react-native';
import {transition} from 'xstate';

import type USDPageProps from './types';

import BankInfo from './BankInfo/BankInfo';
import BeneficialOwnersStep from './BeneficialOwnerInfo/BeneficialOwnersStep';
import BusinessInfo from './BusinessInfo/BusinessInfo';
import CompleteVerification from './CompleteVerification/CompleteVerification';
import ConnectBankAccount from './ConnectBankAccount/ConnectBankAccount';
import Country from './Country';
import KYBDocuments from './KYBDocuments';
import RequestorStep from './Requestor/RequestorStep';
import VerifyIdentity from './Requestor/VerifyIdentity/VerifyIdentity';
import usdBankAccountFlowMachine, {USD_BANK_ACCOUNT_FLOW_END} from './usdBankAccountFlowMachine';

const PAGE_NAMES = CONST.BANK_ACCOUNT.PAGE_NAMES;
const BANK_INFO_SUB_PAGES = CONST.BANK_ACCOUNT.BANK_INFO_STEP.SUB_PAGE_NAMES;
const PERSONAL_INFO_SUB_PAGES = CONST.BANK_ACCOUNT.PERSONAL_INFO_STEP.SUB_PAGE_NAMES;
const BUSINESS_INFO_SUB_PAGES = CONST.BANK_ACCOUNT.BUSINESS_INFO_STEP.SUB_PAGE_NAMES;
const BENEFICIAL_OWNERS_SUB_PAGES = CONST.BANK_ACCOUNT.BENEFICIAL_OWNERS_STEP.SUB_PAGE_NAMES;
const COMPLETE_VERIFICATION_SUB_PAGES = CONST.BANK_ACCOUNT.COMPLETE_VERIFICATION_STEP.SUB_PAGE_NAMES;

type PageEntry = {
    pageName: string;
    component: React.ComponentType<USDPageProps>;
    firstSubPage?: string;
    lastSubPage?: string;
};

function CountryPage({onBackButtonPress, onSubmit, stepNames, policyID}: USDPageProps) {
    return (
        <Country
            onBackButtonPress={onBackButtonPress}
            onSubmit={onSubmit}
            stepNames={stepNames ?? CONST.BANK_ACCOUNT.STEP_NAMES}
            policyID={policyID}
        />
    );
}

function BankInfoPage({onBackButtonPress, onSubmit, policyID}: USDPageProps) {
    return (
        <BankInfo
            onBackButtonPress={onBackButtonPress}
            onSubmit={onSubmit}
            policyID={policyID}
        />
    );
}

const countryPage: PageEntry = {pageName: PAGE_NAMES.COUNTRY, component: CountryPage};

const pages: PageEntry[] = [
    countryPage,
    {pageName: PAGE_NAMES.BANK_ACCOUNT, component: BankInfoPage, firstSubPage: BANK_INFO_SUB_PAGES.PLAID, lastSubPage: BANK_INFO_SUB_PAGES.PLAID},
    {
        pageName: PAGE_NAMES.REQUESTOR,
        component: RequestorStep,
        firstSubPage: PERSONAL_INFO_SUB_PAGES.FULL_NAME,
        lastSubPage: CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY,
    },
    {pageName: PAGE_NAMES.VERIFY_IDENTITY, component: VerifyIdentity as React.ComponentType<USDPageProps>},
    {
        pageName: PAGE_NAMES.COMPANY,
        component: BusinessInfo,
        firstSubPage: BUSINESS_INFO_SUB_PAGES.NAME,
        lastSubPage: CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY,
    },
    {
        pageName: PAGE_NAMES.BENEFICIAL_OWNERS,
        component: BeneficialOwnersStep as React.ComponentType<USDPageProps>,
        firstSubPage: BENEFICIAL_OWNERS_SUB_PAGES.IS_USER_UBO,
        lastSubPage: undefined,
    },
    {
        pageName: PAGE_NAMES.ACH_CONTRACT,
        component: CompleteVerification as React.ComponentType<USDPageProps>,
        firstSubPage: COMPLETE_VERIFICATION_SUB_PAGES.CONFIRM_AGREEMENTS,
        lastSubPage: COMPLETE_VERIFICATION_SUB_PAGES.CONFIRM_AGREEMENTS,
    },
    {pageName: PAGE_NAMES.KYB_DOCS, component: KYBDocuments as React.ComponentType<USDPageProps>},
    {pageName: PAGE_NAMES.VALIDATION, component: ConnectBankAccount as React.ComponentType<USDPageProps>},
];

function findPage(pageName: string | undefined) {
    return pages.find((page) => page.pageName === pageName);
}

type USDVerifiedBankAccountFlowPageProps = PlatformStackScreenProps<ReimbursementAccountNavigatorParamList, typeof SCREENS.REIMBURSEMENT_ACCOUNT_USD>;

function USDVerifiedBankAccountFlowPage({route}: USDVerifiedBankAccountFlowPageProps) {
    const styles = useThemeStyles();
    const policyID = route.params?.policyID;
    const currentPage = route.params?.page;
    const currentSubPage = route.params?.subPage;
    const backTo = route.params?.backTo;

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);

    const currentEntry = findPage(currentPage) ?? countryPage;
    const CurrentPage = currentEntry.component;

    /** The state the flow machine moves to from the page in the route: another page, or one of the flow's ends */
    const getTargetAfter = (eventType: 'NEXT' | 'BACK') => {
        const achData = reimbursementAccount?.achData;
        const snapshot = usdBankAccountFlowMachine.resolveState({
            value: currentEntry.pageName,
            context: {
                isOnfidoSetupComplete: !!achData?.isOnfidoSetupComplete,
                isKYBDocumentsRequired: getRequiredKYBDocuments(achData?.verifications?.externalApiResponses).length > 0,
                isPendingValidation: achData?.state === CONST.BANK_ACCOUNT.STATE.PENDING,
            },
        });
        const [{value}] = transition(usdBankAccountFlowMachine, snapshot, {type: eventType});
        return value;
    };

    // The bank-info step renders either the Plaid or the manual variant depending on the setup type the user
    // picked earlier in the flow
    const getPageRoute = (page: PageEntry, fallbackSubPage: string | undefined) => {
        const bankInfoSubStep = reimbursementAccount?.achData?.subStep;
        const subPage = page.pageName === PAGE_NAMES.BANK_ACCOUNT && bankInfoSubStep ? bankInfoSubStep : fallbackSubPage;
        return ROUTES.BANK_ACCOUNT_USD_SETUP.getRoute({policyID, page: page.pageName, subPage, backTo});
    };

    const onSubmit = () => {
        const nextPage = findPage(getTargetAfter('NEXT'));
        if (!nextPage) {
            Navigation.goBack();
            return;
        }
        Navigation.navigate(getPageRoute(nextPage, nextPage.firstSubPage));
    };

    const onBackButtonPress = () => {
        const target = getTargetAfter('BACK');
        if (target === USD_BANK_ACCOUNT_FLOW_END.CLOSED) {
            if (backTo) {
                Navigation.goBack(backTo);
            } else {
                Navigation.dismissModal();
            }
            return;
        }
        const prevPage = findPage(target);
        if (!prevPage) {
            Navigation.goBack();
            return;
        }
        Navigation.goBack(getPageRoute(prevPage, prevPage.lastSubPage));
    };

    return (
        <View style={[styles.flex1, styles.appBG]}>
            <CurrentPage
                onSubmit={onSubmit}
                onBackButtonPress={onBackButtonPress}
                policyID={policyID}
                currentSubPage={currentSubPage}
                stepNames={CONST.BANK_ACCOUNT.STEP_NAMES}
                backTo={backTo}
            />
        </View>
    );
}

USDVerifiedBankAccountFlowPage.displayName = 'USDVerifiedBankAccountFlowPage';

export default USDVerifiedBankAccountFlowPage;
