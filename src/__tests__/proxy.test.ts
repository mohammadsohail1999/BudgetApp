import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock for getToken
// ---------------------------------------------------------------------------

const mockGetToken = vi.hoisted(() => vi.fn<[], Promise<object | null>>());

vi.mock("next-auth/jwt", () => ({ getToken: mockGetToken }));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are in place.
// ---------------------------------------------------------------------------
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost";

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, BASE_URL));
}

const STUB_TOKEN = { sub: "user-id-123", id: "user-id-123" };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("proxy middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret-for-vitest");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // -------------------------------------------------------------------------
  // Public paths that bypass the auth check entirely
  // -------------------------------------------------------------------------

  it("should not call getToken for /api/auth/callback/credentials (purely public API path)", async () => {
    // Arrange — this path starts with /api/auth, which is in publicPaths but
    // is not /login or /signup, so getToken is never invoked.
    const req = makeRequest("/api/auth/callback/credentials");

    // Act
    const res = await proxy(req);

    // Assert
    expect(mockGetToken).not.toHaveBeenCalled();
    // next() has no status property in NextResponse; check it is not a redirect
    expect(res.status).not.toBe(302);
    expect(res.status).not.toBe(401);
  });

  it("should not call getToken for /api/auth/session", async () => {
    // Arrange
    const req = makeRequest("/api/auth/session");

    // Act
    await proxy(req);

    // Assert
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // /login — public path, but getToken IS called to detect authenticated users
  // -------------------------------------------------------------------------

  it("should pass through /login and return next() when the user is unauthenticated", async () => {
    // Arrange — no token → user is not logged in
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest("/login");

    // Act
    const res = await proxy(req);

    // Assert
    expect(mockGetToken).toHaveBeenCalledOnce();
    expect(res.status).not.toBe(302);
    expect(res.status).not.toBe(401);
  });

  it("should redirect /login to /app/dashboard when the user is already authenticated", async () => {
    // Arrange — valid token → user is logged in
    mockGetToken.mockResolvedValue(STUB_TOKEN);
    const req = makeRequest("/login");

    // Act
    const res = await proxy(req);

    // Assert
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/app/dashboard");
  });

  // -------------------------------------------------------------------------
  // /signup — same behaviour as /login
  // -------------------------------------------------------------------------

  it("should pass through /signup and return next() when the user is unauthenticated", async () => {
    // Arrange
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest("/signup");

    // Act
    const res = await proxy(req);

    // Assert
    expect(mockGetToken).toHaveBeenCalledOnce();
    expect(res.status).not.toBe(302);
    expect(res.status).not.toBe(401);
  });

  it("should redirect /signup to /app/dashboard when the user is already authenticated", async () => {
    // Arrange
    mockGetToken.mockResolvedValue(STUB_TOKEN);
    const req = makeRequest("/signup");

    // Act
    const res = await proxy(req);

    // Assert
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/app/dashboard");
  });

  // -------------------------------------------------------------------------
  // Protected /app routes — unauthenticated → redirect to /login
  // -------------------------------------------------------------------------

  it("should redirect unauthenticated request to /app/dashboard → /login with callbackUrl", async () => {
    // Arrange
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest("/app/dashboard");

    // Act
    const res = await proxy(req);

    // Assert
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("callbackUrl=%2Fapp%2Fdashboard");
  });

  it("should allow authenticated request to /app/dashboard through", async () => {
    // Arrange
    mockGetToken.mockResolvedValue(STUB_TOKEN);
    const req = makeRequest("/app/dashboard");

    // Act
    const res = await proxy(req);

    // Assert — NextResponse.next() returns a 200 with no location header
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).not.toBe(307);
    expect(res.status).not.toBe(401);
  });

  // -------------------------------------------------------------------------
  // Protected /api routes — unauthenticated → 401 JSON
  // -------------------------------------------------------------------------

  it("should return 401 JSON for unauthenticated request to /api/transactions", async () => {
    // Arrange
    mockGetToken.mockResolvedValue(null);
    const req = makeRequest("/api/transactions");

    // Act
    const res = await proxy(req);

    // Assert
    expect(res.status).toBe(401);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("Unauthorized");
  });

  it("should allow authenticated request to /api/transactions through", async () => {
    // Arrange
    mockGetToken.mockResolvedValue(STUB_TOKEN);
    const req = makeRequest("/api/transactions");

    // Act
    const res = await proxy(req);

    // Assert
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(307);
  });
});
