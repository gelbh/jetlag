import { vi } from "vitest";
import "fake-indexeddb/auto";

vi.stubEnv("VITE_USE_FIREBASE_EMULATOR", "true");
vi.stubEnv("VITE_FIREBASE_API_KEY", "demo-api-key");
vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "demo-jetlag.firebaseapp.com");
vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "demo-jetlag");
vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "demo-jetlag.appspot.com");
vi.stubEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "1234567890");
vi.stubEnv("VITE_FIREBASE_APP_ID", "1:1234567890:web:demo");
