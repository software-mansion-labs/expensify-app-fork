/* eslint-disable rulesdir/prefer-actions-set-data */
import React from 'react';
import HeaderPageLayout from '@components/HeaderPageLayout';
import AllowStaleDataTest from './AllowStaleDataTest';
import PolicyIDToggle from './PolicyIDToggle';
import WithOnyxVSuseOnyx from './WithOnyxVSuseOnyx';

function OnyxPlaygroundPage() {
    return (
        <HeaderPageLayout
            title="Onyx Playground"
            testID="Onyx Playground"
        >
            <WithOnyxVSuseOnyx />

            <PolicyIDToggle />

            <AllowStaleDataTest />
        </HeaderPageLayout>
    );
}

OnyxPlaygroundPage.displayName = 'OnyxPlaygroundPage';

export default OnyxPlaygroundPage;
