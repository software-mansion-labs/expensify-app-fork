/**
 * A list of entries of a repeated group, such as the owners, and the button that submits the step. A row opens the
 * entry unless it is read only, like the row of the current user in the owner list.
 */
import Button from '@components/Button';
import ButtonDisabledWhenOffline from '@components/Button/composed/ButtonDisabledWhenOffline';
import DotIndicatorMessage from '@components/DotIndicatorMessage';
import MenuItemAvatarNavigation from '@components/MenuItem/presets/MenuItemAvatarNavigation';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {ListPageConfig, ListRow} from '@pages/SimplifiedBankOnboarding/core/plan/types';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import ReadOnlyListRow from './ReadOnlyListRow';

type ListPageProps = {
    page: ListPageConfig;
    isLoading: boolean;

    /** The error of the request that the submit started */
    errorText?: string;
    onSubmit: () => void;
    onRowPress: (rowID: string) => void;
};

function ListPage({page, isLoading, errorText, onSubmit, onRowPress}: ListPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const renderRow = (row: ListRow) => {
        if (row.isReadOnly) {
            return (
                <ReadOnlyListRow
                    key={row.id}
                    title={row.title}
                    description={row.description}
                />
            );
        }
        return (
            <MenuItemAvatarNavigation
                key={row.id}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.OPEN_SUMMARY_ITEM}
                title={row.title}
                description={row.description ?? ''}
                accountID={CONST.DEFAULT_NUMBER_ID}
                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                onPress={() => onRowPress(row.id)}
            />
        );
    };

    return (
        <ScrollView
            style={styles.pt0}
            contentContainerStyle={[styles.flexGrow1, styles.pb5]}
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.ph5]}>{page.title}</Text>
            {!!page.description && <Text style={[styles.p5, styles.textSupporting]}>{page.description}</Text>}
            {page.rows.length > 0 && (
                <View>
                    {!!page.rowsTitle && <Text style={[styles.textSupporting, styles.pv1, styles.ph5]}>{page.rowsTitle}</Text>}
                    {page.rows.map(renderRow)}
                </View>
            )}
            <View style={[styles.ph5, styles.mt5, styles.flexGrow1, styles.justifyContentEnd]}>
                {!!errorText && (
                    <DotIndicatorMessage
                        textStyles={[styles.formError]}
                        type="error"
                        messages={{error: errorText}}
                    />
                )}
                <ButtonDisabledWhenOffline
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    isLoading={isLoading}
                    style={styles.w100}
                    onPress={onSubmit}
                >
                    <Button.Text>{translate('common.confirm')}</Button.Text>
                </ButtonDisabledWhenOffline>
            </View>
        </ScrollView>
    );
}

export default ListPage;
