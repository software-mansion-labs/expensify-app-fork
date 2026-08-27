import type {CompareEntry, CompareResult} from '@callstack/reassure-compare';

import * as core from '@actions/core';
import fs from 'fs';

/**
 * Checks every scenario whose render count moved against the allowed deviation.
 *
 * Only render counts are gated. Duration is deliberately not: two Reassure runs execute on two
 * independently provisioned runners, so a duration delta cannot be attributed to the diff. Render
 * counts are deterministic, which is why they can block.
 *
 * @returns the failure message for the first offending scenario, or undefined when all are within range.
 */
function validateCountDeviation(countChanged: CompareEntry[], countDeviation: number): string | undefined {
    for (const measurement of countChanged) {
        const renderCountDiff = measurement.current.meanCount - measurement.baseline.meanCount;

        if (renderCountDiff > countDeviation) {
            return `Render count difference for "${measurement.name}" exceeded the allowed deviation of ${countDeviation}. Current difference: ${renderCountDiff}`;
        }

        console.log(`Render count difference ${renderCountDiff} for "${measurement.name}" is within the allowed deviation range of ${countDeviation}.`);
    }

    return undefined;
}

const run = (): boolean => {
    const regressionOutput = JSON.parse(fs.readFileSync('.reassure/output.json', 'utf8')) as CompareResult;
    const countDeviation = Number(core.getInput('COUNT_DEVIATION', {required: true}));

    if (regressionOutput.countChanged === undefined || regressionOutput.countChanged.length === 0) {
        console.log('No countChanged data available. Exiting...');
        return true;
    }

    console.log(`Processing ${regressionOutput.countChanged.length} measurements...`);

    const failure = validateCountDeviation(regressionOutput.countChanged, countDeviation);
    if (failure) {
        core.setFailed(failure);
    }

    return true;
};

if (import.meta.main) {
    run();
}

export default run;
export {validateCountDeviation};
