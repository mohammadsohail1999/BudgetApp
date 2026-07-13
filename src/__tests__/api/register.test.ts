import { vi, describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — established before any imports so the module graph receives
// the fakes instead of real implementations.
// ---------------------------------------------------------------------------

const mockConnectDB = vi.hoisted(() => vi.fn());

// User.findOne() → { lean() } → null | existing doc
const mockUserLean = vi.hoisted(() => vi.fn());
const mockUserFindOne = vi.hoisted(() => vi.fn(() => ({ lean: mockUserLean })));
const mockUserCreate = vi.hoisted(() => vi.fn());

// Category.insertMany()
const mockInsertMany = vi.hoisted(() => vi.fn());

// bcrypt.hash()
const mockHash = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ connectDB: mockConnectDB }));
vi.mock("@/models/User", () => ({
  User: {
    findOne: mockUserFindOne,
    create: mockUserCreate,
  },
}));
vi.mock("@/models/Category", () => ({
  Category: { insertMany: mockInsertMany },
}));
vi.mock("bcryptjs", () => ({
  default: { hash: mockHash },
}));

// ---------------------------------------------------------------------------
// Import the handler AFTER mocks are in place.
// ---------------------------------------------------------------------------
import { POST } from "@/app/api/auth/register/route";
import { DEFAULT_CATEGORIES } from "@/lib/defaultCategories";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_BODY = {
  name: "Alice",
  email: "alice@example.com",
  password: "password123",
} as const;

