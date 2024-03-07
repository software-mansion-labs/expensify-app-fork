/* eslint-disable no-console */
import React, {useState} from 'react';
import type {OnyxCollection, OnyxEntry, UseOnyxData} from 'react-native-onyx';
import {useOnyx, withOnyx} from 'react-native-onyx';
import * as Expensicons from '@components/Icon/Expensicons';
import MenuItem from '@components/MenuItem';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Account, Policy} from '@src/types/onyx';

type PartialPolicy = Pick<Policy, 'id' | 'name'>;

function SubRenderTest({policy}: {policy: UseOnyxData<`policy_${string}`, OnyxEntry<Policy>>}) {
    console.log('OnyxPlayground [App] SubRenderTest policy', policy);
    return null;
}

type ComponentWithOnyxHOCOnyxProps = {
    account: OnyxEntry<Account>;

    inexistentCollection: OnyxCollection<{id: string}>;

    policies: OnyxCollection<Policy>;

    policy: OnyxEntry<Policy>;

    sessionEmail: OnyxEntry<string>;

    policiesWithSelector: OnyxCollection<PartialPolicy>;
};

type ComponentWithOnyxHOCProps = ComponentWithOnyxHOCOnyxProps & {
    policyID: string;
};

const ComponentWithOnyxHOC = withOnyx<ComponentWithOnyxHOCProps, ComponentWithOnyxHOCOnyxProps>({
    account: {
        key: ONYXKEYS.ACCOUNT,
    },
    inexistentCollection: {
        key: ONYXKEYS.COLLECTION.INEXISTENT,
    },
    policies: {
        key: ONYXKEYS.COLLECTION.POLICY,
    },
    policy: {
        key: ({policyID}) => `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
    },
    sessionEmail: {
        key: ONYXKEYS.SESSION,
        selector: (session) => session?.email ?? '',
    },
    policiesWithSelector: {
        key: ONYXKEYS.COLLECTION.POLICY,
        selector: (policy) => policy?.name as unknown as OnyxCollection<PartialPolicy>,
    },
})(({policyID, account, inexistentCollection, policies, policy, sessionEmail, policiesWithSelector}) => {
    console.group('OnyxPlayground [App] ComponentWithOnyxHOC');
    console.log('OnyxPlayground [App] ComponentWithOnyxHOC policyID', policyID);
    console.log('OnyxPlayground [App] ComponentWithOnyxHOC account', account);
    console.log('OnyxPlayground [App] ComponentWithOnyxHOC inexistentCollection', inexistentCollection);
    console.log('OnyxPlayground [App] ComponentWithOnyxHOC policies', policies);
    console.log('OnyxPlayground [App] ComponentWithOnyxHOC policy', policy);
    console.log('OnyxPlayground [App] ComponentWithOnyxHOC sessionEmail', sessionEmail);
    console.log('OnyxPlayground [App] ComponentWithOnyxHOC policiesWithSelector', policiesWithSelector);
    console.groupEnd();

    return (
        <>
            <SubRenderTest policy={policy} />
        </>
    );
});

type ComponentWithOnyxHookProps = {
    policyID: string;
};

function ComponentWithOnyxHook({policyID}: ComponentWithOnyxHookProps) {
    const account = useOnyx(ONYXKEYS.ACCOUNT);
    const [accountValue] = account;

    const inexistentCollection = useOnyx(ONYXKEYS.COLLECTION.INEXISTENT);
    const [inexistentCollectionValue] = inexistentCollection;

    const policies = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [policiesValue] = policies;

    const policy = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);
    const [policyValue] = policy;

    const policy2 = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
        selector: (selectedPolicy) => ({
            id: selectedPolicy?.id,
            name: selectedPolicy?.name,
        }),
    });
    const [policy2Value] = policy2;

    const currency = useOnyx(ONYXKEYS.CURRENCY_LIST, {
        selector: (currencyList) => currencyList?.[policyID === '1576B20B2BA20523' ? 'EUR' : 'USD'],
    });
    const [currencyValue] = currency;

    const sessionEmail = useOnyx(ONYXKEYS.SESSION, {selector: (value) => value?.email ?? ''});
    const [sessionEmailValue] = sessionEmail;

    const policiesWithSelector = useOnyx(ONYXKEYS.COLLECTION.POLICY, {
        selector: (selectedPolicy) => ({
            id: selectedPolicy?.id,
            name: selectedPolicy?.name,
        }),
    });
    const [policiesWithSelectorValue] = policiesWithSelector;

    console.group('OnyxPlayground [App] ComponentWithOnyxHook');
    console.log('OnyxPlayground [App] ComponentWithOnyxHook policyID', policyID);
    console.log('OnyxPlayground [App] ComponentWithOnyxHook account', account);
    console.log('OnyxPlayground [App] ComponentWithOnyxHook inexistentCollection', inexistentCollection);
    console.log('OnyxPlayground [App] ComponentWithOnyxHook policies', policies);
    console.log('OnyxPlayground [App] ComponentWithOnyxHook policy', policy);
    console.log('OnyxPlayground [App] ComponentWithOnyxHook policy2', policy2);
    console.log('OnyxPlayground [App] ComponentWithOnyxHook currency', currency);
    console.log('OnyxPlayground [App] ComponentWithOnyxHook sessionEmail', sessionEmail);
    console.log('OnyxPlayground [App] ComponentWithOnyxHook policiesWithSelector', policiesWithSelector);
    console.groupEnd();

    return (
        <>
            <SubRenderTest policy={policy} />
        </>
    );
}

type WithOnyxVSuseOnyxProps = {
    policyID: string;
};

function WithOnyxVSuseOnyx({policyID}: WithOnyxVSuseOnyxProps) {
    const styles = useThemeStyles();
    const [shouldRender, setShouldRender] = useState(false);

    return (
        <>
            <Text style={[styles.textHeadline, styles.mb2, styles.ph5]}>withOnyx VS useOnyx</Text>
            <MenuItem
                wrapperStyle={styles.mb4}
                title="Show/Hide WithOnyxVSuseOnyx component"
                icon={Expensicons.Sync}
                numberOfLinesTitle={2}
                onPress={() => {
                    setShouldRender(!shouldRender);
                }}
            />
            {shouldRender && (
                <>
                    <Text>WithOnyxVSuseOnyx</Text>
                    <ComponentWithOnyxHOC policyID={policyID} />
                    <ComponentWithOnyxHook policyID={policyID} />
                </>
            )}
        </>
    );
}

export default withOnyx<WithOnyxVSuseOnyxProps, WithOnyxVSuseOnyxProps>({
    policyID: {
        key: ONYXKEYS.POLICY_ID,
        selector: (value) => value ?? 'inexistent1',
    },
})(WithOnyxVSuseOnyx);
