// The condux mod's state contract: what its features draw from, held in $.state so a hot reload keeps it.
// Types only: `claude plugin validate` rejects a contract that exports a value.

declare module 'claude-code' {
  interface PluginState {
    condux: {
      // Filled in as features land; the board's snapshot arrives with the pane.
      board: null;
    };
  }
}
