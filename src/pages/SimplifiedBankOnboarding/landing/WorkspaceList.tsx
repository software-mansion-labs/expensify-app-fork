/**
 * The list of mock workspaces. Each one opens the bank onboarding of that workspace, and they differ in what makes the
 * flow branch: the currency, the role of the user and whether a bank account already exists.
 * This entry passes no `backTo`, so leaving the flow closes the panel.
 */
import MenuItemField from '@components/MenuItem/presets/MenuItemField';
import Section from '@components/Section';

import useOnyx from '@hooks/useOnyx';

import Navigation from '@libs/Navigation/Navigation';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

import getBankAccountSummary from './getBankAccountSummary';

function WorkspaceList() {
    const [workspaces] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES);

    return (
        <Section
            title="Workspaces"
            subtitle="Pick a workspace to connect its bank account."
            subtitleMuted
            isCentralPane
        >
            {Object.values(workspaces ?? {}).map((workspace) => (
                <MenuItemField
                    key={workspace.id}
                    name={getBankAccountSummary(workspace)}
                    value={workspace.name}
                    onPress={() => Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTRY.getRoute({policyID: workspace.id}))}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.OPEN_WORKSPACE}
                />
            ))}
        </Section>
    );
}

export default WorkspaceList;