const HASHED_PASSWORD = "bcrypt-hashed-value";
const CREATED_USER_ID = "new-user-id-789";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
    // Default: user does not exist
    mockUserLean.mockResolvedValue(null);
    mockUserFindOne.mockReturnValue({ lean: mockUserLean });
    // Default: create returns a user doc with _id
    mockUserCreate.mockResolvedValue({ _id: CREATED_USER_ID });
    mockHash.mockResolvedValue(HASHED_PASSWORD);
    mockInsertMany.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  // 400 — Validation errors
  // -------------------------------------------------------------------------

  it("should return 400 when request body is not valid JSON", async () => {
    // Arrange — non-JSON body causes req.json() to throw
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json {{",
    });

    // Act
    const res = await POST(req as never);

    // Assert
    expect(res.status).toBe(400);
    const json = await res.json() as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
  });

  it("should return 400 when name is missing", async () => {
    // Arrange
    const body = { email: "alice@example.com", password: "password123" };

    // Act
    const res = await POST(makePostRequest(body) as never);

    // Assert
    expect(res.status).toBe(400);
    const json = await res.json() as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe("string");
    expect(json.error.length).toBeGreaterThan(0);
  });

  it("should return 400 when email is missing", async () => {
    // Arrange
    const body = { name: "Alice", password: "password123" };

    // Act
    const res = await POST(makePostRequest(body) as never);

    // Assert
    expect(res.status).toBe(400);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(false);
  });

  it("should return 400 when email is not a valid email address", async () => {
    // Arrange
    const body = { name: "Alice", email: "not-valid", password: "password123" };

    // Act
    const res = await POST(makePostRequest(body) as never);

    // Assert
    expect(res.status).toBe(400);
    const json = await res.json() as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toBe("Enter a valid email address.");
  });

  it("should return 400 when password is shorter than 8 characters", async () => {
    // Arrange
    const body = { name: "Alice", email: "alice@example.com", password: "short" };

    // Act
    const res = await POST(makePostRequest(body) as never);

    // Assert
    expect(res.status).toBe(400);
    const json = await res.json() as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toBe("Password must be at least 8 characters.");
  });

  it("should return 400 when name is empty string", async () => {
    // Arrange
    const body = { name: "", email: "alice@example.com", password: "password123" };

    // Act
    const res = await POST(makePostRequest(body) as never);

    // Assert
    expect(res.status).toBe(400);
    const json = await res.json() as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toBe("Name is required.");
  });

  // -------------------------------------------------------------------------
  // 409 — Conflict
  // -------------------------------------------------------------------------

  it("should return 409 when a user with that email already exists", async () => {
    // Arrange — lean() returns an existing user document
    mockUserLean.mockResolvedValue({ _id: "existing-id", email: VALID_BODY.email });

    // Act
    const res = await POST(makePostRequest(VALID_BODY) as never);

    // Assert
    expect(res.status).toBe(409);
    const json = await res.json() as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toBe("An account with this email already exists.");
  });

  // -------------------------------------------------------------------------
  // 201 — Success
  // -------------------------------------------------------------------------

  it("should return 201 with ok:true on valid input", async () => {
    // Act
    const res = await POST(makePostRequest(VALID_BODY) as never);

    // Assert
    expect(res.status).toBe(201);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("should call bcrypt.hash with cost factor 12 on valid input", async () => {
    // Act
    await POST(makePostRequest(VALID_BODY) as never);

    // Assert
    expect(mockHash).toHaveBeenCalledWith(VALID_BODY.password, 12);
  });

  it("should create the user with the hashed password", async () => {
    // Act
    await POST(makePostRequest(VALID_BODY) as never);

    // Assert
    expect(mockUserCreate).toHaveBeenCalledWith({
      name: VALID_BODY.name,
      email: VALID_BODY.email,
      password: HASHED_PASSWORD,
    });
  });

  it("should seed default categories for the new user via Category.insertMany", async () => {
    // Act
    await POST(makePostRequest(VALID_BODY) as never);

    // Assert — insertMany was called with one entry per DEFAULT_CATEGORIES entry,
    // each stamped with the new user's _id.
    expect(mockInsertMany).toHaveBeenCalledOnce();

    const [insertedDocs] = mockInsertMany.mock.calls[0] as [Array<{ userId: string }>];
    expect(insertedDocs).toHaveLength(DEFAULT_CATEGORIES.length);

    // Every inserted doc must reference the newly created user
    for (const doc of insertedDocs) {
      expect(doc.userId).toBe(CREATED_USER_ID);
    }
  });

  it("should not call Category.insertMany when the user already exists", async () => {
    // Arrange
    mockUserLean.mockResolvedValue({ _id: "existing-id", email: VALID_BODY.email });

    // Act
    await POST(makePostRequest(VALID_BODY) as never);

    // Assert
    expect(mockInsertMany).not.toHaveBeenCalled();
  });

  it("should not call User.create when the user already exists", async () => {
    // Arrange
    mockUserLean.mockResolvedValue({ _id: "existing-id", email: VALID_BODY.email });

    // Act
    await POST(makePostRequest(VALID_BODY) as never);

    // Assert
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 400 — Name boundary
  // -------------------------------------------------------------------------

  it("should return 400 when name is longer than 100 characters", async () => {
    // Arrange — 101 characters exceeds the max(100) constraint
    const LONG_NAME = "A".repeat(101);
    const body = { name: LONG_NAME, email: "alice@example.com", password: "password123" };

    // Act
    const res = await POST(makePostRequest(body) as never);

    // Assert
    expect(res.status).toBe(400);
    const json = await res.json() as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toBe("Name must be 100 characters or fewer.");
  });

  // -------------------------------------------------------------------------
  // Error propagation — connectDB, User.create, Category.insertMany are bare
  // awaits with no try/catch, so errors from them propagate out of POST.
  // -------------------------------------------------------------------------

  it("should propagate the error when connectDB throws", async () => {
    // Arrange
    const DB_ERROR = new Error("Connection refused");
    mockConnectDB.mockRejectedValue(DB_ERROR);

    // Act / Assert — no try/catch wraps connectDB in the route handler
    await expect(POST(makePostRequest(VALID_BODY) as never)).rejects.toThrow(
      "Connection refused",
    );
  });

  it("should propagate the error when User.create throws", async () => {
    // Arrange — findOne returns null so we pass the conflict check, then create fails
    const CREATE_ERROR = new Error("User.create failed");
    mockUserCreate.mockRejectedValue(CREATE_ERROR);

    // Act / Assert
    await expect(POST(makePostRequest(VALID_BODY) as never)).rejects.toThrow(
      "User.create failed",
    );
  });

  it("should propagate the error when Category.insertMany throws", async () => {
    // Arrange — user is created successfully, but seeding categories fails
    const INSERT_ERROR = new Error("insertMany failed");
    mockInsertMany.mockRejectedValue(INSERT_ERROR);

    // Act / Assert
    await expect(POST(makePostRequest(VALID_BODY) as never)).rejects.toThrow(
      "insertMany failed",
    );
  });
});
