import { createContext, useContext } from "react";
import type { Session } from "./types";
export const AuthContext = createContext<Session | null>(null);
export function useAuth(): Session {
  const session = useContext(AuthContext);
  if (!session)
    throw new Error("Authenticated workspace context is unavailable");
  return session;
}
