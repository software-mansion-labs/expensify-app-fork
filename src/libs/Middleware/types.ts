import {GraphRequest} from '@src/types/onyx/Request';
import Response from '@src/types/onyx/Response';

type Middleware = (response: Promise<Response | void>, request: GraphRequest, isFromSequentialQueue: boolean) => Promise<Response | void>;

export default Middleware;
