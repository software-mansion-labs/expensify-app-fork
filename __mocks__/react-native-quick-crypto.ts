// Node's crypto stands in for the native module, which Jest cannot load
import {createHash, getRandomValues} from 'crypto';

export {createHash, getRandomValues};
