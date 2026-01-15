import React from 'react';
import { View } from 'react-native';
import type { OnyxEntry } from 'react-native-onyx';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItem from '@components/MenuItem';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@navigation/Navigation';
import type { PlatformStackScreenProps } from '@navigation/PlatformStackNavigation/types';
import type { SettingsNavigatorParamList } from '@navigation/types';
import BaseDomainMemberDetailsComponent from '@pages/domain/BaseDomainMemberDetailsComponent';
import DomainNotFoundPageWrapper from '@pages/domain/DomainNotFoundPageWrapper';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type { Domain } from '@src/types/onyx';
import vacationDelegate from '@src/types/onyx/VacationDelegate';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import domainPendingActions from '@src/types/onyx/DomainPendingActions';
import {getLatestError} from '@libs/ErrorUtils';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';


type DomainGroupDetailsPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.GROUP_DETAILS>;


function DomainGroupDetailsPage({route}: DomainGroupDetailsPageProps) {
    const {domainAccountID, groupID} = route.params;

    const styles = useThemeStyles();
    const {translate} = useLocalize();

    // eslint-disable-next-line rulesdir/no-inline-useOnyx-selector
    const [group] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {canBeMissing: true, selector: (domain: OnyxEntry<Domain>) => domain?.[`${CONST.DOMAIN.DOMAIN_SECURITY_GROUP_PREFIX}${groupID}`]});

    return (
        <DomainNotFoundPageWrapper domainAccountID={domainAccountID}>
            <ScreenWrapper
                enableEdgeToEdgeBottomSafeAreaPadding
                testID={BaseDomainMemberDetailsComponent.displayName}
            >
                <HeaderWithBackButton title={group?.name ?? ''} />

                <ScrollView addBottomSafeAreaPadding>
                    <View style={[styles.containerWithSpaceBetween, styles.pointerEventsBoxNone, styles.justifyContentStart, styles.w100]}>
                        <OfflineWithFeedback
                            errorRowStyles={[styles.ph5]}
                            // pendingAction={domainPendingActions?.technicalContactEmail}
                            // errors={getLatestError(domainErrors?.technicalContactEmailErrors)}
                            // onClose={() => clearSetPrimaryContactError(domainAccountID)}
                        >
                            <MenuItemWithTopDescription
                                description={translate('common.name')}
                                title={group?.name}
                                shouldShowRightIcon
                                onPress={() => {}}
                            />
                        </OfflineWithFeedback>
                        <ToggleSettingOptionRow
                            wrapperStyle={[styles.mv3, styles.ph5]}
                            switchAccessibilityLabel={translate('domain.groups.defaultGroupToggleDescription')}
                            isActive={false}
                            disabled={false}
                            onToggle={() => {
                            }}
                            title={translate('domain.groups.defaultGroupToggleDescription')}
                            // pendingAction={domainPendingActions?.twoFactorAuthRequired}
                            // errors={getLatestError(domainErrors?.twoFactorAuthRequiredErrors)}
                            // onCloseError={() => clearToggleTwoFactorAuthRequiredForDomainError(domainAccountID)}
                        />
                    </View>
                </ScrollView>
            </ScreenWrapper>
        </DomainNotFoundPageWrapper>
    );
}

export default DomainGroupDetailsPage;
