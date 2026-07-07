/**
 * @lessel/plugin-logger — Example lessel plugin
 *
 * Logs every captured message to the console with a timestamp.
 * Demonstrates the plugin interface: name, schema, execute.
 *
 * Usage:
 *   npm install @lessel/plugin-logger
 *   # Or reference as a local path in lessel.config.json
 *
 * lessel.config.json:
 *   {
 *     "plugins": ["@lessel/plugin-logger"]
 *   }
 */

module.exports = {
  name: '@lessel/plugin-logger',
  schema: '*', // Hook into ALL schemas

  /**
   * Auto-register these schemas when the plugin loads.
   * The user doesn't need to define them manually in lessel.config.json.
   */
  schemas: [
    {
      name: 'all-messages',
      description: 'Capture all Discord messages',
      platforms: ['discord'],
      filters: [],
      extract: [
        { key: 'content', path: 'content' },
        { key: 'author', path: 'authorName' },
        { key: 'channel', path: 'channelName' },
        { key: 'timestamp', path: 'timestamp' }
      ],
      store: true
    },
    {
      name: 'keyword-alerts',
      description: 'Capture messages containing specific keywords',
      platforms: ['discord'],
      filters: [
        { field: 'content', operator: 'contains', value: 'alert' }
      ],
      extract: [
        { key: 'content', path: 'content' },
        { key: 'author', path: 'authorName' },
        { key: 'channel', path: 'channelName' }
      ],
      store: true
    }
  ],

  /**
   * Called when a message matches a schema.
   */
  async execute(event, context) {
    const { store, log } = context;

    log('info', `Message captured via "${event.schemaName}" schema`, {
      platform: event.platform,
      author: event.payload.author || 'unknown',
      content: (event.payload.content || '(empty)').substring(0, 100),
    });

    // Example: also count messages per schema
    const count = store.getMessageCount(event.schemaName);
    console.log(`   Total messages for "${event.schemaName}": ${count}`);
  },

  /**
   * Called once at startup.
   */
  async onStart(context) {
    context.log('info', 'Logger plugin started — will log all matched messages');
  },

  /**
   * Called on shutdown.
   */
  async onStop() {
    console.log('Logger plugin stopped');
  },
};
