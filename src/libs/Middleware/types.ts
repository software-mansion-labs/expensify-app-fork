import { GraphRequest } from '../../types/onyx/Request';
import Response from '../../types/onyx/Response';

type Middleware = (response: Promise<Response | void>, request: GraphRequest, isFromSequentialQueue: boolean) => Promise<Response | void>;

export default Middleware;
