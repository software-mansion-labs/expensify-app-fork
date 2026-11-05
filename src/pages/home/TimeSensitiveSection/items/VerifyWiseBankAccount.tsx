import BaseWidgetItem from '@components/BaseWidgetItem';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';

import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import Navigation from '@libs/Navigation/Navigation';

import CONST from '@src/CONST';
import {DYNAMIC_ROUTES} from '@src/ROUTES';

import React from 'react';

/**
 * The Home time-sensitive task for a bank account Wise asked for more info on.
 */
type VerifyWiseBankAccountProps = {
    /** The bank account Wise asked for more info on */
    bankAccountID: number;

    /** Empty when the account number is not loaded, which leaves the subtitle out instead of naming no digits */
    bankAccountLastFour: string;
};

/** Asks the admin to send Wise the info it needs before global reimbursements can be enabled on the bank account */
function VerifyWiseBankAccount({bankAccountID, bankAccountLastFour}: VerifyWiseBankAccountProps) {
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['GlobeWithCard']);

    return (
        <BaseWidgetItem
            icon={icons.GlobeWithCard}
            title={translate('homePage.timeSensitiveSection.verifyWiseBankAccount.title')}
            subtitle={bankAccountLastFour ? translate('homePage.timeSensitiveSection.verifyWiseBankAccount.subtitle', {bankAccountLastFour}) : undefined}
            ctaText={translate('homePage.forYouSection.begin')}
            onCtaPress={() => Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.WISE_ONBOARDING_STATUS.getRoute(bankAccountID)))}
            buttonVariant={CONST.BUTTON_VARIANT.SUCCESS}
        />
    );
}

export default VerifyWiseBankAccount;
