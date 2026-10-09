"use client";

import { useEffect, useRef, useState } from "react";
import { emptyUserData, mergeUserData, parseUserData, readUserData, USER_DATA_KEY, type UserData } from "@/lib/user-data";

export function useUserData() {
  const [data, setData] = useState<UserData>(emptyUserData);
  const current = useRef(data);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const loaded = readUserData(window.localStorage);
      current.current = loaded;
      setData(loaded);
      setReady(true);
    } catch {
      // Preserve unreadable data rather than overwriting it with empty state.
      setError(true);
    }
  }, []);

  function persist(next: UserData): boolean {
    if (!ready) return false;
    try {
      window.localStorage.setItem(USER_DATA_KEY, JSON.stringify(next));
      current.current = next;
      setData(next);
      setError(false);
      return true;
    } catch {
      setError(true);
      return false;
    }
  }

  return {
    data, ready, error,
    toggleFavorite(id: string) {
      const previous = current.current;
      return persist({ ...previous, favorites: previous.favorites.includes(id)
        ? previous.favorites.filter((item) => item !== id) : [...previous.favorites, id] });
    },
    saveNote(key: string, note: string) {
      const notes = { ...current.current.notes };
      if (note === "") delete notes[key];
      else notes[key] = note;
      return persist({ ...current.current, notes });
    },
    importData(value: unknown) {
      return persist(mergeUserData(current.current, parseUserData(value)));
    },
  };
}
