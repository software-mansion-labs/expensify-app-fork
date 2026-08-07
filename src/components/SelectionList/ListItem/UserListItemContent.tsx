import ListItemComposed from '@components/SelectionList/ListItemComposed';
import getAccessibilityLabel from '@components/SelectionList/utils/getAccessibilityLabel';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import type {ForwardedFSClassProps} from '@libs/Fullstory/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import {Str} from 'expensify-common';
import React from 'react';
import {View} from 'react-native';

import type {ListItem} from './types';

const reportExistsSelector = (report: OnyxEntry<Report>) => !!report;

type UserListItemContentProps<TItem extends ListItem> = {
    item: TItem;
    showTooltip: boolean;
    isDisabled?: boolean | null;
    /** Pre-computed flag: true when a separate right-side interactive element exists that VoiceOver should focus independently. */
    shouldDisableAccessibleGrouping: boolean;
    forwardedFSClass?: ForwardedFSClassProps['forwardedFSClass'];
};

/**
 * Shared inner content for UserListItem and BareUserListItem.
 * Renders the avatar, display name, alternate text, rightElement, and optional right caret.
 * The outer pressable wrapper (SelectableListItem or BaseListItem) is the caller's responsibility.
 */
function UserListItemContent<TItem extends ListItem>({item, showTooltip, isDisabled, shouldDisableAccessibleGrouping, forwardedFSClass}: UserListItemContentProps<TItem>) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- some utils that are used to get reportID return empty string "", which would make subscription to the whole collection with nullish coalescing operator, example of this could be found in NewChatPage.tsx where some hooks return reportID as empty strings
    const [isReportInOnyx] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${item.reportID || undefined}`, {
        selector: reportExistsSelector,
    });

    const reportExists = isReportInOnyx && !!item.reportID;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- accountID being 0 is also not valid, so we prefer to use the icon ID if it exists
    const itemAccountID = Number(item.accountID || item.icons?.at(1)?.id) || 0;

    const isThereOnlyWorkspaceIcon = item.icons?.length === 1 && item.icons?.at(0)?.type === CONST.ICON_TYPE_WORKSPACE;
    const shouldUseIconPolicyID = !item.reportID && !item.accountID && !item.policyID;
    const policyID = isThereOnlyWorkspaceIcon && shouldUseIconPolicyID ? String(item.icons?.at(0)?.id) : item.policyID;

    const baseAccessibilityLabel = getAccessibilityLabel(item);
    const accessibilityLabel =
        shouldDisableAccessibleGrouping && item.isSelected !== undefined
            ? `${translate(item.isSelected ? 'common.deselect' : 'common.select')}, ${baseAccessibilityLabel}`
            : baseAccessibilityLabel;

    return (
        <View
            accessible={shouldDisableAccessibleGrouping || undefined}
            accessibilityLabel={shouldDisableAccessibleGrouping ? accessibilityLabel : undefined}
            role={shouldDisableAccessibleGrouping ? CONST.ROLE.BUTTON : undefined}
            style={[styles.flex1, styles.flexRow, styles.alignItemsCenter]}
        >
            {!!reportExists && (
                <ListItemComposed.ReportAvatar
                    reportID={item.reportID}
                    fallbackDisplayName={item.text ?? item.alternateText ?? undefined}
                    showTooltip={showTooltip}
                />
            )}
            {!reportExists && !!itemAccountID && (
                <ListItemComposed.UserAvatar
                    accountID={itemAccountID}
                    fallbackDisplayName={item.text ?? item.alternateText ?? undefined}
                    showTooltip={showTooltip}
                />
            )}
            {!reportExists && !itemAccountID && !!policyID && (
                <ListItemComposed.WorkspaceAvatar
                    policyID={policyID}
                    fallbackDisplayName={item.text ?? item.alternateText ?? undefined}
                    showTooltip={showTooltip}
                />
            )}
            <ListItemComposed.TextColumn>
                <ListItemComposed.Title
                    text={Str.removeSMSDomain(item.text ?? '')}
                    showTooltip={showTooltip}
                    style={[item.isBold === false && [styles.fontWeightNormal, styles.textSupporting], !!item.alternateText && styles.mb1]}
                />
                {!!item.alternateText && (
                    <ListItemComposed.Subtitle
                        text={Str.removeSMSDomain(item.alternateText)}
                        showTooltip={showTooltip}
                        forwardedFSClass={forwardedFSClass}
                    />
                )}
            </ListItemComposed.TextColumn>
            {item.rightElement}
            {!!item.shouldShowRightCaret && (
                <ListItemComposed.RightCaret
                    isDisabled={!!isDisabled}
                    isInteractive={item.isInteractive !== false}
                    variant="content"
                />
            )}
        </View>
    );
}

export default UserListItemContent;
