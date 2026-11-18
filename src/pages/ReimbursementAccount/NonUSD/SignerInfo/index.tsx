import DynamicFormFlow from '@components/DynamicForm';
import useDraftPrefill from '@components/DynamicForm/hooks/useDraftPrefill';
import toDynamicFormValues from '@components/DynamicForm/utils/toDynamicFormValues';
import FormHelpMessage from '@components/FormHelpMessage';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import YesNoStep from '@components/SubStepForms/YesNoStep';

import useEnvironment from '@hooks/useEnvironment';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';

import type NonUSDPageProps from '@pages/ReimbursementAccount/NonUSD/types';
import getCurrencyForNonUSDBankAccount from '@pages/ReimbursementAccount/NonUSD/utils/getCurrencyForNonUSDBankAccount';
import getSignerDetailsForm, {getSignerDetailsParams, getSignerDetailsPrefill} from '@pages/ReimbursementAccount/utils/getSignerDetailsForm';

import {askForCorpaySignerInformation, clearReimbursementAccountSaveCorpayOnboardingDirectorInformation, saveCorpayOnboardingDirectorInformation} from '@userActions/BankAccounts';
import {clearErrors, setDraftValues} from '@userActions/FormActions';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';

import {emailSelector} from '@selectors/Session';
import {Str} from 'expensify-common';
import React, {useEffect, useState} from 'react';
import {View} from 'react-native';

import type {EmailSubmitParams} from './EnterEmail';

import EnterEmail from './EnterEmail';
import HangTight from './HangTight';

const {PAGE_NAME, SIGNER_INFO_STEP} = CONST.NON_USD_BANK_ACCOUNT;

const FORM_ID = ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM;
const SUB_PAGE_NAMES = SIGNER_INFO_STEP.SUB_PAGE_NAMES;
const {OWNS_MORE_THAN_25_PERCENT, COMPANY_NAME, SIGNER_FULL_NAME} = INPUT_IDS.ADDITIONAL_DATA.CORPAY;

/** Where this step sits among the steps of the non-USD bank account setup */
const STEP_INDEX = 4;

