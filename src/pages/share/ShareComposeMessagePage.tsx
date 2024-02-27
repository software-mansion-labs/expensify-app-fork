import React, {useRef} from 'react';
import {View} from 'react-native';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import OptionRow from '@components/OptionRow';
import type {AnimatedTextInputRef} from '@components/RNTextInput';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import TextInput from '@components/TextInput';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import * as DeviceCapabilities from '@libs/DeviceCapabilities';
import Navigation from '@navigation/Navigation';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ShareComposeMessageForm} from '@src/types/form/ShareComposeMessageForm';
import INPUT_IDS from '@src/types/form/ShareComposeMessageForm';

// type ShareComposeMessagePageProps' = {};

export default function ShareComposeMessagePage() {
    const inputRef = useRef<AnimatedTextInputRef>(null);

    const theme = useTheme();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const navigateBack = () => {
        Navigation.goBack();
    };

    function updateMessage({message}: ShareComposeMessageForm) {
        // eslint-disable-next-line no-console
        console.log('MESSSAGE ', message);
    }

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableKeyboardAvoidingView={false}
            shouldEnableMinHeight={DeviceCapabilities.canUseTouchScreen()}
            testID={ShareComposeMessagePage.displayName}
        >
            <HeaderWithBackButton
                title={translate('share.title')}
                onBackButtonPress={navigateBack}
            />
            <View style={[styles.flex1]}>
                <View style={[styles.ph6, styles.flexRow, styles.justifyContentBetween, styles.alignItemsCenter]}>
                    <Text
                        style={styles.label}
                        color={theme.textSupporting}
                    >
                        To
                    </Text>
                </View>
                <OptionRow option={{reportID: '1234', text: 'Lauren Reid', subtitle: 'lauren@expensify.com'}} />
                <FormProvider
                    style={[styles.mh5, styles.flexGrow1, styles.flexColumn]}
                    formID={ONYXKEYS.FORMS.SHARE_COMPOSE_MESSAGE_FORM}
                    onSubmit={(values) => updateMessage(values)}
                    submitButtonText={translate('common.share')}
                    enabledWhenOffline
                >
                    <InputWrapper
                        style={[styles.flexGrow1, styles.flexColumn]}
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.MESSAGE}
                        name={INPUT_IDS.MESSAGE}
                        defaultValue={undefined}
                        label="Message"
                        accessibilityLabel="Message"
                        ref={inputRef}
                        role={CONST.ROLE.PRESENTATION}
                        maxLength={10000}
                        multiline
                    />
                </FormProvider>
                {/* <AttachmentView
                    source={item.source}
                    file={item.file}
                    isAuthTokenRequired={item.isAuthTokenRequired}
                    isUsedInCarousel
                    isSingleCarouselItem={isSingleItem}
                    carouselItemIndex={index}
                    carouselActiveItemIndex={activeIndex}
                    onPress={onPress}
                    transactionID={item.transactionID}
                /> */}
            </View>
        </ScreenWrapper>
    );
}

ShareComposeMessagePage.displayName = 'ShareComposeMessagePage';