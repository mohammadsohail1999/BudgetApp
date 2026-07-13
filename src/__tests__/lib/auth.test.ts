import { vi, describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock factories — must be declared before vi.mock() calls so that
// the factory closures can close over them. vi.hoisted() ensures these run
// before module imports are resolved.
// ---------------------------------------------------------------------------

const mockConnectDB = vi.hoisted(() => vi.fn());

// User.findOne() returns { select() } → select("+password") returns { lean() }
// → lean() returns a Promise of the user document or null.
const mockLean = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn(() => ({ lean: mockLean })));
const mockFindOne = vi.hoisted(() => vi.fn(() => ({ select: mockSelect })));

const mockCompare = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ connectDB: mockConnectDB }));
vi.mock("@/models/User", () => ({ User: { findOne: mockFindOne } }));
vi.mock("bcryptjs", () => ({ default: { compare: mockCompare } }));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are declared so it receives them.
// ---------------------------------------------------------------------------
import { authOptions } from "@/lib/auth";
import type { CredentialsConfig } from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// The provider at index 0 is always a CredentialsConfig. The cast is safe
// because the source configures exactly one provider of this type.
type AuthorizeFn = NonNullable<CredentialsConfig["authorize"]>;
type AuthorizeSecondParam = Parameters<AuthorizeFn>[1];

// authorize's second parameter (the raw request) is unused by our implementation.
// We cast an empty object to satisfy the type requirement.
const STUB_REQ = {} as AuthorizeSecondParam;

// next-auth's CredentialsProvider stores `authorize: () => null` on the
// returned object and places the real function inside `options`. We must
// reach into `options` to get the actual implementation.
type CredentialsProviderInternal = CredentialsConfig & {
  options: CredentialsConfig;
};
const credentialsProvider = authOptions.providers[0] as unknown as CredentialsProviderInternal;
const authorize = credentialsProvider.options.authorize!;

const VALID_CREDENTIALS = { email: "alice@example.com", password: "password123" } as const;

const MOCK_USER_DOC = {
  _id: { toString: () => "user-id-abc123" },
  name: "Alice",
  email: "alice@example.com",
  password: "hashed-password",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("authOptions – authorize()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default chain: findOne → select → lean → null (no user found)
    mockLean.mockResolvedValue(null);
    mockSelect.mockReturnValue({ lean: mockLean });
    mockFindOne.mockReturnValue({ select: mockSelect });
    mockConnectDB.mockResolvedValue(undefined);
    mockCompare.mockResolvedValue(false);
  });

  it("should return null when email is not a valid email address", async () => {
    // Arrange
    const badCredentials = { email: "not-an-email", password: "password123" };

    // Act
    const result = await authorize(badCredentials, STUB_REQ);

    // Assert
    expect(result).toBeNull();
    // DB should never be hit for invalid input
    expect(mockConnectDB).not.toHaveBeenCalled();
  });

  it("should return null when password is shorter than 8 characters", async () => {
    // Arrange
    const badCredentials = { email: "alice@example.com", password: "short" };

    // Act
    const result = await authorize(badCredentials, STUB_REQ);

    // Assert
    expect(result).toBeNull();
    expect(mockConnectDB).not.toHaveBeenCalled();
  });

  it("should return null when credentials are undefined", async () => {
    // Act
    const result = await authorize(undefined, STUB_REQ);

    // Assert
    expect(result).toBeNull();
    expect(mockConnectDB).not.toHaveBeenCalled();
  });

  it("should return null when no user exists in the database", async () => {
    // Arrange — mockLean returns null (user not found, which is the default)
    mockLean.mockResolvedValue(null);

    // Act
    const result = await authorize(VALID_CREDENTIALS, STUB_REQ);

    // Assert
    expect(result).toBeNull();
    expect(mockFindOne).toHaveBeenCalledWith({ email: VALID_CREDENTIALS.email });
  });

  it("should return null when bcrypt.compare returns false", async () => {
    // Arrange — user found but password does not match
    mockLean.mockResolvedValue(MOCK_USER_DOC);
    mockCompare.mockResolvedValue(false);

    // Act
    const result = await authorize(VALID_CREDENTIALS, STUB_REQ);

    // Assert
    expect(result).toBeNull();
    expect(mockCompare).toHaveBeenCalledWith(
      VALID_CREDENTIALS.password,
      MOCK_USER_DOC.password,
    );
  });

  it("should return { id, name, email } when credentials are valid and password matches", async () => {
    // Arrange
    mockLean.mockResolvedValue(MOCK_USER_DOC);
    mockCompare.mockResolvedValue(true);

    // Act
    const result = await authorize(VALID_CREDENTIALS, STUB_REQ);

    // Assert
    expect(result).toEqual({
      id: MOCK_USER_DOC._id.toString(),
      name: MOCK_USER_DOC.name,
      email: MOCK_USER_DOC.email,
    });
  });

  it("should query with .select('+password') to include the excluded field", async () => {
    // Arrange
    mockLean.mockResolvedValue(MOCK_USER_DOC);
    mockCompare.mockResolvedValue(true);

    // Act
    await authorize(VALID_CREDENTIALS, STUB_REQ);

    // Assert — the password field is excluded by default; the query must opt in
    expect(mockSelect).toHaveBeenCalledWith("+password");
  });

  // -------------------------------------------------------------------------
  // Error propagation — no try/catch in authorize(), all errors surface to caller
  // -------------------------------------------------------------------------

  it("should propagate the error when connectDB throws", async () => {
    // Arrange
    const DB_ERROR = new Error("MongoDB connection failed");
    mockConnectDB.mockRejectedValue(DB_ERROR);

    // Act / Assert — authorize has no try/catch, so the rejection bubbles out
    await expect(authorize(VALID_CREDENTIALS, STUB_REQ)).rejects.toThrow(
      "MongoDB connection failed",
    );
  });

  it("should propagate the error when User.findOne().select().lean() rejects", async () => {
    // Arrange
    const QUERY_ERROR = new Error("findOne query failed");
    mockLean.mockRejectedValue(QUERY_ERROR);

    // Act / Assert
    await expect(authorize(VALID_CREDENTIALS, STUB_REQ)).rejects.toThrow(
      "findOne query failed",
    );
  });

  it("should propagate the error when bcrypt.compare throws", async () => {
    // Arrange — user is found so the code reaches bcrypt.compare
    mockLean.mockResolvedValue(MOCK_USER_DOC);
    const BCRYPT_ERROR = new Error("bcrypt internal error");
    mockCompare.mockRejectedValue(BCRYPT_ERROR);

    // Act / Assert
    await expect(authorize(VALID_CREDENTIALS, STUB_REQ)).rejects.toThrow(
      "bcrypt internal error",
    );
  });
});

