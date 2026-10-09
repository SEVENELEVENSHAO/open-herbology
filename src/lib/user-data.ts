export const USER_DATA_KEY = "fangyao-user-data";
export const LEGACY_BOOKMARKS_KEY = "fangyao-bookmarks";

export interface UserData {
  version: 1;
  favorites: string[];
  notes: Record<string, string>;
}

export function emptyUserData(): UserData {
  return { version: 1, favorites: [], notes: {} };
}

export function parseUserData(value: unknown): UserData {
  if (!value || typeof value !== "object") throw new Error("Invalid user data");
  const data = value as Partial<UserData>;
  if (data.version !== 1 || !Array.isArray(data.favorites) ||
      !data.favorites.every((id) => typeof id === "string" && /^(formula|herb):.+$/.test(id)) ||
      !data.notes || typeof data.notes !== "object" || Array.isArray(data.notes) ||
      !Object.entries(data.notes).every(([key, note]) => /^(formula|herb):.+$/.test(key) && typeof note === "string")) {
    throw new Error("Invalid user data");
  }
  return { version: 1, favorites: [...new Set(data.favorites)], notes: { ...data.notes } };
}

export function readUserData(storage: Pick<Storage, "getItem">): UserData {
  const saved = storage.getItem(USER_DATA_KEY);
  if (saved !== null) return parseUserData(JSON.parse(saved));
  const legacy = storage.getItem(LEGACY_BOOKMARKS_KEY);
  const favorites: unknown = legacy === null ? [] : JSON.parse(legacy);
  if (!Array.isArray(favorites) || !favorites.every((id) => typeof id === "string")) throw new Error("Invalid bookmarks");
  // Old bookmarks shared unprefixed numeric IDs between herbs and formulas.
  // Preserve their previous behavior once; all new changes are type-specific.
  return parseUserData({ version: 1, favorites: favorites.flatMap((id) => [`formula:${id}`, `herb:${id}`]), notes: {} });
}

export function mergeUserData(current: UserData, imported: UserData): UserData {
  return parseUserData({
    version: 1,
    favorites: [...current.favorites, ...imported.favorites],
    notes: { ...current.notes, ...imported.notes },
  });
}

export function favoritesFirst<T extends { id: string }>(items: T[], favorites: string[]): T[] {
  const ids = new Set(favorites);
  return [...items].sort((a, b) => Number(ids.has(b.id)) - Number(ids.has(a.id)));
}
