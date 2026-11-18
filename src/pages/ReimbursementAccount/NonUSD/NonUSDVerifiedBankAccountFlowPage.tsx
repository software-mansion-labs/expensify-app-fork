import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {ReimbursementAccountNavigatorParamList} from '@libs/Navigation/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';

import React from 'react';
import {View} from 'react-native';
import {transition} from 'xstate';

import type NonUSDPageProps from './types';

import Agreements from './Agreements/Agreements';
import BankInfo from './BankInfo/BankInfo';
import BeneficialOwnerInfo from './BeneficialOwnerInfo/BeneficialOwnerInfo';
import BusinessInfo from './BusinessInfo/BusinessInfo';
import Country from './Country';
import Docusign from './Docusign';
import Finish from './Finish';
import nonUSDBankAccountFlowMachine from './nonUSDBankAccountFlowMachine';
import SignerInfo from './SignerInfo';
import getInitialSubPageForSignerInfoStep from './utils/getInitialSubPageForSignerInfoStep';
import requiresDocusignStep from './utils/requiresDocusignStep';

const PAGE_NAME = CONST.NON_USD_BANK_ACCOUNT.PAGE_NAME;
const BANK_INFO_SUB_PAGES = CONST.NON_USD_BANK_ACCOUNT.BANK_INFO_STEP.SUB_PAGE_NAMES;
const BUSINESS_INFO_SUB_PAGES = CONST.NON_USD_BANK_ACCOUNT.BUSINESS_INFO_STEP.SUB_PAGE_NAMES;
const BENEFICIAL_OWNER_INFO_SUB_PAGES = CONST.NON_USD_BANK_ACCOUNT.BENEFICIAL_OWNER_INFO_STEP.SUB_PAGE_NAMES;
const SIGNER_INFO_SUB_PAGES = CONST.NON_USD_BANK_ACCOUNT.SIGNER_INFO_STEP.SUB_PAGE_NAMES;
const AGREEMENTS_SUB_PAGES = CONST.NON_USD_BANK_ACCOUNT.AGREEMENTS_STEP.SUB_PAGE_NAMES;

type PageEntry = {
    pageName: string;
    component: React.ComponentType<NonUSDPageProps>;
    firstSubPage?: string;
    lastSubPage?: string;
};

const countryPage: PageEntry = {pageName: PAGE_NAME.CURRENCY_AND_COUNTRY, component: Country};

const allPages: PageEntry[] = [
    countryPage,
    {pageName: PAGE_NAME.BANK_INFO, component: BankInfo, firstSubPage: BANK_INFO_SUB_PAGES.BANK_ACCOUNT_DETAILS, lastSubPage: CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY},
    {pageName: PAGE_NAME.BUSINESS_INFO, component: BusinessInfo, firstSubPage: BUSINESS_INFO_SUB_PAGES.NAME, lastSubPage: CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY},
    {
        pageName: PAGE_NAME.BENEFICIAL_OWNER_INFO,
        component: BeneficialOwnerInfo,
        firstSubPage: BENEFICIAL_OWNER_INFO_SUB_PAGES.IS_USER_BENEFICIAL_OWNER,
        lastSubPage: CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY,
    },
    {pageName: PAGE_NAME.SIGNER_INFO, component: SignerInfo, firstSubPage: SIGNER_INFO_SUB_PAGES.IS_DIRECTOR, lastSubPage: SIGNER_INFO_SUB_PAGES.CONFIRMATION},
    {pageName: PAGE_NAME.AGREEMENTS, component: Agreements, firstSubPage: AGREEMENTS_SUB_PAGES.CONFIRM_AGREEMENTS, lastSubPage: AGREEMENTS_SUB_PAGES.CONFIRM_AGREEMENTS},
    {pageName: PAGE_NAME.DOCUSIGN, component: Docusign},
    {pageName: PAGE_NAME.FINISH, component: Finish},
];

const {SIGNER_EMAIL, SIGNER_FULL_NAME, SECOND_SIGNER_EMAIL} = INPUT_IDS.ADDITIONAL_DATA.CORPAY;

