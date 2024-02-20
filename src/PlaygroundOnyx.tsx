/* eslint-disable no-console */
import React from 'react';
import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';
import {useOnyx, withOnyx} from 'react-native-onyx';
import ONYXKEYS from './ONYXKEYS';
import type {Account, Policy} from './types/onyx';

type PartialPolicy = Pick<Policy, 'id' | 'name'>;

type ComponentWithOnyxHOCOnyxProps = {
    account: OnyxEntry<Account>;

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
})(({policyID, account, policies, policy, sessionEmail, policiesWithSelector}) => {
    console.group('fabio ComponentWithOnyxHOC');
    console.log('fabio ComponentWithOnyxHOC policyID', policyID);
    console.log('fabio ComponentWithOnyxHOC account', account);
    console.log('fabio ComponentWithOnyxHOC policies', policies);
    console.log('fabio ComponentWithOnyxHOC policy', policy);
    console.log('fabio ComponentWithOnyxHOC sessionEmail', sessionEmail);
    console.log('fabio ComponentWithOnyxHOC policiesWithSelector', policiesWithSelector);
    console.groupEnd();

    return null;
});

type ComponentWithOnyxHookProps = {
    policyID: string;
};

function ComponentWithOnyxHook({policyID}: ComponentWithOnyxHookProps) {
    const account = useOnyx(ONYXKEYS.ACCOUNT);
    const {value: accountValue} = account;

    const policies = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const {value: policiesValue} = policies;

    const policy = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);
    const {value: policyValue} = policy;

    const policy2 = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
        selector: (selectedPolicy) => ({
            id: selectedPolicy?.id,
            name: selectedPolicy?.name,
        }),
    });
    const {value: policy2Value} = policy2;

    const sessionEmail = useOnyx(ONYXKEYS.SESSION, {selector: (value) => value?.email ?? ''});
    const {value: sessionEmailValue} = sessionEmail;

    const policiesWithSelector = useOnyx(ONYXKEYS.COLLECTION.POLICY, {
        selector: (selectedPolicy) => ({
            id: selectedPolicy?.id,
            name: selectedPolicy?.name,
        }),
    });
    const {value: policiesWithSelectorValue} = policiesWithSelector;

    console.group('fabio ComponentWithOnyxHook');
    console.log('fabio ComponentWithOnyxHook policyID', policyID);
    console.log('fabio ComponentWithOnyxHook account', account);
    console.log('fabio ComponentWithOnyxHook policies', policies);
    console.log('fabio ComponentWithOnyxHook policy', policy);
    console.log('fabio ComponentWithOnyxHook policy2', policy2);
    console.log('fabio ComponentWithOnyxHook sessionEmail', sessionEmail);
    console.log('fabio ComponentWithOnyxHook policiesWithSelector', policiesWithSelector);
    console.groupEnd();

    return null;
}

type PlaygroundOnyxProps = {
    policyID: string;
};

function PlaygroundOnyx({policyID}: PlaygroundOnyxProps) {
    return (
        <>
            <ComponentWithOnyxHOC policyID={policyID} />
            <ComponentWithOnyxHook policyID={policyID} />
        </>
    );
}

export default withOnyx<PlaygroundOnyxProps, PlaygroundOnyxProps>({
    policyID: {
        key: ONYXKEYS.POLICY_ID,
        selector: (value) => value ?? 'undefined',
    },
})(PlaygroundOnyx);
