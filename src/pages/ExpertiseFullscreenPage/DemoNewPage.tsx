import React from 'react';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Navigation from '@libs/Navigation/Navigation';

function DemoNewPage() {
    return (
        <ScreenWrapper testID="DemoNewPage">
            <HeaderWithBackButton
                title="Nowy ekran"
                onBackButtonPress={Navigation.goBack}
            />
        </ScreenWrapper>
    );
}

export default DemoNewPage;
