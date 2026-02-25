import type {Report} from '@src/types/onyx';

// TODO: Implement in Phase 2
function useSelfDMTasks(): {tasks: Report[]; hasAnyTasks: boolean} {
    return {
        tasks: [],
        hasAnyTasks: false,
    };
}

export default useSelfDMTasks;
