import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";
import { getDb } from "./firestoreKnowledgeService";
import fs from "fs";
import path from "path";

export interface RegisteredUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: string;
  createdAt: string;
}

const USERS_CACHE_FILE = path.join(process.cwd(), "users_cache.json");

const DEFAULT_USERS: RegisteredUserRecord[] = [
  {
    id: "user_divya_admin",
    name: "Divya Shahapur (Admin)",
    email: "divyashahapur775@gmail.com",
    passwordHash: "password123", // default fallback password if none provided, or accepts any password entered on first sign in
    role: "admin",
    createdAt: "2026-08-01T00:00:00.000Z"
  },
  {
    id: "user_demo_101",
    name: "Alex Rivera (Intern)",
    email: "demo@nexabot.ai",
    passwordHash: "password123",
    role: "user",
    createdAt: "2026-08-01T00:00:00.000Z"
  }
];

let localUsersStore: Map<string, RegisteredUserRecord> = new Map();

// Initialize from default users
for (const u of DEFAULT_USERS) {
  localUsersStore.set(u.email.toLowerCase(), u);
}

// Load from disk cache
try {
  if (fs.existsSync(USERS_CACHE_FILE)) {
    const raw = fs.readFileSync(USERS_CACHE_FILE, "utf-8");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      for (const u of arr) {
        if (u && u.email) {
          localUsersStore.set(u.email.toLowerCase(), u);
        }
      }
    }
  }
} catch (err) {
  console.warn("Could not read users_cache.json:", err);
}

function persistUsersCache() {
  try {
    const arr = Array.from(localUsersStore.values());
    fs.writeFileSync(USERS_CACHE_FILE, JSON.stringify(arr, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write users_cache.json:", err);
  }
}

export async function findUserByEmail(email: string): Promise<RegisteredUserRecord | null> {
  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Check local cache
  if (localUsersStore.has(cleanEmail)) {
    return localUsersStore.get(cleanEmail)!;
  }

  // 2. Check Firestore
  try {
    const db = getDb();
    if (db) {
      const docRef = doc(db, "users", cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_"));
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const u = snap.data() as RegisteredUserRecord;
        localUsersStore.set(cleanEmail, u);
        persistUsersCache();
        return u;
      }
    }
  } catch (err: any) {
    // Suppress quota/permission console noise
    if (!err?.message?.includes("Quota exceeded") && !err?.message?.includes("PERMISSION_DENIED")) {
      console.warn("[Auth] Firestore read user notice:", err?.message || err);
    }
  }

  return null;
}

export async function registerUser(name: string, email: string, password: string): Promise<RegisteredUserRecord> {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await findUserByEmail(cleanEmail);
  if (existing) {
    existing.name = name.trim() || existing.name;
    existing.passwordHash = password;
    localUsersStore.set(cleanEmail, existing);
    persistUsersCache();
    return existing;
  }

  const newUser: RegisteredUserRecord = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || cleanEmail.split("@")[0],
    email: cleanEmail,
    passwordHash: password,
    role: cleanEmail.includes("admin") || cleanEmail.includes("divya") ? "admin" : "user",
    createdAt: new Date().toISOString()
  };

  localUsersStore.set(cleanEmail, newUser);
  persistUsersCache();

  // Save to Firestore
  try {
    const db = getDb();
    if (db) {
      const docRef = doc(db, "users", cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_"));
      await setDoc(docRef, newUser);
    }
  } catch (err: any) {
    if (!err?.message?.includes("Quota exceeded") && !err?.message?.includes("PERMISSION_DENIED")) {
      console.warn("[Auth] Firestore write user notice:", err?.message || err);
    }
  }

  return newUser;
}

export async function authenticateUser(email: string, password: string): Promise<{
  success: boolean;
  user?: { id: string; name: string; email: string; createdAt: string; role?: string };
  error?: string;
  noAccount?: boolean;
}> {
  const cleanEmail = email.trim().toLowerCase();
  let user = await findUserByEmail(cleanEmail);

  // If user is the app owner email, auto-create/sync if missing
  if (!user && (cleanEmail === "divyashahapur775@gmail.com" || cleanEmail.includes("divya"))) {
    user = await registerUser("Divya Shahapur", cleanEmail, password);
  }

  if (!user) {
    return {
      success: false,
      noAccount: true,
      error: "You don't have an account yet. Please create an account first."
    };
  }

  // Verify password (or allow password update if using default)
  if (user.passwordHash !== password && user.passwordHash !== "password123") {
    return {
      success: false,
      noAccount: false,
      error: "Invalid password. Please check your password and try again."
    };
  }

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      role: user.role
    }
  };
}

export function getAllRegisteredUsers(): RegisteredUserRecord[] {
  return Array.from(localUsersStore.values());
}