type NonUSDVerifiedBankAccountFlowPageProps = PlatformStackScreenProps<ReimbursementAccountNavigatorParamList, typeof SCREENS.REIMBURSEMENT_ACCOUNT_NON_USD>;

function NonUSDVerifiedBankAccountFlowPage({route}: NonUSDVerifiedBankAccountFlowPageProps) {
    const styles = useThemeStyles();
    const policyID = route.params?.policyID;
    const currentPage = route.params?.page;
    const currentSubPage = route.params?.subPage;
    const backTo = route.params?.backTo;

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [reimbursementAccountDraft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);
    const isComingFromExpensifyCard = reimbursementAccountDraft?.isComingFromExpensifyCard;

    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);
    const currency = policy?.outputCurrency ?? reimbursementAccountDraft?.currency ?? CONST.BBA_COUNTRY_CURRENCY_MAP[reimbursementAccount?.achData?.country ?? ''] ?? '';
    const isDocusignStepRequired = requiresDocusignStep(currency);
    const stepNames = isDocusignStepRequired ? CONST.NON_USD_BANK_ACCOUNT.DOCUSIGN_REQUIRED_STEP_NAMES : CONST.NON_USD_BANK_ACCOUNT.STEP_NAMES;

    const savedSignerEmail = reimbursementAccount?.achData?.corpay?.[SIGNER_EMAIL];
    const savedSignerFullName = reimbursementAccount?.achData?.corpay?.[SIGNER_FULL_NAME];
    const savedSecondSignerEmail = reimbursementAccount?.achData?.corpay?.[SECOND_SIGNER_EMAIL];

    const initialSignerSubPage = getInitialSubPageForSignerInfoStep(savedSignerEmail, savedSignerFullName, savedSecondSignerEmail, currency);

    const isAUD = currency === CONST.CURRENCY.AUD;
    const pages = allPages.map((page) => {
        if (page.pageName !== PAGE_NAME.SIGNER_INFO) {
            return page;
        }
        return {
            ...page,
            firstSubPage: initialSignerSubPage,
            ...(isAUD
                ? {
                      lastSubPage: SIGNER_INFO_SUB_PAGES.HANG_TIGHT,
                  }
                : {}),
        };
    });

    const findPage = (pageName: string | undefined) => pages.find((page) => page.pageName === pageName);

    const currentEntry = findPage(currentPage) ?? countryPage;
    const CurrentPage = currentEntry.component;

    /** The page the flow machine moves to from the page in the route, or nothing when the flow ends */
    const getPageAfter = (eventType: 'NEXT' | 'BACK') => {
        const snapshot = nonUSDBankAccountFlowMachine.resolveState({value: currentEntry.pageName, context: {isDocusignStepRequired}});
        const [{value}] = transition(nonUSDBankAccountFlowMachine, snapshot, {type: eventType});
        return findPage(value);
    };

    const onSubmit = () => {
        const nextPage = getPageAfter('NEXT');
        if (!nextPage) {
            Navigation.goBack();
            return;
        }
        Navigation.navigate(ROUTES.BANK_ACCOUNT_NON_USD_SETUP.getRoute({policyID, page: nextPage.pageName, subPage: nextPage.firstSubPage, backTo}));
    };

    const onBackButtonPress = () => {
        const prevPage = getPageAfter('BACK');
        if (!prevPage) {
            Navigation.goBack();
            return;
        }
        Navigation.goBack(ROUTES.BANK_ACCOUNT_NON_USD_SETUP.getRoute({policyID, page: prevPage.pageName, subPage: prevPage.lastSubPage, backTo}));
    };

    return (
        <View style={[styles.flex1, styles.appBG]}>
            <CurrentPage
                onSubmit={onSubmit}
                onBackButtonPress={onBackButtonPress}
                policyID={policyID}
                currency={currency}
                stepNames={stepNames}
                currentSubPage={currentSubPage}
                isComingFromExpensifyCard={isComingFromExpensifyCard}
                backTo={backTo}
            />
        </View>
    );
}

NonUSDVerifiedBankAccountFlowPage.displayName = 'NonUSDVerifiedBankAccountFlowPage';

export default NonUSDVerifiedBankAccountFlowPage;
