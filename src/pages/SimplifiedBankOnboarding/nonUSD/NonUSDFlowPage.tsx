/**
 * The page of the NonUSD flow. It works like the USD one, but the list of steps is built on each render: the currency of
 * the workspace removes a step, and the saved signer data decides the sub page that the signer step opens on.
 */
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import getInitialSubPageForSignerInfo from '@pages/SimplifiedBankOnboarding/utils/getInitialSubPageForSignerInfo';
import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import React from 'react';
import {View} from 'react-native';

import type NonUSDPageProps from './types';

import Agreements from './Agreements';
import BankInfo from './BankInfo/BankInfo';
import BeneficialOwnerInfo from './BeneficialOwnerInfo/BeneficialOwnerInfo';
import BusinessInfo from './BusinessInfo/BusinessInfo';
import Country from './Country';
import Docusign from './Docusign';
import Finish from './Finish';
import SignerInfo from './SignerInfo/SignerInfo';

type PageEntry = {
    pageName: string;
    component: React.ComponentType<NonUSDPageProps>;

    /** The sub page to open when the user arrives from the previous step */
    firstSubPage?: string;

    /** The sub page to open when the user comes back from the next step */
    lastSubPage?: string;
};

type NonUSDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP>;

const {PAGE_NAMES, BANK_INFO_SUB_PAGES, BUSINESS_INFO_SUB_PAGES, BENEFICIAL_OWNER_INFO_SUB_PAGES, SIGNER_INFO_SUB_PAGES, STEP_NAMES, DOCUSIGN_REQUIRED_STEP_NAMES} = SBO_CONST.NON_USD;

const allPages: PageEntry[] = [
    {pageName: PAGE_NAMES.COUNTRY, component: Country},
    {pageName: PAGE_NAMES.BANK_INFO, component: BankInfo, firstSubPage: BANK_INFO_SUB_PAGES.BANK_ACCOUNT_DETAILS, lastSubPage: BANK_INFO_SUB_PAGES.CONFIRMATION},
    {pageName: PAGE_NAMES.BUSINESS_INFO, component: BusinessInfo, firstSubPage: BUSINESS_INFO_SUB_PAGES.NAME, lastSubPage: BUSINESS_INFO_SUB_PAGES.CONFIRMATION},
    {
        pageName: PAGE_NAMES.BENEFICIAL_OWNER_INFO,
        component: BeneficialOwnerInfo,
        firstSubPage: BENEFICIAL_OWNER_INFO_SUB_PAGES.IS_USER_BENEFICIAL_OWNER,
        lastSubPage: BENEFICIAL_OWNER_INFO_SUB_PAGES.BENEFICIAL_OWNERS_LIST,
    },
    {pageName: PAGE_NAMES.SIGNER_INFO, component: SignerInfo, firstSubPage: SIGNER_INFO_SUB_PAGES.IS_DIRECTOR, lastSubPage: SIGNER_INFO_SUB_PAGES.CONFIRMATION},
    {pageName: PAGE_NAMES.AGREEMENTS, component: Agreements},
    {pageName: PAGE_NAMES.DOCUSIGN, component: Docusign},
    {pageName: PAGE_NAMES.FINISH, component: Finish},
];

function NonUSDFlowPage({route}: NonUSDFlowPageProps) {
    const styles = useThemeStyles();
    const policyID = route.params?.policyID;
    const currentPage = route.params?.page;
    const currentSubPage = route.params?.subPage;
    const backTo = route.params?.backTo;

    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [workspaces] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES);

    const workspace = policyID ? workspaces?.[policyID] : undefined;
    const currency = workspace?.outputCurrency ?? account?.achData?.currency ?? draft?.currency ?? '';
    const isDocusignStepRequired = requiresDocusignStep(currency);
    const stepNames = isDocusignStepRequired ? DOCUSIGN_REQUIRED_STEP_NAMES : STEP_NAMES;

    const initialSignerSubPage = getInitialSubPageForSignerInfo(account?.achData?.corpay, currency);
    const isAUD = currency === SBO_CONST.CURRENCY.AUD;

    const filteredPages = isDocusignStepRequired ? allPages : allPages.filter((page) => page.pageName !== PAGE_NAMES.DOCUSIGN);
    const pages = filteredPages.map((page) => {
        if (page.pageName !== PAGE_NAMES.SIGNER_INFO) {
            return page;
        }

        // An AUD workspace always ends the signer step waiting for the second director.
        return {...page, firstSubPage: initialSignerSubPage, lastSubPage: isAUD ? SIGNER_INFO_SUB_PAGES.HANG_TIGHT : page.lastSubPage};
    });

    const index = pages.findIndex((page) => page.pageName === currentPage);
    const currentPageIndex = Math.max(index, 0);

    const currentEntry = pages.at(currentPageIndex);
    const CurrentPage = currentEntry?.component ?? Country;

    const goToNextPage = () => {
        const nextIndex = currentPageIndex + 1;
        if (nextIndex >= pages.length) {
            Navigation.goBack();
            return;
        }
        const nextPage = pages.at(nextIndex);
        Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: nextPage?.pageName, subPage: nextPage?.firstSubPage, backTo}));
    };

    const goToPreviousPage = () => {
        const prevIndex = currentPageIndex - 1;
        if (prevIndex < 0) {
            Navigation.goBack();
            return;
        }
        const prevPage = pages.at(prevIndex);
        Navigation.goBack(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: prevPage?.pageName, subPage: prevPage?.lastSubPage, backTo}));
    };

    return (
        <View style={[styles.flex1, styles.appBG]}>
            <CurrentPage
                onSubmit={goToNextPage}
                onBackButtonPress={goToPreviousPage}
                policyID={policyID}
                currency={currency}
                stepNames={stepNames}
                currentSubPage={currentSubPage}
                backTo={backTo}
            />
        </View>
    );
}

export default NonUSDFlowPage;
