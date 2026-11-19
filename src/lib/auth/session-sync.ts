/** localStorage key so other tabs can detect login/logout (storage events). */
export const AUTH_USER_STORAGE_KEY = "ajaia-auth-user";

export function publishAuthUser(userId: string | null) {
  if (typeof window === "undefined") return;
  if (userId) {
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, userId);
  } else {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  }
}
