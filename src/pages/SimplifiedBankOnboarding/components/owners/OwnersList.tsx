/**
 * The last page of both owner loops: the list of owners and the button that sends the single request of the step. Rows
 * with a press handler open the details form of that owner, the row of the current user is read only, like in the
 * real `CompanyOwnersListUBO` and `BeneficialOwnersList`.
 */
import UserAvatar from '@components/Avatar/UserAvatar';
import Button from '@components/Button';
import ButtonDisabledWhenOffline from '@components/Button/composed/ButtonDisabledWhenOffline';
import DotIndicatorMessage from '@components/DotIndicatorMessage';
import MenuItem from '@components/MenuItem';
import MenuItemAvatarNavigation from '@components/MenuItem/presets/MenuItemAvatarNavigation';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

type OwnerRow = {
    id: string;
    title: string;
    description?: string;

    /** Opens the details form of the owner. The row of the current user has none. */
    onPress?: () => void;
};

type OwnersListProps = {
    rows: OwnerRow[];

    /** The message of the failed save. An empty string means there is no error. */
    error: string;
    isLoading: boolean;
    onConfirm: () => void;
};

function OwnersList({rows, error, isLoading, onConfirm}: OwnersListProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    return (
        <ScrollView
            style={styles.pt0}
            contentContainerStyle={[styles.flexGrow1, styles.pb5]}
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.ph5]}>{translate('beneficialOwnerInfoStep.letsDoubleCheck')}</Text>
            <Text style={[styles.p5, styles.textSupporting]}>{translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity')}</Text>
            {rows.length > 0 && (
                <View>
                    <Text style={[styles.textSupporting, styles.pv1, styles.ph5]}>{`${translate('beneficialOwnerInfoStep.owners')}:`}</Text>
                    {rows.map((row) =>
                        row.onPress ? (
                            <MenuItemAvatarNavigation
                                key={row.id}
                                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.OPEN_SUMMARY_ITEM}
                                title={row.title}
                                description={row.description ?? ''}
                                accountID={CONST.DEFAULT_NUMBER_ID}
                                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                                onPress={row.onPress}
                            />
                        ) : (
                            <MenuItem.Root
                                key={row.id}
                                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.OPEN_SUMMARY_ITEM}
                            >
                                <MenuItem.Row>
                                    <MenuItem.Leading>
                                        <UserAvatar accountID={CONST.DEFAULT_NUMBER_ID} />
                                    </MenuItem.Leading>
                                    <MenuItem.Content>
                                        <MenuItem.Title forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}>{row.title}</MenuItem.Title>
                                        {!!row.description && <MenuItem.Description forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}>{row.description}</MenuItem.Description>}
                                    </MenuItem.Content>
                                </MenuItem.Row>
                            </MenuItem.Root>
                        ),
                    )}
                </View>
            )}
            <View style={[styles.ph5, styles.mt5, styles.flexGrow1, styles.justifyContentEnd]}>
                {!!error && (
                    <DotIndicatorMessage
                        textStyles={[styles.formError]}
                        type="error"
                        messages={{error}}
                    />
                )}
                <ButtonDisabledWhenOffline
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    isLoading={isLoading}
                    style={styles.w100}
                    onPress={onConfirm}
                >
                    <Button.Text>{translate('common.confirm')}</Button.Text>
                </ButtonDisabledWhenOffline>
            </View>
        </ScrollView>
    );
}

export default OwnersList;
export type {OwnerRow};
