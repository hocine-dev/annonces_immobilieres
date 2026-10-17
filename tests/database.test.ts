
import { afterAll, describe, expect, it } from "vitest"
import { prisma } from "../src/lib/prisma"

describe("Isolation de la base de test", () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("utilise exclusivement immo_test", async () => {
    const result = await prisma.$queryRaw<
      { database: string }[]
    >`SELECT current_database() AS database`

    expect(result[0]?.database).toBe("immo_test")
  })
})
