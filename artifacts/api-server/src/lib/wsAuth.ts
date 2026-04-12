import { createClerkClient } from "@clerk/express";
import type { IncomingMessage } from "http";

export async function getSessionUserFromReq(req: IncomingMessage): Promise<{ id: string } | null> {
  try {
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const url = new URL(req.url ?? "/", "http://localhost");
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val != null) headers.set(key, Array.isArray(val) ? val.join(",") : val);
    }
    const request = new Request(url.toString(), { headers });
    const result = await clerkClient.authenticateRequest(request, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    if (result.isSignedIn) {
      const auth = result.toAuth();
      const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
      return userId ? { id: userId } : null;
    }
  } catch {
    // unauthenticated
  }
  return null;
}

export async function verifyHostToken(token: string): Promise<string | null> {
  try {
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });
    const tokenReq = new Request("http://localhost/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const tokenResult = await clerkClient.authenticateRequest(tokenReq, {
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });
    if (tokenResult.isSignedIn) {
      const auth = tokenResult.toAuth();
      return (auth?.sessionClaims?.userId as string | undefined) || auth?.userId || null;
    }
  } catch {
    // invalid token
  }
  return null;
}