function SignerInfo({onBackButtonPress, onSubmit, stepNames, currentSubPage, backTo}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {isProduction, environmentURL} = useEnvironment();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [reimbursementAccountDraft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);
    const [currentUserEmail = ''] = useOnyx(ONYXKEYS.SESSION, {selector: emailSelector});
    const policyID = reimbursementAccount?.achData?.policyID;
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);
    const {country, currency} = getCurrencyForNonUSDBankAccount(policy, reimbursementAccountDraft, reimbursementAccount);
    const isUserOwner = reimbursementAccount?.achData?.corpay?.[OWNS_MORE_THAN_25_PERCENT] ?? reimbursementAccountDraft?.[OWNS_MORE_THAN_25_PERCENT] ?? false;
    const schema = getSignerDetailsForm({currency, country, isUserOwner});
    const companyName = reimbursementAccount?.achData?.corpay?.[COMPANY_NAME] ?? reimbursementAccountDraft?.[COMPANY_NAME] ?? '';
    const bankAccountID = reimbursementAccount?.achData?.bankAccountID ?? CONST.DEFAULT_NUMBER_ID;
    const isUserDirector = reimbursementAccountDraft?.isUserDirector ?? false;
    const shouldSendOnlySecondSignerEmail = currency === CONST.CURRENCY.AUD && isUserDirector;
    const [showNoPolicyError, setShowNoPolicyError] = useState(false);

    // Corpay does not accept emails with a "+" character and will not let us connect account at the end of whole flow
    const signerEmail = !isProduction ? Str.replaceAll(currentUserEmail, '+', '') : currentUserEmail;

    const savedCorpay = reimbursementAccount?.achData?.corpay;
    // A saved name means the user said earlier that they are a director
    const isPrefillPending = useDraftPrefill(FORM_ID, {...getSignerDetailsPrefill(savedCorpay), isUserDirector: savedCorpay?.[SIGNER_FULL_NAME] ? true : undefined});
    const buildRoute = (subPage: string, action?: 'edit') => ROUTES.BANK_ACCOUNT_NON_USD_SETUP.getRoute({policyID, page: PAGE_NAME.SIGNER_INFO, subPage, action, backTo});

    // A failed request does not always come back with an error, so the step only moves on once the details are saved
    const markSubmitting = useReimbursementAccountSubmitCallback(() => {
        if (!reimbursementAccount?.isSuccess) {
            return;
        }
        if (currency === CONST.CURRENCY.AUD) {
            Navigation.navigate(buildRoute(SUB_PAGE_NAMES.ENTER_EMAIL));
        } else {
            onSubmit();
        }
        clearReimbursementAccountSaveCorpayOnboardingDirectorInformation();
    }, 'isSavingCorpayOnboardingDirectorInformation');

    useEffect(() => {
        if (reimbursementAccount?.errors || reimbursementAccount?.isAskingForCorpaySignerInformation || !reimbursementAccount?.isAskingForCorpaySignerInformationSuccess) {
            return;
        }

        if (reimbursementAccount?.isAskingForCorpaySignerInformationSuccess) {
            Navigation.navigate(ROUTES.BANK_ACCOUNT_NON_USD_SETUP.getRoute({policyID, page: PAGE_NAME.SIGNER_INFO, subPage: SUB_PAGE_NAMES.HANG_TIGHT, backTo}));
        }
    }, [reimbursementAccount?.errors, reimbursementAccount?.isAskingForCorpaySignerInformation, reimbursementAccount?.isAskingForCorpaySignerInformationSuccess, policyID, backTo]);

    const handleEmailSubmit = (values: EmailSubmitParams) => {
        const params = shouldSendOnlySecondSignerEmail
            ? {
                  secondSignerEmail: values.secondSignerEmail,
                  policyID: String(policyID),
                  bankAccountID,
              }
            : {
                  signerEmail: values.signerEmail,
                  secondSignerEmail: values.secondSignerEmail,
                  policyID: String(policyID),
                  bankAccountID,
              };

        askForCorpaySignerInformation(params);
    };

    const handleIsDirectorSelected = (value: boolean) => {
        if (!policyID && !value) {
            setShowNoPolicyError(true);
            return;
        }
        setDraftValues(FORM_ID, {isUserDirector: value});
        const firstFormPage = schema.pages.at(0)?.key ?? CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY;
        Navigation.navigate(buildRoute(value ? firstFormPage : SUB_PAGE_NAMES.ENTER_EMAIL));
    };

    const handleBackButtonPress = () => {
        if (currentSubPage === SUB_PAGE_NAMES.ENTER_EMAIL) {
            clearErrors(FORM_ID);
            Navigation.goBack(buildRoute(isUserDirector ? CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY : SUB_PAGE_NAMES.IS_DIRECTOR));
        } else if (currentSubPage === SUB_PAGE_NAMES.HANG_TIGHT) {
            Navigation.dismissModal();
        } else {
            onBackButtonPress();
        }
    };

    // The director question, the emails of the other signers and the wait for them lead out of the form, so they stay pages of their own
    if (currentSubPage !== SUB_PAGE_NAMES.IS_DIRECTOR && currentSubPage !== SUB_PAGE_NAMES.ENTER_EMAIL && currentSubPage !== SUB_PAGE_NAMES.HANG_TIGHT) {
        return (
            <DynamicFormFlow
                schema={schema}
                formID={FORM_ID}
                testID="SignerInfo"
                headerTitle={translate('signerInfoStep.signerInfo')}
                confirmationTitle={translate('signerInfoStep.letsDoubleCheck')}
                parentSteps={{names: stepNames ?? CONST.NON_USD_BANK_ACCOUNT.STEP_NAMES, index: STEP_INDEX}}
                buildRoute={buildRoute}
                onBack={() => {
                    clearErrors(FORM_ID);
                    Navigation.goBack(buildRoute(SUB_PAGE_NAMES.IS_DIRECTOR));
                }}
                onSubmit={(answers) => {
                    const {signerDetails, signerFiles} = getSignerDetailsParams(answers, signerEmail, isUserOwner ? toDynamicFormValues(reimbursementAccountDraft) : undefined);
                    saveCorpayOnboardingDirectorInformation({inputs: JSON.stringify(signerDetails), ...signerFiles, bankAccountID});
                    markSubmitting();
                }}
                maxFileSize={CONST.CORPAY_DOCUMENT.MAX_FILE_SIZE}
                isLoading={isPrefillPending}
                isSubmitting={!!reimbursementAccount?.isSavingCorpayOnboardingDirectorInformation}
                submitError={getLatestErrorMessage(reimbursementAccount)}
            />
        );
    }

    return (
        <InteractiveStepWrapper
            wrapperID="SignerInfo"
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('signerInfoStep.signerInfo')}
            stepNames={stepNames}
            startStepIndex={STEP_INDEX}
        >
            {currentSubPage === SUB_PAGE_NAMES.IS_DIRECTOR && (
                <YesNoStep
                    title={translate('signerInfoStep.areYouDirector', companyName)}
                    description={translate('signerInfoStep.regulationRequiresUs')}
                    defaultValue={isUserDirector}
                    onSelectedValue={handleIsDirectorSelected}
                    onValueChange={() => setShowNoPolicyError(false)}
                    submitFlexEnabled={!showNoPolicyError}
                >
                    {showNoPolicyError && (
                        <View style={[styles.flex1, styles.justifyContentEnd, styles.ph5]}>
                            <FormHelpMessage
                                style={styles.mt3}
                                isError
                                shouldRenderMessageAsHTML
                                message={translate('countryStep.error.connectToWorkspace', `${environmentURL}/${ROUTES.WORKSPACES_LIST.getRoute()}`)}
                            />
                        </View>
                    )}
                </YesNoStep>
            )}
            {currentSubPage === SUB_PAGE_NAMES.ENTER_EMAIL && (
                <EnterEmail
                    onSubmit={handleEmailSubmit}
                    isUserDirector={isUserDirector}
                    isLoading={reimbursementAccount?.isAskingForCorpaySignerInformation}
                />
            )}
            {currentSubPage === SUB_PAGE_NAMES.HANG_TIGHT && (
                <HangTight
                    policyID={policyID}
                    bankAccountID={bankAccountID}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default SignerInfo;
