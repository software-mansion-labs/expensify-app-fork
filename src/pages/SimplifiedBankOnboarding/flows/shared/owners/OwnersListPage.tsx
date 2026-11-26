/**
 * The list page of both owner loops: the owners, and the Confirm button that sends the single request of the step. A
 * row press fills the owner buffer with that owner and opens the first details page, not in edit mode, so the owner
 * confirmation returns to the list (the loop sees an owner that the list holds). Read only rows open nothing, like the
 * row of the user in the USD list.
 */
import UserAvatar from '@components/Avatar/UserAvatar';
import Button from '@components/Button';
import ButtonDisabledWhenOffline from '@components/Button/composed/ButtonDisabledWhenOffline';
import MenuItem from '@components/MenuItem';
import MenuItemAvatarNavigation from '@components/MenuItem/presets/MenuItemAvatarNavigation';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import {RequestErrorMessage, useOnboardingFlow, useOnboardingRequest, usePageNavigation} from '@pages/SimplifiedBankOnboarding/core';
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

type OwnerRow = {
    id: string;
    title: string;
    description: string;

    /** The row of the USD user, whose details come from the personal info step and are not edited here */
    isReadOnly?: boolean;
};

type OwnersListPageProps = {
    rows: OwnerRow[];

    /** Sent by Confirm. A success ends the step. */
    request: OnboardingRequest;

    /** The first details page of an owner, which a row press opens */
    detailsStartPage: PageID;
    getEditUpdate: (id: string) => OnboardingDraft;
};

function OwnersListPage({rows, request, detailsStartPage, getEditUpdate}: OwnersListPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {saveDraft} = useOnboardingFlow();
    const {goNextAfter} = usePageNavigation();
    const {send, isPending, errorMessage} = useOnboardingRequest(request);

    const openOwnerDetails = (id: string) => {
        goNextAfter(saveDraft(getEditUpdate(id)), detailsStartPage);
    };

    const sendOwners = () => {
        goNextAfter(send());
    };

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
                        row.isReadOnly ? (
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
                        ) : (
                            <MenuItemAvatarNavigation
                                key={row.id}
                                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.OPEN_SUMMARY_ITEM}
                                title={row.title}
                                description={row.description}
                                accountID={CONST.DEFAULT_NUMBER_ID}
                                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                                onPress={() => openOwnerDetails(row.id)}
                            />
                        ),
                    )}
                </View>
            )}
            <View style={[styles.ph5, styles.mt5, styles.flexGrow1, styles.justifyContentEnd]}>
                <RequestErrorMessage message={errorMessage} />
                <ButtonDisabledWhenOffline
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    isLoading={isPending}
                    style={styles.w100}
                    onPress={sendOwners}
                >
                    <Button.Text>{translate('common.confirm')}</Button.Text>
                </ButtonDisabledWhenOffline>
            </View>
        </ScrollView>
    );
}

export default OwnersListPage;
export type {OwnerRow, OwnersListPageProps};
