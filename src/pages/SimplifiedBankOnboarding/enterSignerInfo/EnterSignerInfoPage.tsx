/**
 * The page that an invited director opens from the email. It mirrors `ReimbursementAccount/EnterSignerInfo`: a separate
 * form with its own draft, the same signer sub pages as the onboarding, and the same director request, which this page
 * follows by its own request ID. In the lab the signer step opens it with a mock button.
 */
import Button from '@components/Button';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {saveOnboardingDirectorInformation} from '@pages/SimplifiedBankOnboarding/actions/GlobalBankAccount';
import SubPageRedirectIndicator from '@pages/SimplifiedBankOnboarding/components/SubPageRedirectIndicator';
import Confirmation from '@pages/SimplifiedBankOnboarding/nonUSD/SignerInfo/subSteps/Confirmation';
import JobTitle from '@pages/SimplifiedBankOnboarding/nonUSD/SignerInfo/subSteps/JobTitle';
import Name from '@pages/SimplifiedBankOnboarding/nonUSD/SignerInfo/subSteps/Name';
import type {SignerDetailsSubPageProps} from '@pages/SimplifiedBankOnboarding/nonUSD/SignerInfo/types';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import {clearDraftValues, clearErrors} from '@userActions/FormActions';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import React, {useEffect} from 'react';
import {View} from 'react-native';

type EnterSignerInfoPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTER_SIGNER_INFO>;

const SUB_PAGE_NAMES = SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES;

const pages = [
    {pageName: SUB_PAGE_NAMES.NAME, component: Name},
    {pageName: SUB_PAGE_NAMES.JOB_TITLE, component: JobTitle},
    {pageName: SUB_PAGE_NAMES.CONFIRMATION, component: Confirmation},
];

function EnterSignerInfoPage({route}: EnterSignerInfoPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const policyID = route.params?.policyID;
    const bankAccountID = Number(route.params?.bankAccountID);
    const isCompleted = route.params?.isCompleted === 'true';

    const [signerFormDraft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT);

    const {send, isPending, errorMessage} = useStepRequest({
        onSuccess: () => {
            clearDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM);
            Navigation.goBack();
        },
    });

    // The invited director writes to a form of their own, so the request leaves the onboarding draft as it is.
    const directorInformation = {signerFullName: signerFormDraft?.signerFullName ?? '', signerJobTitle: signerFormDraft?.signerJobTitle ?? ''};

    const submit = () => {
        send((requestID) => saveOnboardingDirectorInformation(requestID, {policyID, bankAccountID}, directorInformation, []));
    };

    const buildRoute = (pageName: string, action?: 'edit') =>
        ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTER_SIGNER_INFO.getRoute({policyID, bankAccountID, isCompleted, subPage: pageName, action});

    const {CurrentPage, isEditing, pageIndex, nextPage, prevPage, moveTo, isRedirecting} = useSubPage<SignerDetailsSubPageProps>({
        pages,
        startFrom: 0,
        onFinished: submit,
        buildRoute,
    });

    useEffect(() => {
        clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM);
    }, []);

    const handleBackButtonPress = () => {
        clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM);
        if (isEditing) {
            Navigation.goBack(buildRoute(SUB_PAGE_NAMES.CONFIRMATION));
            return;
        }
        if (pageIndex > 0) {
            prevPage();
            return;
        }
        Navigation.goBack();
    };

    if (isCompleted) {
        return (
            <InteractiveStepWrapper
                wrapperID="SimplifiedBankOnboardingEnterSignerInfo"
                handleBackButtonPress={() => Navigation.goBack()}
                headerTitle={translate('signerInfoStep.signerInfo')}
            >
                <View style={[styles.mh5, styles.gap3]}>
                    <Text style={styles.textHeadlineLineHeightXXL}>{translate('workspace.bankAccount.allSet')}</Text>
                    <Button
                        onPress={() => Navigation.goBack()}
                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                    >
                        <Button.Text>{translate('common.close')}</Button.Text>
                    </Button>
                </View>
            </InteractiveStepWrapper>
        );
    }

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingEnterSignerInfo"
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('signerInfoStep.signerInfo')}
        >
            {isRedirecting ? (
                <SubPageRedirectIndicator />
            ) : (
                <CurrentPage
                    isEditing={isEditing}
                    onNext={nextPage}
                    onMove={moveTo}
                    formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM}
                    values={directorInformation}
                    isNamePageSkipped={false}
                    isRequestPending={isPending}
                    requestErrorMessage={errorMessage}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default EnterSignerInfoPage;
