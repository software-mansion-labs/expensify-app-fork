type WorkspaceTax = {
    /** policyID of the Workspace */
    policyID: string;

    /**  Is the Tax enabled */
    enabled?: boolean;

    /** Name of the tax */
    name?: string;

    /** Tax rate */
    value?: number;
};

export default WorkspaceTax;
