/**
 * The gate for a user whose account is not validated yet. The setup options send the user here with the picked option
 * stored in Onyx. After the code is accepted, this page replaces itself with the first step of the flow, and the setup
 * options that are mounted beneath prepare the data for the stored option.
 * It mirrors `DynamicReimbursementAccountVerifyAccountPage` and `VerifyAccountPageBase`.
 */
import Button from '@components/Button';
import FormHelpMessage from '@components/FormHelpMessage';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {isNonUSDCurrency} from '@pages/SimplifiedBankOnboarding/contract/currency';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {openFlow} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';

import React, {useEffect, useEffectEvent, useRef, useState} from 'react';
import {View} from 'react-native';

import {clearValidateUserErrors, validateUser} from './requests/validateUser';

type VerifyAccountPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.VERIFY_ACCOUNT>;

function VerifyAccountPage({route}: VerifyAccountPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [user] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER);
    const [workspaces] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES);
    const [validateCode, setValidateCode] = useState('');

    const policyID = route.params?.policyID;
    const backTo = route.params?.backTo;
    const workspace = policyID ? workspaces?.[policyID] : undefined;
    const isNonUSD = isNonUSDCurrency(workspace?.outputCurrency ?? '');
    const isUserValidated = !!user?.validated;
    const isCodeEmpty = validateCode.trim() === '';

    // The validated flag stays true after the navigation started, so this keeps the page from navigating twice.
    const hasNavigatedForwardRef = useRef(false);

    const openFirstStep = useEffectEvent(() => {
        if (hasNavigatedForwardRef.current) {
            return;
        }
        hasNavigatedForwardRef.current = true;

        // The page replaces itself, so the Back of the first step returns to the setup options and not to this form.
        openFlow(
            {kind: isNonUSD ? 'nonUSD' : 'usd', policyID, backTo},
            {
                step: isNonUSD ? SBO_CONST.NON_USD.PAGE_NAMES.COUNTRY : SBO_CONST.USD.PAGE_NAMES.COUNTRY,
            },
            {shouldReplace: true},
        );
    });

    useEffect(() => {
        if (!isUserValidated) {
            return;
        }
        openFirstStep();
    }, [isUserValidated]);

    useEffect(
        () => () => {
            clearValidateUserErrors();
        },
        [],
    );

    const updateValidateCode = (code: string) => {
        setValidateCode(code);
        if (user?.errors) {
            clearValidateUserErrors();
        }
    };

    const submitCode = () => {
        if (isCodeEmpty) {
            return;
        }
        validateUser(validateCode);
    };

    if (isUserValidated) {
        return <FullScreenLoadingIndicator shouldUseGoBackButton />;
    }

    return (
        <ScreenWrapper
            testID="SimplifiedBankOnboardingVerifyAccountPage"
            includeSafeAreaPaddingBottom
        >
            {/* Back ignores backTo and keeps the stored option, as the real page does (ENTRY-AND-SHARED-68) */}
            <HeaderWithBackButtonAndTitle
                title={translate('contacts.validateAccount')}
                onBackButtonPress={() => Navigation.goBack()}
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
                        onSubmitEditing={submitCode}
                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
                        autoFocus
                    />
                    <FormHelpMessage
                        style={styles.mt3}
                        message={getLatestErrorMessage(user)}
                    />
                </View>
                <Button
                    style={[styles.mh5, styles.mb5]}
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    isLoading={!!user?.isLoading}
                    isDisabled={isCodeEmpty}
                    onPress={submitCode}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                >
                    <Button.Text>{translate('common.verify')}</Button.Text>
                </Button>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default VerifyAccountPage;