// ---------------------------------------------------------------------------
// jwt callback
// ---------------------------------------------------------------------------

describe("authOptions – callbacks.jwt()", () => {
  const jwtCallback = authOptions.callbacks!.jwt!;

  it("should stamp token.id from user.id when user is present", async () => {
    // Arrange
    const token: JWT = { sub: "sub-123" };
    const user = { id: "user-id-456", name: "Alice", email: "alice@example.com" };

    // Act
    const result = await jwtCallback({ token, user, account: null });

    // Assert
    expect(result).toMatchObject({ sub: "sub-123", id: "user-id-456" });
  });

  it("should leave the token unchanged when user is absent (subsequent requests)", async () => {
    // Arrange
    const token: JWT = { sub: "sub-123", id: "existing-id" };

    // Act — no user provided, simulating a subsequent session check
    const result = await jwtCallback({ token });

    // Assert
    expect(result).toEqual({ sub: "sub-123", id: "existing-id" });
  });
});

// ---------------------------------------------------------------------------
// session callback
// ---------------------------------------------------------------------------

describe("authOptions – callbacks.session()", () => {
  const sessionCallback = authOptions.callbacks!.session!;

  it("should copy token.id into session.user.id", async () => {
    // Arrange
    const session: Session = {
      user: { id: "", name: "Alice", email: "alice@example.com" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    };
    const token: JWT = { sub: "sub-123", id: "token-user-id" };

    // Act — user param is required by type but unused by our JWT-strategy implementation
    const result = await sessionCallback({
      session,
      token,
      user: undefined as never,
    });

    // Assert
    expect(result.user.id).toBe("token-user-id");
  });

  it("should not modify session.user.id when token has no id field", async () => {
    // Arrange — token without an id (e.g. before sign-in completes)
    const session: Session = {
      user: { id: "original-id", name: "Alice", email: "alice@example.com" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    };
    const token: JWT = { sub: "sub-123" };

    // Act
    const result = await sessionCallback({
      session,
      token,
      user: undefined as never,
    });

    // Assert — original value untouched
    expect(result.user.id).toBe("original-id");
  });
});
