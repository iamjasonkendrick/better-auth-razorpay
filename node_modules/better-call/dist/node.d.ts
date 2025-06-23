import { IncomingMessage, ServerResponse } from 'node:http';
import { j as Router } from './router-Bn_wF2y_.js';

declare function getRequest({ request, base, bodySizeLimit, }: {
    base: string;
    bodySizeLimit?: number;
    request: IncomingMessage;
}): Request;
declare function setResponse(res: ServerResponse, response: Response): Promise<void>;

declare function toNodeHandler(handler: Router["handler"]): (req: IncomingMessage, res: ServerResponse) => Promise<void>;

export { getRequest, setResponse, toNodeHandler };
