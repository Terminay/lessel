"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPlugin = runPlugin;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function runPlugin(args) {
    const sub = args[0];
    if (sub !== 'add') {
        console.error('[lessel] Usage: lessel plugin add <package-name>');
        process.exit(1);
    }
    const pkgName = args[1];
    if (!pkgName) {
        console.error('[lessel] Missing plugin package name.');
        process.exit(1);
    }
    console.log(`[lessel] Installing ${pkgName}...`);
    try {
        (0, child_process_1.execSync)(`npm install ${pkgName}`, { stdio: 'inherit', cwd: process.cwd() });
    }
    catch {
        console.error(`[lessel] Failed to install ${pkgName}`);
        process.exit(1);
    }
    // Register in lessel.config.json
    const configPath = path_1.default.join(process.cwd(), 'lessel.config.json');
    let config = { plugins: [] };
    try {
        config = JSON.parse(fs_1.default.readFileSync(configPath, 'utf-8'));
    }
    catch {
        console.error('[lessel] No lessel.config.json found. Run "lessel init" first.');
        process.exit(1);
    }
    config.plugins = config.plugins || [];
    if (!config.plugins.includes(pkgName)) {
        config.plugins.push(pkgName);
        fs_1.default.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`[lessel] Registered ${pkgName} in lessel.config.json`);
    }
    else {
        console.log(`[lessel] ${pkgName} already registered.`);
    }
}
//# sourceMappingURL=plugin.js.map