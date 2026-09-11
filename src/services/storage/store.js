// Accès unique au stockage. App.js ne doit plus toucher AsyncStorage directement :
// tout passe ici pour garder un namespace versionné et une migration possible.

export const SCHEMA_VERSION = 15;
export const PREFIX = `yprogress.v${SCHEMA_VERSION}.`;
const LEGACY_PREFIXES = ["yprogress.v8.", ""];

// Clés connues sans suffixe de date.
export const KEYS = {
  journal: "journal",
  logs: "logs",
  weights: "weights",
  targets: "targets",
  profile: "profile",
  weekly: "weekly",
  workoutLogs: "workoutLogs",
  trainingHistory: "trainingHistory",
  trainingWeek: "trainingWeek",
  exerciseOverrides: "exerciseOverrides",
  settings: "settings"
};

function backend() {
  try {
    return require("@react-native-async-storage/async-storage").default;
  } catch (error) {
    return null;
  }
}

export const store = {
  async get(key, fallback = null) {
    const AsyncStorage = backend();
    if (!AsyncStorage) return fallback;
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  },
  async set(key, value) {
    const AsyncStorage = backend();
    if (!AsyncStorage) return false;
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  },
  async remove(key) {
    const AsyncStorage = backend();
    if (!AsyncStorage) return false;
    try {
      await AsyncStorage.removeItem(PREFIX + key);
      return true;
    } catch (error) {
      return false;
    }
  }
};

/**
 * Rapatrie une seule fois les anciennes clés non préfixées (v14 et avant).
 * Sans ça, la mise à jour ferait perdre tout l'historique déjà saisi.
 */
export async function migrateLegacyKeys() {
  const AsyncStorage = backend();
  if (!AsyncStorage) return { migrated: 0, skipped: true };
  try {
    const done = await AsyncStorage.getItem(`${PREFIX}__migrated`);
    if (done) return { migrated: 0, alreadyDone: true };

    const all = await AsyncStorage.getAllKeys();
    const owned = new Set(all.filter((k) => k.startsWith(PREFIX)));
    let migrated = 0;

    for (const key of all) {
      if (key.startsWith(PREFIX)) continue;
      const legacyPrefix = LEGACY_PREFIXES.find((p) => p !== "" && key.startsWith(p));
      const bare = legacyPrefix ? key.slice(legacyPrefix.length) : key;
      const known = Object.values(KEYS).includes(bare) || /^(water|sleep):\d{4}-\d{2}-\d{2}$/.test(bare);
      if (!known) continue;
      if (owned.has(PREFIX + bare)) continue;
      const value = await AsyncStorage.getItem(key);
      if (value === null) continue;
      await AsyncStorage.setItem(PREFIX + bare, value);
      migrated += 1;
    }

    await AsyncStorage.setItem(`${PREFIX}__migrated`, JSON.stringify({ at: Date.now(), migrated }));
    return { migrated };
  } catch (error) {
    return { migrated: 0, error: true };
  }
}

/** Toutes les clés journalières d'un type donné (ex. "sleep"), triées par date. */
export async function datedKeys(kind) {
  const AsyncStorage = backend();
  if (!AsyncStorage) return [];
  try {
    const all = await AsyncStorage.getAllKeys();
    return all
      .filter((k) => k.startsWith(`${PREFIX}${kind}:`))
      .map((k) => k.slice(PREFIX.length))
      .sort();
  } catch (error) {
    return [];
  }
}
