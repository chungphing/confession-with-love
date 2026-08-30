"use client";

import { useSyncExternalStore } from "react";

export interface AuthUser {
  email: string;
}

interface StoredUser {
  email: string;
  password: string;
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

const USERS_KEY = "cwl.users";
const SESSION_KEY = "cwl.session";

export const DEMO_CREDENTIALS = {
  email: "demo@confess.app",
  password: "demo123",
};

let users: StoredUser[] | null = null;
let session: AuthUser | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  if (users !== null) return users;
  const raw = window.localStorage.getItem(USERS_KEY);
  const parsed = raw ? (JSON.parse(raw) as StoredUser[]) : [];
  if (parsed.length === 0) {
    parsed.push({ email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password });
    window.localStorage.setItem(USERS_KEY, JSON.stringify(parsed));
  }
  users = parsed;
  return users;
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  loadUsers();
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      session = JSON.parse(raw) as AuthUser;
    } catch {
      session = null;
    }
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function getCurrentUser(): AuthUser | null {
  init();
  return session;
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAuth(): { user: AuthUser | null } {
  const user = useSyncExternalStore(subscribeAuth, getCurrentUser, () => null);
  return { user };
}

export function registerUser(email: string, password: string): AuthResult {
  init();
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  const list = loadUsers();
  if (list.some((u) => u.email === normalized)) {
    return { ok: false, error: "An account with this email already exists." };
  }
  list.push({ email: normalized, password });
  window.localStorage.setItem(USERS_KEY, JSON.stringify(list));
  session = { email: normalized };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emit();
  return { ok: true, user: session };
}

export function loginUser(email: string, password: string): AuthResult {
  init();
  const normalized = email.trim().toLowerCase();
  const list = loadUsers();
  const found = list.find(
    (u) => u.email === normalized && u.password === password,
  );
  if (!found) {
    return { ok: false, error: "Invalid email or password." };
  }
  session = { email: found.email };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emit();
  return { ok: true, user: session };
}

export function logout(): void {
  if (typeof window === "undefined") return;
  session = null;
  window.localStorage.removeItem(SESSION_KEY);
  emit();
}
