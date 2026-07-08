"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IListener = void 0;
const events_1 = require("events");
/**
 * Abstract base for all platform listeners.
 * Each platform (Discord, WhatsApp, Slack) implements this.
 */
class IListener extends events_1.EventEmitter {
}
exports.IListener = IListener;
//# sourceMappingURL=IListener.js.map