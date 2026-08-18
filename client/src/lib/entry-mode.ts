export const GUEST_MODE_STORAGE_KEY = "athar-guest-mode";

export function hasChosenGuestMode(value: string | null | undefined): boolean {
  return value === "guest";
}

export function shouldShowAccessWelcome(isAuthenticated: boolean, guestMode: string | null | undefined): boolean {
  return !isAuthenticated && !hasChosenGuestMode(guestMode);
}
