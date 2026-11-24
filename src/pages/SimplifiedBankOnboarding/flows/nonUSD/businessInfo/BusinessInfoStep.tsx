/**
 * The business step of the NonUSD flow: the legal name, the business type from the picklist of the server, and the
 * confirmation that saves both.
 */
import PushRowWithModal from '@components/PushRowWithModal';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {isValidCompanyName} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {ConfirmationSubPage, FormSubPage, OnboardingStep, PageLoadingIndicator, SingleFieldSubPage, SubPage, SubPageInput, useReadOnOpen} from '@pages/SimplifiedBankOnboarding/core';
import {useNonUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDAnswers';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

import {companyDetailsRequest, picklistsRead} from './businessInfoRequests';

const {BUSINESS_INFO_SUB_PAGES: PAGES} = SBO_CONST.NON_USD;

function BusinessInfoStep() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {companyName, businessType} = useNonUSDAnswers();
    const [picklists] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS);
    useReadOnOpen(picklistsRead);

    const businessTypes = picklists?.picklists?.businessType ?? [];
    const businessTypeName = businessTypes.find((option) => option.id === businessType)?.name ?? businessType;

    return (
        <OnboardingStep
            title={translate('businessInfoStep.businessInfoTitle')}
            wrapperID="SimplifiedBankOnboardingBusinessInfo"
        >
            <SingleFieldSubPage
                name={PAGES.NAME}
                isAnswered={!!companyName}
                inputID={INPUT_IDS.COMPANY_NAME}
                title={translate('businessInfoStep.whatsTheBusinessName')}
                label={translate('businessInfoStep.legalBusinessName')}
                inputMode={CONST.INPUT_MODE.TEXT}
                validate={(value) => (isValidCompanyName(value) ? undefined : 'bankAccount.error.companyName')}
                defaultValue={companyName}
            />
            {picklists?.isLoading ? (
                <SubPage
                    name={PAGES.BUSINESS_TYPE}
                    isAnswered={!!businessType}
                >
                    <PageLoadingIndicator />
                </SubPage>
            ) : (
                <FormSubPage
                    name={PAGES.BUSINESS_TYPE}
                    isAnswered={!!businessType}
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
            )}
            <ConfirmationSubPage
                name={PAGES.CONFIRMATION}
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
        </OnboardingStep>
    );
}

export default BusinessInfoStep;
