/* eslint-disable rulesdir/prefer-actions-set-data */

/* eslint-disable no-console */
import React, {useState} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import Onyx, {useOnyx, withOnyx} from 'react-native-onyx';
import * as Expensicons from '@components/Icon/Expensicons';
import MenuItem from '@components/MenuItem';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import ONYXKEYS from '@src/ONYXKEYS';

type AllowStaleDataWithOnyxOnyxProps = {
    policyID: OnyxEntry<string>;
};

type AllowStaleDataWithOnyxProps = AllowStaleDataWithOnyxOnyxProps;

const AllowStaleDataWithOnyx = withOnyx<AllowStaleDataWithOnyxProps, AllowStaleDataWithOnyxOnyxProps>({
    policyID: {
        key: ONYXKEYS.POLICY_ID,
        initialValue: 'INITIAL VALUE',
        allowStaleData: false,
    },
})(({policyID}: AllowStaleDataWithOnyxProps) => {
    console.log(`OnyxPlayground [App] AllowStaleDataWithOnyx policyID '${policyID}'`);
    return <Text>{policyID}</Text>;
});

function AllowStaleDataUseOnyx() {
    const policyID = useOnyx(ONYXKEYS.POLICY_ID, {allowStaleData: false});
    console.log(`OnyxPlayground [App] AllowStaleDataUseOnyx policyID`, policyID);
    return <Text>{policyID[0]}</Text>;
}

function AllowStaleDataTest() {
    const styles = useThemeStyles();
    const [shouldRender, setShouldRender] = useState(false);

    return (
        <>
            <Text style={[styles.textHeadline, styles.mb2, styles.ph5]}>allowStaleData</Text>
            <MenuItem
                wrapperStyle={styles.mb4}
                title="Show/Hide AllowStaleData components"
                icon={Expensicons.Sync}
                numberOfLinesTitle={2}
                onPress={() => {
                    if (!shouldRender) {
                        const policyID = Onyx.tryGetCachedValue(ONYXKEYS.POLICY_ID);
                        const newPolicyID = policyID === '1576B20B2BA20523' ? '4EB3958A3E59A354' : '1576B20B2BA20523';
                        // const newPolicyID = policyID === '1576B20B2BA20523' ? 'inexistent' : '1576B20B2BA20523';
                        console.log(`OnyxPlayground [App] AllowStaleDataUseOnyx policyID '${policyID}' -> '${newPolicyID}'`);
                        Onyx.merge(ONYXKEYS.POLICY_ID, newPolicyID);
                        // Onyx.merge(ONYXKEYS.POLICY_ID, policyID === '1576B20B2BA20523' ? 'sasasasasa' : '1576B20B2BA20523');
                    }

                    setShouldRender(!shouldRender);
                }}
            />
            <Text>AllowStaleDataWithOnyx - {shouldRender ? <AllowStaleDataWithOnyx /> : ''}</Text>
            <Text>AllowStaleDataUseOnyx - {shouldRender ? <AllowStaleDataUseOnyx /> : ''}</Text>
        </>
    );
}

export default AllowStaleDataTest;
