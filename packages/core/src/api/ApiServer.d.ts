import { Store } from '../store/Store';
/**
 * REST API server for lessel.
 * External executers consume message data through this API.
 */
export declare class ApiServer {
    private app;
    private store;
    private port;
    constructor(store: Store, port?: number);
    private registerRoutes;
    private authMiddleware;
    start(): Promise<void>;
}
//# sourceMappingURL=ApiServer.d.ts.map