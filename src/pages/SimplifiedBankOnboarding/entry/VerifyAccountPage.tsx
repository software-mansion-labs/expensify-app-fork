/**
 * The gate for a user whose account is not validated yet. The entry page saved the picked setup type to the draft
 * before it opened this page, so after the code is accepted the submit handler replaces this page with the flow at the
 * position where it resumes. Nothing waits for the validated flag in an effect.
 * It mirrors `DynamicReimbursementAccountVerifyAccountPage` and `VerifyAccountPageBase`.
 */
import Button from '@components/Button';
import FormHelpMessage from '@components/FormHelpMessage';
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import useFlowData from '@pages/SimplifiedBankOnboarding/controller/useFlowData';
import openFlowAtResume from '@pages/SimplifiedBankOnboarding/flows/openFlowAtResume';
import {leaveVerifyAccount} from '@pages/SimplifiedBankOnboarding/navigation/entryNavigation';
import validateUser, {clearValidateUserErrors} from '@pages/SimplifiedBankOnboarding/requests/entry/validateUser';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import useRequestState from '@pages/SimplifiedBankOnboarding/requests/useRequestState';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import CONST from '@src/CONST';
import type SCREENS from '@src/SCREENS';

import React, {useEffect, useState} from 'react';
import {View} from 'react-native';

type VerifyAccountPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.VERIFY_ACCOUNT>;

function VerifyAccountPage({route}: VerifyAccountPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {readData} = useFlowData();
    const {isPending, errors} = useRequestState(REQUEST_NAMES.VALIDATE_USER);
    const [validateCode, setValidateCode] = useState('');

    const policyID = route.params?.policyID;
    const backTo = route.params?.backTo;

    // The error of the last attempt belongs to this page only
    useEffect(
        () => () => {
            clearValidateUserErrors();
        },
        [],
    );

    const updateValidateCode = (code: string) => {
        setValidateCode(code);
        if (!errors) {
            return;
        }
        clearValidateUserErrors();
    };

    // The page replaces itself, so Back from the flow returns to the entry page and not to this form
    const submit = async () => {
        if (isPending || validateCode.trim() === '') {
            return;
        }
        const outcome = await validateUser(validateCode);
        if (outcome.status !== 'succeeded') {
            return;
        }
        openFlowAtResume({data: await readData(), context: {translate, policyID}, backTo, shouldReplace: true});
    };

    return (
        <ScreenWrapper
            testID="SimplifiedBankOnboardingVerifyAccountPage"
            includeSafeAreaPaddingBottom
        >
            <HeaderWithBackButtonAndTitle
                title={translate('contacts.validateAccount')}
                onBackButtonPress={leaveVerifyAccount}
            />
            <ScrollView
                style={styles.flex1}
                contentContainerStyle={styles.flexGrow1}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.mh5, styles.flex1]}>
                    <Text style={styles.mb3}>{translate('contacts.featureRequiresValidate')}</Text>
                    <Text style={[styles.textSupporting, styles.mb5]}>{`The mock server accepts ${SBO_CONST.MOCK.VALID_VALIDATE_CODE}.`}</Text>
                    <TextInput
                        label={translate('common.securityCode')}
                        accessibilityLabel={translate('common.securityCode')}
                        role={CONST.ROLE.PRESENTATION}
                        inputMode={CONST.INPUT_MODE.NUMERIC}
                        maxLength={CONST.VALIDATE_CODE_LENGTH}
                        value={validateCode}
                        onChangeText={updateValidateCode}
                        onSubmitEditing={() => {
                            submit();
                        }}
                        autoFocus
                    />
                    <FormHelpMessage
                        style={styles.mt3}
                        message={getLatestErrorMessage({errors})}
                    />
                </View>
                <Button
                    style={[styles.mh5, styles.mb5]}
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    isLoading={isPending}
                    isDisabled={validateCode.trim() === ''}
                    onPress={submit}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                >
                    <Button.Text>{translate('common.verify')}</Button.Text>
                </Button>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default VerifyAccountPage;
