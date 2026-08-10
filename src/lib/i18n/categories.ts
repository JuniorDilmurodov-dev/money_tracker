import type { Dictionary } from "./dictionaries/en";

/**
 * Category names are user data — stored, filtered and submitted exactly as the
 * user typed them. The seven names seeded for every new account are the one
 * exception: they were written by the app, in English, so they get shown
 * translated while the stored value stays untouched.
 *
 * Anything the user added themselves falls through unchanged.
 */
const SEEDED: Record<string, keyof Dictionary["categories"]> = {
  food: "food",
  transport: "transport",
  utilities: "utilities",
  entertainment: "entertainment",
  shopping: "shopping",
  health: "health",
  other: "other",
};

export function translateCategory(name: string, t: Dictionary): string {
  const key = SEEDED[name.trim().toLowerCase()];
  return key ? t.categories[key] : name;
}
