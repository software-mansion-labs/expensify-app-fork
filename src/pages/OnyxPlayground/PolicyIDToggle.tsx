/* eslint-disable rulesdir/prefer-actions-set-data */
import React from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import Onyx, {withOnyx} from 'react-native-onyx';
import * as Expensicons from '@components/Icon/Expensicons';
import MenuItem from '@components/MenuItem';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import ONYXKEYS from '@src/ONYXKEYS';

type PolicyIDToggleOnyxProps = {
    policyID: OnyxEntry<string>;
};

type PolicyIDToggleProps = PolicyIDToggleOnyxProps;

function PolicyIDToggle({policyID}: PolicyIDToggleProps) {
    const styles = useThemeStyles();

    return (
        <>
            <Text style={[styles.textHeadline, styles.mb2, styles.ph5]}>POLICY_ID</Text>
            <MenuItem
                wrapperStyle={styles.mb4}
                title="Toggle between existing policies"
                icon={Expensicons.Send}
                numberOfLinesTitle={2}
                onPress={() => {
                    Onyx.merge(ONYXKEYS.POLICY_ID, policyID === '1576B20B2BA20523' ? '4EB3958A3E59A354' : '1576B20B2BA20523');
                }}
            />
            <MenuItem
                wrapperStyle={styles.mb4}
                title="Toggle between existing and undefined policies"
                icon={Expensicons.Send}
                numberOfLinesTitle={2}
                onPress={() => {
                    Onyx.merge(ONYXKEYS.POLICY_ID, policyID === '1576B20B2BA20523' ? 'undefined' : '1576B20B2BA20523');
                }}
            />
        </>
    );
}

export default withOnyx<PolicyIDToggleProps, PolicyIDToggleOnyxProps>({
    policyID: {
        key: ONYXKEYS.POLICY_ID,
    },
})(PolicyIDToggle);
