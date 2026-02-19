import { test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Initial state ---

test("exposes signIn, signUp, and isLoading", () => {
  const { result } = renderHook(() => useAuth());
  expect(result.current.signIn).toBeTypeOf("function");
  expect(result.current.signUp).toBeTypeOf("function");
  expect(result.current.isLoading).toBe(false);
});

// --- signIn happy paths ---

test("signIn calls signInAction with provided credentials", async () => {
  (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(signInAction).toHaveBeenCalledWith("user@example.com", "password123");
});

test("signIn returns the result from signInAction", async () => {
  const authResult = { success: false, error: "Invalid credentials" };
  (signInAction as any).mockResolvedValue(authResult);

  const { result } = renderHook(() => useAuth());

  let returned: any;
  await act(async () => {
    returned = await result.current.signIn("user@example.com", "wrongpassword");
  });

  expect(returned).toEqual(authResult);
});

// --- signIn loading state ---

test("signIn sets isLoading to true during execution and false after", async () => {
  let resolveSignIn!: (value: any) => void;
  const pendingPromise = new Promise((res) => {
    resolveSignIn = res;
  });
  (signInAction as any).mockReturnValue(pendingPromise);

  const { result } = renderHook(() => useAuth());
  expect(result.current.isLoading).toBe(false);

  let signInPromise: Promise<any>;
  act(() => {
    signInPromise = result.current.signIn("user@example.com", "password");
  });

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveSignIn({ success: false });
    await signInPromise!;
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn resets isLoading to false even when signInAction throws", async () => {
  (signInAction as any).mockRejectedValue(new Error("Network error"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password").catch(() => {});
  });

  expect(result.current.isLoading).toBe(false);
});

// --- signIn failure: no navigation ---

test("signIn does not navigate when sign-in fails", async () => {
  (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "wrongpassword");
  });

  expect(mockPush).not.toHaveBeenCalled();
});

// --- signUp happy paths ---

test("signUp calls signUpAction with provided credentials", async () => {
  (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("user@example.com", "password123");
  });

  expect(signUpAction).toHaveBeenCalledWith("user@example.com", "password123");
});

test("signUp returns the result from signUpAction", async () => {
  const authResult = { success: false, error: "Email already registered" };
  (signUpAction as any).mockResolvedValue(authResult);

  const { result } = renderHook(() => useAuth());

  let returned: any;
  await act(async () => {
    returned = await result.current.signUp("existing@example.com", "password123");
  });

  expect(returned).toEqual(authResult);
});

// --- signUp loading state ---

test("signUp sets isLoading to true during execution and false after", async () => {
  let resolveSignUp!: (value: any) => void;
  const pendingPromise = new Promise((res) => {
    resolveSignUp = res;
  });
  (signUpAction as any).mockReturnValue(pendingPromise);

  const { result } = renderHook(() => useAuth());
  expect(result.current.isLoading).toBe(false);

  let signUpPromise: Promise<any>;
  act(() => {
    signUpPromise = result.current.signUp("user@example.com", "password");
  });

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveSignUp({ success: false });
    await signUpPromise!;
  });

  expect(result.current.isLoading).toBe(false);
});

test("signUp resets isLoading to false even when signUpAction throws", async () => {
  (signUpAction as any).mockRejectedValue(new Error("Network error"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("user@example.com", "password").catch(() => {});
  });

  expect(result.current.isLoading).toBe(false);
});

// --- signUp failure: no navigation ---

test("signUp does not navigate when sign-up fails", async () => {
  (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("user@example.com", "password123");
  });

  expect(mockPush).not.toHaveBeenCalled();
});

// --- Post-auth: anonymous work exists ---

test("creates project from anon work data and redirects after successful signIn", async () => {
  const anonMessages = [{ role: "user", content: "hello" }];
  const anonFsData = { "/App.jsx": "code" };
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue({ messages: anonMessages, fileSystemData: anonFsData });
  (createProject as any).mockResolvedValue({ id: "proj-anon-123" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(createProject).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: anonMessages,
      data: anonFsData,
    })
  );
  expect(clearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/proj-anon-123");
});

test("skips getProjects when anon work exists with messages", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue({
    messages: [{ role: "user", content: "hi" }],
    fileSystemData: {},
  });
  (createProject as any).mockResolvedValue({ id: "proj-anon-456" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(getProjects).not.toHaveBeenCalled();
});

test("creates project from anon work and redirects after successful signUp", async () => {
  const anonMessages = [{ role: "user", content: "design something" }];
  (signUpAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue({ messages: anonMessages, fileSystemData: {} });
  (createProject as any).mockResolvedValue({ id: "proj-signup" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@example.com", "password123");
  });

  expect(createProject).toHaveBeenCalledWith(
    expect.objectContaining({ messages: anonMessages })
  );
  expect(clearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/proj-signup");
});

// --- Post-auth: no anon work, existing projects ---

test("redirects to the most recent project when no anon work and projects exist", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([
    { id: "proj-recent", name: "Recent" },
    { id: "proj-old", name: "Old" },
  ]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockPush).toHaveBeenCalledWith("/proj-recent");
  expect(createProject).not.toHaveBeenCalled();
});

// --- Post-auth: no anon work, no existing projects ---

test("creates a new project and redirects when no anon work and no projects exist after signIn", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([]);
  (createProject as any).mockResolvedValue({ id: "proj-new-789" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(createProject).toHaveBeenCalledWith(
    expect.objectContaining({ messages: [], data: {} })
  );
  expect(mockPush).toHaveBeenCalledWith("/proj-new-789");
});

test("creates a new project and redirects when no anon work and no projects exist after signUp", async () => {
  (signUpAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue(null);
  (getProjects as any).mockResolvedValue([]);
  (createProject as any).mockResolvedValue({ id: "proj-brand-new" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@example.com", "password123");
  });

  expect(mockPush).toHaveBeenCalledWith("/proj-brand-new");
});

// --- Edge case: anon work with empty messages ---

test("falls through to getProjects when anonWork has empty messages array", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue({ messages: [], fileSystemData: {} });
  (getProjects as any).mockResolvedValue([{ id: "proj-existing" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(createProject).not.toHaveBeenCalled();
  expect(getProjects).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/proj-existing");
});

test("does not clear anon work when messages are empty", async () => {
  (signInAction as any).mockResolvedValue({ success: true });
  (getAnonWorkData as any).mockReturnValue({ messages: [], fileSystemData: {} });
  (getProjects as any).mockResolvedValue([{ id: "proj-existing" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(clearAnonWork).not.toHaveBeenCalled();
});
