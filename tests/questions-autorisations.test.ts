
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  annonceFindFirst: vi.fn(),
  questionCreate: vi.fn(),
  questionFindUnique: vi.fn(),
  questionUpdate: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
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
      findFirst: mocks.annonceFindFirst,
    },
    question: {
      create: mocks.questionCreate,
      findUnique: mocks.questionFindUnique,
      update: mocks.questionUpdate,
    },
  },
}))

import {
  poserQuestion,
  repondreQuestion,
} from "@/actions/question"

type Role = "USER" | "AGENT" | "ADMIN"

function connecter(id: string, role: Role) {
  mocks.getSession.mockResolvedValue({
    user: { id, role },
  })
}

function formulaireQuestion(
  texte = "Le bien est-il toujours disponible ?",
  annonceId = "annonce-a",
) {
  const data = new FormData()
  data.set("annonceId", annonceId)
  data.set("texte", texte)
  return data
}

function formulaireReponse(
  reponse = "Oui, ce bien est disponible.",
  questionId = "question-a",
) {
  const data = new FormData()
  data.set("questionId", questionId)
  data.set("reponse", reponse)
  return data
}

async function poser(data = formulaireQuestion()) {
  return poserQuestion({ success: false }, data)
}

async function repondre(data = formulaireReponse()) {
  return repondreQuestion({ success: false }, data)
}

beforeEach(() => {
  vi.resetAllMocks()

  mocks.getSession.mockResolvedValue(null)

  mocks.annonceFindFirst.mockResolvedValue({
    id: "annonce-a",
  })

  mocks.questionCreate.mockResolvedValue({
    id: "question-a",
  })

  mocks.questionFindUnique.mockResolvedValue({
    id: "question-a",
    annonceId: "annonce-a",
    annonce: {
      auteurId: "agent-a",
    },
  })

  mocks.questionUpdate.mockResolvedValue({
    id: "question-a",
  })
})

describe("Autorisation - Poser une question", () => {
  it("refuse un visiteur non connecté", async () => {
    const result = await poser()

    expect(result.success).toBe(false)
    expect(mocks.questionCreate).not.toHaveBeenCalled()
  })

  it("refuse un AGENT", async () => {
    connecter("agent-a", "AGENT")

    const result = await poser()

    expect(result.success).toBe(false)
    expect(mocks.questionCreate).not.toHaveBeenCalled()
  })

  it("autorise un USER sur une annonce publiée", async () => {
    connecter("user-a", "USER")

    const result = await poser()

    expect(result.success).toBe(true)

    expect(mocks.annonceFindFirst).toHaveBeenCalledWith({
      where: {
        id: "annonce-a",
        statut: "PUBLIE",
      },
      select: { id: true },
    })

    expect(mocks.questionCreate).toHaveBeenCalledWith({
      data: {
        texte: "Le bien est-il toujours disponible ?",
        auteurId: "user-a",
        annonceId: "annonce-a",
      },
    })

    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/annonces/annonce-a",
    )
  })

  it("autorise un ADMIN à poser une question", async () => {
    connecter("admin-a", "ADMIN")

    const result = await poser()

    expect(result.success).toBe(true)

    expect(mocks.questionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        auteurId: "admin-a",
      }),
    })
  })

  it("ignore un auteurId falsifié", async () => {
    connecter("user-a", "USER")

    const data = formulaireQuestion()
    data.set("auteurId", "admin-a")

    const result = await poser(data)

    expect(result.success).toBe(true)

    expect(mocks.questionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        auteurId: "user-a",
      }),
    })
  })

  it("refuse une question trop courte", async () => {
    connecter("user-a", "USER")

    const result = await poser(
      formulaireQuestion("abc"),
    )

    expect(result.success).toBe(false)
    expect(result.errors?.texte).toBeDefined()
    expect(result.values?.texte).toBe("abc")

    expect(mocks.questionCreate).not.toHaveBeenCalled()
  })

  it("refuse un identifiant d'annonce vide", async () => {
    connecter("user-a", "USER")

    const result = await poser(
      formulaireQuestion(
        "Le bien est-il disponible ?",
        "",
      ),
    )

    expect(result.success).toBe(false)
    expect(mocks.annonceFindFirst).not.toHaveBeenCalled()
    expect(mocks.questionCreate).not.toHaveBeenCalled()
  })

  it("refuse une question sur un brouillon", async () => {
    connecter("user-a", "USER")

    // Un brouillon ne doit pas être trouvé
    // par une recherche limitée au statut PUBLIE.
    mocks.annonceFindFirst.mockResolvedValue(null)

    const result = await poser()

    expect(result.success).toBe(false)
    expect(result.message).toBe(
      "Cette annonce n'est plus disponible.",
    )

    expect(mocks.annonceFindFirst).toHaveBeenCalledWith({
      where: {
        id: "annonce-a",
        statut: "PUBLIE",
      },
      select: { id: true },
    })

    expect(mocks.questionCreate).not.toHaveBeenCalled()
  })
})

describe("Autorisation - Répondre à une question", () => {
  it("refuse un visiteur non connecté", async () => {
    const result = await repondre()

    expect(result.success).toBe(false)
    expect(mocks.questionUpdate).not.toHaveBeenCalled()
  })

  it("refuse un USER", async () => {
    connecter("user-a", "USER")

    const result = await repondre()

    expect(result.success).toBe(false)
    expect(mocks.questionUpdate).not.toHaveBeenCalled()
  })

  it("refuse l'AGENT B sur une annonce de A", async () => {
    connecter("agent-b", "AGENT")

    const result = await repondre()

    expect(result.success).toBe(false)
    expect(result.message).toContain(
      "pas autorisé à répondre à cette question",
    )

    expect(mocks.questionUpdate).not.toHaveBeenCalled()
  })

  it("autorise l'AGENT propriétaire", async () => {
    connecter("agent-a", "AGENT")

    const result = await repondre()

    expect(result.success).toBe(true)

    expect(mocks.questionUpdate).toHaveBeenCalledWith({
      where: {
        id: "question-a",
      },
      data: {
        reponse: "Oui, ce bien est disponible.",
      },
    })

    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/annonces/annonce-a",
    )
  })

  it("autorise un ADMIN à répondre", async () => {
    connecter("admin-a", "ADMIN")

    const result = await repondre()

    expect(result.success).toBe(true)
    expect(mocks.questionUpdate).toHaveBeenCalledOnce()
  })

  it("refuse une réponse trop courte", async () => {
    connecter("agent-a", "AGENT")

    const result = await repondre(
      formulaireReponse("a"),
    )

    expect(result.success).toBe(false)
    expect(result.errors?.reponse).toBeDefined()
    expect(result.values?.reponse).toBe("a")

    expect(mocks.questionUpdate).not.toHaveBeenCalled()
  })

  it("refuse un identifiant de question vide", async () => {
    connecter("agent-a", "AGENT")

    const result = await repondre(
      formulaireReponse(
        "Oui, le bien est disponible.",
        "",
      ),
    )

    expect(result.success).toBe(false)
    expect(mocks.questionFindUnique).not.toHaveBeenCalled()
    expect(mocks.questionUpdate).not.toHaveBeenCalled()
  })

  it("refuse une question inexistante", async () => {
    connecter("agent-a", "AGENT")

    mocks.questionFindUnique.mockResolvedValue(null)

    const result = await repondre()

    expect(result.success).toBe(false)
    expect(result.message).toBe(
      "Cette question n'existe pas.",
    )

    expect(mocks.questionUpdate).not.toHaveBeenCalled()
  })
})
