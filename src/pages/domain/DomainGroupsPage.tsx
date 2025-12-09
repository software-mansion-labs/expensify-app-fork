import HeaderWithBackButton from "@components/HeaderWithBackButton";
import ScreenWrapper from "@components/ScreenWrapper";
import ScrollViewWithContext from "@components/ScrollViewWithContext";
import { View } from "react-native";

function DomainGroupsPage() {
    return (
        <ScreenWrapper testID="xd">
            <HeaderWithBackButton title="Domain Groups" />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ScrollViewWithContext />
            </View>
        </ScreenWrapper>
    );
}

export default DomainGroupsPage;