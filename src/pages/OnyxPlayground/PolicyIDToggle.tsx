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
                title="Toggle between existing and inexistent policies"
                icon={Expensicons.Send}
                numberOfLinesTitle={2}
                onPress={() => {
                    Onyx.merge(ONYXKEYS.POLICY_ID, policyID === '1576B20B2BA20523' ? 'inexistent1' : '1576B20B2BA20523');
                }}
            />
            <MenuItem
                wrapperStyle={styles.mb4}
                title="Change policy name"
                icon={Expensicons.Send}
                numberOfLinesTitle={2}
                onPress={() => {
                    Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {name: Math.random().toString()});
                }}
            />
            <MenuItem
                wrapperStyle={styles.mb4}
                title="Change policy owner"
                icon={Expensicons.Send}
                numberOfLinesTitle={2}
                onPress={() => {
                    Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {owner: Math.random().toString()});
                }}
            />
            <MenuItem
                wrapperStyle={styles.mb4}
                title="Change policy multiple times with MERGE"
                icon={Expensicons.Send}
                numberOfLinesTitle={2}
                onPress={() => {
                    Onyx.merge(ONYXKEYS.POLICY_ID, '4EB3958A3E59A354');
                    Onyx.merge(ONYXKEYS.POLICY_ID, 'inexistent1');
                    Onyx.merge(ONYXKEYS.POLICY_ID, '1576B20B2BA20523');
                    Onyx.merge(ONYXKEYS.POLICY_ID, 'inexistent2');
                }}
            />
            <MenuItem
                wrapperStyle={styles.mb4}
                title="Change policy multiple times with SET"
                icon={Expensicons.Send}
                numberOfLinesTitle={2}
                onPress={() => {
                    Onyx.set(ONYXKEYS.POLICY_ID, '4EB3958A3E59A354');
                    Onyx.set(ONYXKEYS.POLICY_ID, 'inexistent1');
                    Onyx.set(ONYXKEYS.POLICY_ID, '1576B20B2BA20523');
                    Onyx.set(ONYXKEYS.POLICY_ID, 'inexistent2');
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
