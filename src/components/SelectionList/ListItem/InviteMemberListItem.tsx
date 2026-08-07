import ListSelectionButton from '@components/SelectionList/components/ListSelectionButton';
import ListItemComposed from '@components/SelectionList/ListItemComposed';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import {Str} from 'expensify-common';
import React from 'react';
import {View} from 'react-native';

import type {InviteMemberListItemProps, ListItem} from './types';

/**
 * A user row with avatar, name, and subtitle used for person selection and invitation. Adds
 * secondary-login footers and product training tooltips on top of the standard user row layout.
 *
 * Fully composed row: sits directly on ListItemComposed.Pressable. The selection button, RBR
 * indicator, and secondary-login footer are plain conditional JSX instead of configured flags.
 */
function InviteMemberListItem<TItem extends ListItem>({
    item,
    isFocused,
    isFocusVisible,
    showTooltip,
    isDisabled,
    canSelectMultiple,
    onSelectRow,
    onSelectionButtonPress,
    onDismissError,
    rightHandSideComponent,
    onFocus,
    shouldSyncFocus,
    wrapperStyle,
    isMultilineSupported,
}: InviteMemberListItemProps<TItem>) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const firstItemIconID = Number(item?.icons?.at(0)?.id);

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const accountID = !item.reportID ? item.accountID || firstItemIconID : undefined;

    const showsSelectionButton = !item.shouldHideSelectionButton && !(item.isDisabled && !item.isSelected);
    const showsRBR = !canSelectMultiple || !!item.isDisabled;

    return (
        <ListItemComposed.Pressable
            item={item}
            isFocused={isFocused}
            isFocusVisible={isFocusVisible}
            isDisabled={isDisabled}
            canSelectMultiple={canSelectMultiple}
            onSelectRow={onSelectRow}
            onDismissError={onDismissError}
            errors={item.errors}
            pendingAction={item.pendingAction}
            keyForList={item.keyForList}
            onFocus={onFocus}
            shouldSyncFocus={shouldSyncFocus}
        >
            {(hovered, {isSelected}) => (
                <>
                    <ListItemComposed.Row
                        testID={item.text}
                        style={[styles.flex1, styles.justifyContentBetween, styles.sidebarLinkInner, styles.userSelectNone, styles.peopleRow, wrapperStyle]}
                    >
                        <View style={[styles.flexRow, styles.alignItemsCenter, styles.flex1]}>
                            {!!accountID && (
                                <ListItemComposed.UserAvatar
                                    accountID={accountID}
                                    fallbackDisplayName={item.text ?? item.alternateText ?? undefined}
                                    showTooltip={showTooltip}
                                />
                            )}
                            {!accountID && !!item.reportID && (
                                <ListItemComposed.ReportAvatar
                                    reportID={item.reportID}
                                    fallbackDisplayName={item.text ?? item.alternateText ?? undefined}
                                    showTooltip={showTooltip}
                                />
                            )}
                            {!accountID && !item.reportID && (!!item.text || !!item.alternateText) && (
                                <ListItemComposed.UserAvatar
                                    accountID={CONST.DEFAULT_NUMBER_ID}
                                    fallbackDisplayName={item.text ?? item.alternateText ?? undefined}
                                    showTooltip={showTooltip}
                                />
                            )}
                            <ListItemComposed.TextColumn>
                                <View style={[styles.flexRow, styles.alignItemsCenter]}>
                                    <ListItemComposed.Title
                                        text={Str.removeSMSDomain(item.text ?? '')}
                                        showTooltip={showTooltip}
                                        numberOfLines={isMultilineSupported ? 2 : 1}
                                        style={[
                                            item.isBold === false && [styles.fontWeightNormal, styles.textSupporting],
                                            isMultilineSupported && styles.preWrap,
                                            !!item.alternateText && styles.mb1,
                                        ]}
                                    />
                                </View>
                                {!!item.alternateText && (
                                    <ListItemComposed.Subtitle
                                        text={Str.removeSMSDomain(item.alternateText)}
                                        showTooltip={showTooltip}
                                    />
                                )}
                            </ListItemComposed.TextColumn>
                            {item.rightElement}
                        </View>
                        {showsRBR && (
                            <ListItemComposed.RBRIndicator
                                brickRoadIndicator={item.brickRoadIndicator}
                                isSelected={isSelected}
                                canShowSeveralIndicators={item.canShowSeveralIndicators}
                            />
                        )}
                        {showsSelectionButton && (
                            <ListSelectionButton
                                role={canSelectMultiple ? CONST.ROLE.CHECKBOX : CONST.ROLE.RADIO}
                                item={item}
                                onSelectRow={onSelectionButtonPress ?? onSelectRow}
                                disabled={!!isDisabled || !!item.isDisabledCheckbox}
                                style={styles.ml3}
                            />
                        )}
                        {typeof rightHandSideComponent === 'function' ? rightHandSideComponent(item, isFocused) : rightHandSideComponent}
                    </ListItemComposed.Row>
                    {!!item.invitedSecondaryLogin && (
                        <Text style={[styles.ml9, styles.ph5, styles.pb3, styles.textLabelSupporting]}>
                            {translate('workspace.people.invitedBySecondaryLogin', item.invitedSecondaryLogin)}
                        </Text>
                    )}
                </>
            )}
        </ListItemComposed.Pressable>
    );
}

export default InviteMemberListItem;
