import React from 'react';
import {StyleSheet, View} from 'react-native';

import {markOpenReportHighlightLaidOut} from '.';

type OpenReportHighlightProbeProps = {
    reportID: string;
};

const styles = StyleSheet.create({
    probe: {position: 'absolute', width: 0, height: 0},
});

/** Mounted by the focused LHN row in the commit that moves the highlight; key it by reportID so its first layout marks that commit. */
function OpenReportHighlightProbe({reportID}: OpenReportHighlightProbeProps) {
    return (
        <View
            style={styles.probe}
            onLayout={() => markOpenReportHighlightLaidOut(reportID)}
            pointerEvents="none"
        />
    );
}

export default OpenReportHighlightProbe;
