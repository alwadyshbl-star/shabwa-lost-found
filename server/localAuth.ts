import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { getUserById } from "./db";
import { ENV } from "./_core/env";
import { COOKIE_NAME } from "../shared/const";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function secretKey() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

function readCookie(req: Request, name: string) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  return cookieHeader
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function createLocalSessionToken(userId: number) {
  return new SignJWT({ scope: "local" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function authenticateLocalRequest(req: Request) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.scope !== "local" || !payload.sub || !/^\d+$/.test(payload.sub)) return null;
    return (await getUserById(Number(payload.sub))) ?? null;
  } catch {
    return null;
  }
}

export const LOCAL_SESSION_MAX_AGE_MS = SESSION_TTL_SECONDS * 1000;
