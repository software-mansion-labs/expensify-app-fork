/**
 * The other ways into the flow. The real flow opens from several pages, and each one passes a different `backTo` or
 * names the bank account instead of the workspace. The flow reads those differences as data, so the lab keeps two of them:
 * the Payments page of a workspace and a list of bank accounts that stands in for the Wallet.
 */
import MenuItemField from '@components/MenuItem/presets/MenuItemField';
import Section from '@components/Section';
import Text from '@components/Text';

import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

function OtherEntryPoints() {
    const styles = useThemeStyles();
    const [workspaces] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES);
    const workspaceList = Object.values(workspaces ?? {});
    const workspacesWithBankAccount = workspaceList.filter((workspace) => !!workspace.achAccount);

    return (
        <Section
            title="Other entry points"
            subtitle="The Payments page passes itself as the return route. A bank account opens the flow without a workspace."
            subtitleMuted
            isCentralPane
        >
            {workspaceList.map((workspace) => (
                <MenuItemField
                    key={workspace.id}
                    name="Payments page"
                    value={workspace.name}
                    onPress={() => Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_WORKSPACE_PAYMENTS.getRoute(workspace.id))}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.OPEN_PAYMENTS_PAGE}
                />
            ))}
            {workspacesWithBankAccount.map((workspace) => (
                <MenuItemField
                    key={workspace.achAccount?.bankAccountID}
                    name={`Bank account (${workspace.achAccount?.state})`}
                    value={`${workspace.achAccount?.bankAccountID}`}
                    onPress={() =>
                        Navigation.navigate(
                            ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTRY.getRoute({bankAccountID: workspace.achAccount?.bankAccountID, backTo: ROUTES.SETTINGS_BANK_ONBOARDING_LAB}),
                        )
                    }
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.OPEN_BANK_ACCOUNT}
                />
            ))}
            {workspacesWithBankAccount.length === 0 && <Text style={[styles.textSupporting, styles.mt3]}>No bank account exists yet. Start a setup to see it here.</Text>}
        </Section>
    );
}

export default OtherEntryPoints;
