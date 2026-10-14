import React from 'react';
import {StyleSheet, View} from 'react-native';

import {attachOpenReportList} from '.';

type OpenReportListProbeProps = {
    reportID: string;
};

const styles = StyleSheet.create({
    probe: {position: 'absolute', width: 0, height: 0},
});

/** Mounted with the report list so the span variants can observe the element that holds it. */
function OpenReportListProbe({reportID}: OpenReportListProbeProps) {
    return (
        <View
            ref={(node) => attachOpenReportList(reportID, node)}
            style={styles.probe}
            pointerEvents="none"
        />
    );
}

export default OpenReportListProbe;
