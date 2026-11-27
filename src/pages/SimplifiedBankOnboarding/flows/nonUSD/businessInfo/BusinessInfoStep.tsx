/**
 * The business step of the NonUSD flow: the legal name, the business type from the picklist of the server, and the
 * confirmation that saves both.
 */
import PushRowWithModal from '@components/PushRowWithModal';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {isValidCompanyName} from '@libs/ValidationUtils';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import {ConfirmationSubPage, FormSubPage, OnboardingStep, PageLoadingIndicator, SingleFieldSubPage, SubPageInput, useReadOnOpen, useFlowData} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

import PAGES from './businessInfoPages';
import {companyDetailsRequest, picklistsRead} from './businessInfoRequests';
import getBusinessInfoAnswers from './getBusinessInfoAnswers';

function BusinessInfoStep() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {companyName, businessType} = getBusinessInfoAnswers(useFlowData());
    const [picklists] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS);
    const {isPending, hasFailed} = useReadOnOpen(picklistsRead);

    const businessTypes = picklists?.picklists?.businessType ?? [];
    const businessTypeName = businessTypes.find((option) => option.id === businessType)?.name ?? businessType;

    if (hasFailed) {
        return <NotFoundPage />;
    }

    return (
        <OnboardingStep
            title={translate('businessInfoStep.businessInfoTitle')}
            wrapperID="SimplifiedBankOnboardingBusinessInfo"
            pages={[
                {
                    name: PAGES.NAME,
                    isAnswered: !!companyName,
                    content: (
                        <SingleFieldSubPage
                            inputID={INPUT_IDS.COMPANY_NAME}
                            title={translate('businessInfoStep.whatsTheBusinessName')}
                            label={translate('businessInfoStep.legalBusinessName')}
                            inputMode={CONST.INPUT_MODE.TEXT}
                            validate={(value) => (isValidCompanyName(value) ? undefined : 'bankAccount.error.companyName')}
                            defaultValue={companyName}
                        />
                    ),
                },
                {
                    name: PAGES.BUSINESS_TYPE,
                    isAnswered: !!businessType,
                    content:
                        isPending || !picklists?.picklists ? (
                            <PageLoadingIndicator />
                        ) : (
                            <FormSubPage
                                title={translate('businessInfoStep.whatTypeOfBusinessIsIt')}
                                inputIDs={[INPUT_IDS.BUSINESS_TYPE]}
                            >
                                <View style={[styles.mhn5, styles.mt3]}>
                                    <SubPageInput
                                        InputComponent={PushRowWithModal}
                                        inputID={INPUT_IDS.BUSINESS_TYPE}
                                        optionsList={Object.fromEntries(businessTypes.map((option) => [option.id, option.name]))}
                                        description={translate('businessInfoStep.businessType')}
                                        modalHeaderTitle={translate('businessInfoStep.selectBusinessType')}
                                        searchInputTitle={translate('businessInfoStep.findBusinessType')}
                                        defaultValue={businessType}
                                    />
                                </View>
                            </FormSubPage>
                        ),
                },
                {
                    name: PAGES.CONFIRMATION,
                    content: (
                        <ConfirmationSubPage
                            title={translate('businessInfoStep.letsDoubleCheck')}
                            request={companyDetailsRequest}
                            rows={[
                                {
                                    label: translate('businessInfoStep.legalBusinessName'),
                                    value: companyName,
                                    page: PAGES.NAME,
                                },
                                {
                                    label: translate('businessInfoStep.businessType'),
                                    value: businessTypeName,
                                    page: PAGES.BUSINESS_TYPE,
                                },
                            ]}
                        />
                    ),
                },
            ]}
        />
    );
}

export default BusinessInfoStep;
