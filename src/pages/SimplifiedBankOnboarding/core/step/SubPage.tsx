import type React from 'react';

import type {SubPageElementProps} from './readSubPages';

type SubPageProps = SubPageElementProps & {
    children: React.ReactNode;
};

/**
 * A sub page with custom content. The content moves with usePageNavigation. OnboardingStep reads the other props from
 * the element, so the component itself renders only its children.
 */
function SubPage({children}: SubPageProps) {
    return children;
}

export default SubPage;
export type {SubPageProps};
