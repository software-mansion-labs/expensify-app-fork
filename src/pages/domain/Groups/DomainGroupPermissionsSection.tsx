import React from 'react';
import useThemeStyles from '@hooks/useThemeStyles';
import useLocalize from '@hooks/useLocalize';
import Text from '@components/Text';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import useOnyx from '@hooks/useOnyx';
import ONYXKEYS from '@src/ONYXKEYS';
import {enableStrictPolicyRulesErrorsSelector, enableStrictPolicyRulesPendingActionSelector, selectGroupByID} from '@selectors/Domain';
import {View} from 'react-native';
import {closeEnableStrictPolicyRulesError, toggleEnableStrictPolicyRules} from '@userActions/Domain';

type DomainGroupPermissionsSectionProps = {
    domainAccountID: number;
    groupID: string;
}

function DomainGroupPermissionsSection({domainAccountID, groupID}: DomainGroupPermissionsSectionProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const [group] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        canBeMissing: true,
        selector: selectGroupByID(groupID),
    });

    const [enableStrictPolicyRulesPendingAction] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainAccountID}`, {
        canBeMissing: true,
        selector: enableStrictPolicyRulesPendingActionSelector(groupID),
    });
    const [enableStrictPolicyRulesErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${domainAccountID}`, {canBeMissing: true, selector: enableStrictPolicyRulesErrorsSelector(groupID)});

    return (
        <View style={[styles.ph5]}>
            <Text style={[styles.textNormal, styles.textStrong]}>{translate('domain.groups.permissions')}</Text>
            <ToggleSettingOptionRow
                title={translate('domain.groups.strictlyEnforceWorkspaceRules')}
                switchAccessibilityLabel={translate('domain.groups.strictlyEnforceWorkspaceRules')}
                subtitle={translate('domain.groups.strictlyEnforceWorkspaceRulesDescription')}
                shouldPlaceSubtitleBelowSwitch
                isActive={!!group?.enableStrictPolicyRules}
                onToggle={(value) => {
                    if (!group) {
                        return;
                    }
                    toggleEnableStrictPolicyRules(domainAccountID, groupID, value, group);
                }}
                wrapperStyle={[styles.mv3]}
                pendingAction={enableStrictPolicyRulesPendingAction}
                errors={enableStrictPolicyRulesErrors}
                onCloseError={() => closeEnableStrictPolicyRulesError(domainAccountID, groupID)}
            />
        </View>
    );
}

export default DomainGroupPermissionsSection;
