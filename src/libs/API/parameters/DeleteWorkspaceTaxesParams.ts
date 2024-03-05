type DeleteWorkspaceTaxesParams = {
    policyID: string;

    /** IDs of taxes to delete */
    taxesToDelete: string[];
};

export default DeleteWorkspaceTaxesParams;
