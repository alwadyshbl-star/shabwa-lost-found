import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Opens the platform's own account page and preserves the page the user came from. */
export const startLogin = () => {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const next = currentPath.startsWith("/auth") ? "/my-reports" : currentPath;
  window.location.href = `/auth?next=${encodeURIComponent(next)}`;
};

/** Temporary bridge for an existing Manus user to set a local password and keep their linked reports. */
export const startLegacyAccountLink = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const next = `${window.location.pathname}${window.location.search}`;
  const redirectUri = `${window.location.origin}/auth?legacy=1&next=${encodeURIComponent(next)}`;
  const nonce = crypto.randomUUID();
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  const state = encodeOAuthState({ redirectUri, nonce });
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  window.location.href = url.toString();
};
