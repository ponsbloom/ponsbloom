/**
 * One-time migration of localStorage keys from ponsbloom to ponsbloom.
 * Called at module scope from ThemeProvider (outermost client component) so it
 * runs before any component reads localStorage.
 */

const KEY_MAP: [string, string][] = [
  ["ponsbloom_api_key", "ponsbloom_api_key"],
  ["ponsbloom_coordinator_url", "ponsbloom_coordinator_url"],
  ["ponsbloom-store", "ponsbloom-store"],
  ["ponsbloom-theme", "ponsbloom-theme"],
  ["ponsbloom-verification-mode", "ponsbloom-verification-mode"],
  ["ponsbloom_invite_dismissed", "ponsbloom_invite_dismissed"],
];

let migrated = false;

export function migrateStorage() {
  if (migrated || typeof window === "undefined") return;
  migrated = true;

  for (const [oldKey, newKey] of KEY_MAP) {
    const oldVal = localStorage.getItem(oldKey);
    if (oldVal !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, oldVal);
      localStorage.removeItem(oldKey);
    }
  }
}
