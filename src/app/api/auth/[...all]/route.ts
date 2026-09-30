import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

// Intercepte toutes les requêtes GET et POST vers /api/auth/* et les confie à Better Auth
export const { GET, POST } = toNextJsHandler(auth)