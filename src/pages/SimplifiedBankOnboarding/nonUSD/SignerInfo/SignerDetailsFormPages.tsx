/**
 * The form pages of the signer step for a user who is the director. Like `SignerDetailsFormPages` of the real flow, it has
 * its own wrapper and `useSubPage`, and going back from its first page returns to the director question. The name page
 * is skipped for a user who is also an owner, because the owner step already collected the name.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';

import Navigation from '@libs/Navigation/Navigation';

import SubPageRedirectIndicator from '@pages/SimplifiedBankOnboarding/components/SubPageRedirectIndicator';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import {clearErrors} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

import type {SignerDetailsSubPageProps} from './types';

import Confirmation from './subSteps/Confirmation';
import JobTitle from './subSteps/JobTitle';
import Name from './subSteps/Name';

const {PAGE_NAMES, SIGNER_INFO_SUB_PAGES: SUB_PAGE_NAMES} = SBO_CONST.NON_USD;

const pages = [
    {pageName: SUB_PAGE_NAMES.NAME, component: Name},
    {pageName: SUB_PAGE_NAMES.JOB_TITLE, component: JobTitle},
    {pageName: SUB_PAGE_NAMES.CONFIRMATION, component: Confirmation},
];

type SignerDetailsFormPagesProps = {
    /** Goes back to the question whether the user is the director */
    onBackToIsDirector: () => void;

    /** Sends the director request after the confirmation page */
    onFinished: () => void;
    stepNames?: readonly string[];

    /** Position of the step in the step counter of the header */
    startStepIndex?: number;
    policyID?: string;
    backTo?: string;
};

function SignerDetailsFormPages({onBackToIsDirector, onFinished, stepNames, startStepIndex, policyID, backTo}: SignerDetailsFormPagesProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const isUserOwner = account?.achData?.corpay?.ownsMoreThan25Percent ?? draft?.ownsMoreThan25Percent ?? false;
    const skipPages: string[] = isUserOwner ? [SUB_PAGE_NAMES.NAME] : [];

    const buildRoute = (pageName: string, action?: 'edit') =>
        ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.SIGNER_INFO, subPage: pageName, action, backTo});

    const {CurrentPage, isEditing, currentPageName, pageIndex, nextPage, prevPage, moveTo, isRedirecting} = useSubPage<SignerDetailsSubPageProps>({
        pages,
        startFrom: 0,
        onFinished,
        buildRoute,
        skipPages,
    });

    const handleBackButtonPress = () => {
        clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
        if (isEditing) {
            Navigation.goBack(buildRoute(SUB_PAGE_NAMES.CONFIRMATION));
            return;
        }

        // The first page that is shown is not always the first page of the list, so this looks for a shown page before the current one.
        let prevIndex = pageIndex - 1;
        while (prevIndex >= 0 && skipPages.includes(pages.at(prevIndex)?.pageName ?? '')) {
            prevIndex -= 1;
        }
        if (prevIndex < 0) {
            onBackToIsDirector();
            return;
        }
        prevPage();
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingSignerDetails"
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('signerInfoStep.signerInfo')}
            stepNames={stepNames}
            startStepIndex={startStepIndex}
        >
            {isRedirecting ? (
                <SubPageRedirectIndicator />
            ) : (
                <CurrentPage
                    isEditing={isEditing}
                    onNext={nextPage}
                    onMove={moveTo}
                    currentPageName={currentPageName}
                    formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default SignerDetailsFormPages;
