/**
 * The page of the USD flow. The steps are a static list, the URL says which one is open, and going forward or back means
 * finding the neighbor in the list, with hand-written rules for the steps that the account data lets the user skip.
 */
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import React from 'react';
import {View} from 'react-native';

import type USDPageProps from './types';

import BankInfo from './BankInfo/BankInfo';
import BeneficialOwners from './BeneficialOwners/BeneficialOwners';
import BusinessInfo from './BusinessInfo/BusinessInfo';
import CompleteVerification from './CompleteVerification';
import ConnectBankAccount from './ConnectBankAccount/ConnectBankAccount';
import Country from './Country';
import KYBDocuments from './KYBDocuments';
import PersonalInfo from './PersonalInfo/PersonalInfo';
import VerifyIdentity from './VerifyIdentity';

type PageEntry = {
    pageName: string;
    component: React.ComponentType<USDPageProps>;

    /** The sub page to open when the user arrives from the previous step */
    firstSubPage?: string;

    /** The sub page to open when the user comes back from the next step */
    lastSubPage?: string;
};

type USDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP>;

const {PAGE_NAMES, BANK_INFO_SUB_PAGES, PERSONAL_INFO_SUB_PAGES, BUSINESS_INFO_SUB_PAGES, BENEFICIAL_OWNERS_SUB_PAGES, COMPLETE_VERIFICATION_SUB_PAGES, STEP_NAMES} = SBO_CONST.USD;

const pages: PageEntry[] = [
    {pageName: PAGE_NAMES.COUNTRY, component: Country},
    {pageName: PAGE_NAMES.BANK_ACCOUNT, component: BankInfo, firstSubPage: BANK_INFO_SUB_PAGES.PLAID, lastSubPage: BANK_INFO_SUB_PAGES.PLAID},
    {pageName: PAGE_NAMES.REQUESTOR, component: PersonalInfo, firstSubPage: PERSONAL_INFO_SUB_PAGES.FULL_NAME, lastSubPage: PERSONAL_INFO_SUB_PAGES.CONFIRMATION},
    {pageName: PAGE_NAMES.VERIFY_IDENTITY, component: VerifyIdentity},
    {pageName: PAGE_NAMES.COMPANY, component: BusinessInfo, firstSubPage: BUSINESS_INFO_SUB_PAGES.NAME, lastSubPage: BUSINESS_INFO_SUB_PAGES.CONFIRMATION},
    {pageName: PAGE_NAMES.BENEFICIAL_OWNERS, component: BeneficialOwners, firstSubPage: BENEFICIAL_OWNERS_SUB_PAGES.IS_USER_UBO, lastSubPage: undefined},
    {
        pageName: PAGE_NAMES.ACH_CONTRACT,
        component: CompleteVerification,
        firstSubPage: COMPLETE_VERIFICATION_SUB_PAGES.CONFIRM_AGREEMENTS,
        lastSubPage: COMPLETE_VERIFICATION_SUB_PAGES.CONFIRM_AGREEMENTS,
    },
    {pageName: PAGE_NAMES.KYB_DOCS, component: KYBDocuments},
    {pageName: PAGE_NAMES.VALIDATION, component: ConnectBankAccount},
];

function USDFlowPage({route}: USDFlowPageProps) {
    const styles = useThemeStyles();
    const policyID = route.params?.policyID;
    const currentPage = route.params?.page;
    const currentSubPage = route.params?.subPage;
    const backTo = route.params?.backTo;

    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);

    const isOnfidoSetupComplete = !!account?.achData?.isOnfidoSetupComplete;
    const isKYBDocumentsRequired = (account?.achData?.requiredKYBDocuments?.length ?? 0) > 0;

    const index = pages.findIndex((page) => page.pageName === currentPage);
    const currentPageIndex = Math.max(index, 0);

    const currentEntry = pages.at(currentPageIndex);
    const CurrentPage = currentEntry?.component ?? Country;

    const shouldSkipVerifyIdentity = (pageName?: string) => pageName === PAGE_NAMES.VERIFY_IDENTITY && isOnfidoSetupComplete;

    // The documents page only exists when the checks of the server asked for documents.
    const shouldSkipKYBDocs = (pageName?: string) => pageName === PAGE_NAMES.KYB_DOCS && !isKYBDocumentsRequired;

    // The bank step shows the Plaid or the manual variant, depending on the setup type that the user picked on the entry page.
    const getSubPageForNavigation = (page: PageEntry | undefined, fallbackSubPage: string | undefined) => {
        const bankInfoSubStep = account?.achData?.subStep;
        if (page?.pageName === PAGE_NAMES.BANK_ACCOUNT && bankInfoSubStep) {
            return bankInfoSubStep;
        }
        return fallbackSubPage;
    };

    const goToNextPage = () => {
        let nextIndex = currentPageIndex + 1;
        if (shouldSkipVerifyIdentity(pages.at(nextIndex)?.pageName)) {
            nextIndex += 1;
        }
        if (shouldSkipKYBDocs(pages.at(nextIndex)?.pageName)) {
            nextIndex += 1;
        }
        if (nextIndex >= pages.length) {
            Navigation.goBack();
            return;
        }
        const nextPage = pages.at(nextIndex);
        Navigation.navigate(
            ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page: nextPage?.pageName, subPage: getSubPageForNavigation(nextPage, nextPage?.firstSubPage), backTo}),
        );
    };

    const goToPreviousPage = () => {
        // A pending account was already submitted, and the entry page redirects it straight back here, so the only way out is to leave the flow.
        if (currentEntry?.pageName === PAGE_NAMES.VALIDATION && account?.achData?.state === SBO_CONST.STATE.PENDING) {
            if (backTo) {
                Navigation.goBack(backTo);
            } else {
                Navigation.dismissModal();
            }
            return;
        }

        let prevIndex = currentPageIndex - 1;
        if (shouldSkipKYBDocs(pages.at(prevIndex)?.pageName)) {
            prevIndex -= 1;
        }
        if (shouldSkipVerifyIdentity(pages.at(prevIndex)?.pageName)) {
            prevIndex -= 1;
        }
        if (prevIndex < 0) {
            Navigation.goBack();
            return;
        }
        const prevPage = pages.at(prevIndex);
        Navigation.goBack(
            ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page: prevPage?.pageName, subPage: getSubPageForNavigation(prevPage, prevPage?.lastSubPage), backTo}),
        );
    };

    return (
        <View style={[styles.flex1, styles.appBG]}>
            <CurrentPage
                onSubmit={goToNextPage}
                onBackButtonPress={goToPreviousPage}
                policyID={policyID}
                currentSubPage={currentSubPage}
                stepNames={STEP_NAMES}
                backTo={backTo}
            />
        </View>
    );
}

export default USDFlowPage;
