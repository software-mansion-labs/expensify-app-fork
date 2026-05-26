// Tells the repo's root ESLint config to ignore .agent-optimizer/.
// This is standalone Node.js tooling, not app code.
import {globalIgnores} from 'eslint/config';

export default globalIgnores(['.agent-optimizer/**/*']);
