
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
    },
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    annonce: {
      findUnique: mocks.findUnique,
      update: mocks.update,
      updateMany: mocks.updateMany,
    },
  },
}))

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { updateStatutPublication } from
  "../src/app/agent/annonces/[id]/actions"

describe("Sécurité AGENT - Protection IDOR", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mocks.findUnique.mockResolvedValue({
      id: "annonce-agent-a",
      auteurId: "agent-a",
      type: "VENTE",
    })

    mocks.update.mockResolvedValue({
      id: "annonce-agent-a",
    })

    mocks.updateMany.mockResolvedValue({
      count: 1,
    })
  })

  it(
    "interdit à l'agent B de modifier une annonce de l'agent A",
    async () => {
      // L'utilisateur connecté est l'agent B.
      mocks.getSession.mockResolvedValue({
        user: {
          id: "agent-b",
          role: "AGENT",
        },
      })

      // Il tente de publier une annonce de l'agent A.
      const formData = new FormData()
      formData.set("statut", "PUBLIE")

      await updateStatutPublication(
        "annonce-agent-a",
        formData,
      )

      // Aucune modification ne doit être effectuée.
      expect(mocks.update).not.toHaveBeenCalled()
      expect(mocks.updateMany).not.toHaveBeenCalled()
    },
  )
})
