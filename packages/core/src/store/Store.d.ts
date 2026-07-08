import { StoredMessage, ApiKey, Schema, DashboardStats } from '../types';
/**
 * SQLite-backed persistence layer for lessel.
 * Handles API keys, schema storage, and message persistence.
 */
export declare class Store {
    private db;
    constructor(dbPath?: string);
    private migrate;
    saveSchema(schema: Schema): void;
    getSchema(name: string): Schema | null;
    getAllSchemas(): Schema[];
    deleteSchema(name: string): void;
    createApiKey(label: string): {
        id: string;
        rawKey: string;
    };
    validateApiKey(rawKey: string): ApiKey | null;
    listApiKeys(): ApiKey[];
    toggleApiKey(id: string, enabled: boolean): void;
    deleteApiKey(id: string): void;
    private hashKey;
    private constantTimeCompare;
    storeMessage(msg: StoredMessage): void;
    getMessages(schemaName?: string, platform?: string, limit?: number, offset?: number): StoredMessage[];
    getMessageCount(schemaName?: string, platform?: string): number;
    getMessagesSince(since: string): StoredMessage[];
    getDashboardStats(): DashboardStats;
    close(): void;
}
//# sourceMappingURL=Store.d.ts.map