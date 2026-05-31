import '@testing-library/jest-dom';

// Polyfill fake IndexedDB for Dexie in the jsdom/Node environment
import 'fake-indexeddb/auto';

// Silence console.error in tests (e.g. React prop warnings) — remove if you want verbose output
// global.console.error = vi.fn();
