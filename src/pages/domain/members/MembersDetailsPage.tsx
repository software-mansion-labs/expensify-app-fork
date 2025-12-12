import React, { useMemo } from 'react';
import type { PlatformStackScreenProps } from '@navigation/PlatformStackNavigation/types';
import type { SettingsNavigatorParamList } from '@navigation/types';
import type { MemberDetailsMenuItem } from '@pages/domain/BaseDomainMemberDetailsComponent';
import BaseDomainMemberDetailsComponent from '@pages/domain/BaseDomainMemberDetailsComponent';
import type SCREENS from '@src/SCREENS';
import getEmptyArray from '@src/types/utils/getEmptyArray';


type MembersDetailsPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.ADMIN_DETAILS>;

function MembersDetailsPage({route}: MembersDetailsPageProps) {
    const menuItems = useMemo(() => {
        const baseMenuItems: MemberDetailsMenuItem[] = getEmptyArray<MemberDetailsMenuItem>()
        return baseMenuItems;
    }, []);

    return (
        <BaseDomainMemberDetailsComponent
            accountID={route.params.accountID}
            menuItems={menuItems}
        />
    );
}

MembersDetailsPage.displayName = 'MembersDetailsPage';

export default MembersDetailsPage;
