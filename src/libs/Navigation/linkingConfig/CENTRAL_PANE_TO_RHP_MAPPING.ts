import type {CentralPaneName} from '@libs/Navigation/types';
import SCREENS from '@src/SCREENS';

const CENTRAL_PANE_TO_RHP_MAPPING: Partial<Record<CentralPaneName, string[]>> = {
    [SCREENS.SEARCH.CENTRAL_PANE]: [SCREENS.SEARCH.REPORT_RHP],
};

export default CENTRAL_PANE_TO_RHP_MAPPING;
