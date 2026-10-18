import "dotenv/config"

import { auth } from "../src/lib/auth"
import { prisma } from "../src/lib/prisma"

type SeedAnnonce = {
  titre: string
  description: string
  type: "VENTE" | "LOCATION"
  typePropriete:
    | "APPARTEMENT"
    | "MAISON"
    | "VILLA"
    | "STUDIO"
    | "LOFT"
  prix: number
  ville: string
  surface: number
  chambres: number
  image: string
}

async function ensureAgent(
  name: string,
  email: string,
  password: string,
) {
  let user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    })

    user = await prisma.user.findUniqueOrThrow({
      where: { email },
    })
  }

  if (user.role !== "AGENT") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "AGENT" },
    })
  }

  return user
}

async function ensureUser(
  name: string,
  email: string,
  password: string,
) {
  let user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    await auth.api.signUpEmail({
      body: { name, email, password },
    })

    user = await prisma.user.findUniqueOrThrow({
      where: { email },
    })
  }

  if (user.role !== "USER") {
    throw new Error(
      `Le compte ${email} existe avec un rôle différent de USER.`,
    )
  }

  return user
}

async function ensureAdmin(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    // Ne jamais promouvoir un compte préexistant non administrateur.
    if (existing.role !== "ADMIN") {
      throw new Error(
        `Le compte ${email} existe avec un autre rôle : promotion automatique refusée.`,
      )
    }
    console.log("[OK] Compte ADMIN déjà présent.")
    return existing
  }

  // Better Auth crée un USER ; la promotion est effectuée côté serveur.
  await auth.api.signUpEmail({ body: { name, email, password } })
  const created = await prisma.user.findUniqueOrThrow({ where: { email } })
  const admin = await prisma.user.update({
    where: { id: created.id },
    data: { role: "ADMIN" },
  })
  console.log("[OK] Compte ADMIN de démonstration créé.")
  return admin
}

const annonces: SeedAnnonce[] = [
  {
    titre: "Appartement haussmannien avec balcon",
    description:
      "Appartement haussmannien lumineux avec balcon, beaux volumes et prestations de caractère au cœur de Paris.",
    type: "VENTE",
    typePropriete: "APPARTEMENT",
    prix: 895000,
    ville: "Paris",
    surface: 96,
    chambres: 3,
    image: "/annonces/uploads/prop-paris.jpg",
  },
  {
    titre: "Loft lumineux rénové, quartier Confluence",
    description:
      "Loft entièrement rénové dans le quartier Confluence à Lyon, avec grands volumes, lumière naturelle et espaces ouverts.",
    type: "LOCATION",
    typePropriete: "LOFT",
    prix: 1850,
    ville: "Lyon",
    surface: 112,
    chambres: 3,
    image: "/annonces/uploads/prop-salon.jpg",
  },
  {
    titre: "Maison en pierre avec jardin arboré",
    description:
      "Belle maison en pierre avec jardin arboré à Bordeaux, idéale pour une famille recherchant calme et authenticité.",
    type: "VENTE",
    typePropriete: "MAISON",
    prix: 620000,
    ville: "Bordeaux",
    surface: 145,
    chambres: 4,
    image: "/annonces/uploads/prop-maison.jpg",
  },
  {
    titre: "Studio moderne au cœur du Vieux-Port",
    description:
      "Studio moderne et lumineux situé à proximité immédiate du Vieux-Port de Marseille, entièrement aménagé et prêt à vivre.",
    type: "LOCATION",
    typePropriete: "STUDIO",
    prix: 850,
    ville: "Marseille",
    surface: 34,
    chambres: 1,
    image: "/annonces/uploads/04-studio-vieux-port-marseille.jpg",
  },
  {
    titre: "Appartement vue mer, Promenade des Anglais",
    description:
      "Appartement élégant offrant une superbe vue mer sur la Promenade des Anglais, avec grande pièce de vie lumineuse.",
    type: "VENTE",
    typePropriete: "APPARTEMENT",
    prix: 760000,
    ville: "Nice",
    surface: 88,
    chambres: 3,
    image: "/annonces/uploads/05-appartement-vue-mer-nice.jpg",
  },
  {
    titre: "Maison familiale proche du centre",
    description:
      "Maison familiale spacieuse située à proximité du centre de Nantes, avec jardin et espaces de vie adaptés à une famille.",
    type: "VENTE",
    typePropriete: "MAISON",
    prix: 415000,
    ville: "Nantes",
    surface: 128,
    chambres: 4,
    image: "/annonces/uploads/06-maison-familiale-nantes.jpg",
  },
  {
    titre: "T3 avec terrasse, quartier Carmes",
    description:
      "Appartement T3 avec terrasse dans le quartier des Carmes à Toulouse, bénéficiant d'une belle luminosité et d'un extérieur agréable.",
    type: "LOCATION",
    typePropriete: "APPARTEMENT",
    prix: 1250,
    ville: "Toulouse",
    surface: 74,
    chambres: 2,
    image: "/annonces/uploads/07-t3-terrasse-toulouse.jpg",
  },
  {
    titre: "Chalet contemporain vue lac",
    description:
      "Chalet contemporain avec vue exceptionnelle sur le lac d'Annecy, grands espaces vitrés et prestations haut de gamme.",
    type: "LOCATION",
    typePropriete: "MAISON",
    prix: 3200,
    ville: "Annecy",
    surface: 160,
    chambres: 5,
    image: "/annonces/uploads/08-chalet-vue-lac-annecy.jpg",
  },
  {
    titre: "Appartement rénové, Vieux-Lille",
    description:
      "Appartement entièrement rénové dans le Vieux-Lille, combinant le charme de l'ancien et des prestations contemporaines.",
    type: "VENTE",
    typePropriete: "APPARTEMENT",
    prix: 365000,
    ville: "Lille",
    surface: 68,
    chambres: 2,
    image: "/annonces/uploads/09-appartement-vieux-lille.jpg",
  },
  {
    titre: "Villa avec piscine face à l'océan",
    description:
      "Villa d'exception avec piscine et vue sur l'océan à Biarritz, entourée d'un jardin paysager et de grandes terrasses.",
    type: "VENTE",
    typePropriete: "VILLA",
    prix: 1450000,
    ville: "Biarritz",
    surface: 210,
    chambres: 5,
    image: "/annonces/uploads/10-villa-piscine-biarritz.jpg",
  },
  {
    titre: "Duplex atypique, bords de Saône",
    description:
      "Duplex atypique situé sur les bords de Saône à Lyon, avec mezzanine, grands volumes et belle luminosité.",
    type: "LOCATION",
    typePropriete: "APPARTEMENT",
    prix: 1650,
    ville: "Lyon",
    surface: 92,
    chambres: 3,
    image: "/annonces/uploads/11-duplex-bords-saone-lyon.jpg",
  },
  {
    titre: "Appartement de standing, Golden Triangle",
    description:
      "Appartement de standing situé dans le Triangle d'Or parisien, avec beaux volumes, finitions haut de gamme et prestations raffinées.",
    type: "VENTE",
    typePropriete: "APPARTEMENT",
    prix: 1250000,
    ville: "Paris",
    surface: 134,
    chambres: 4,
    image: "/annonces/uploads/12-appartement-standing-paris.jpg",
  },
]

async function main() {
  const agent1Email = process.env.SEED_AGENT_1_EMAIL
  const agent1Password = process.env.SEED_AGENT_1_PASSWORD
  const agent2Email = process.env.SEED_AGENT_2_EMAIL
  const agent2Password = process.env.SEED_AGENT_2_PASSWORD

  if (
    !agent1Email ||
    !agent1Password ||
    !agent2Email ||
    !agent2Password
  ) {
    throw new Error(
      "Variables SEED_AGENT_1_EMAIL, SEED_AGENT_1_PASSWORD, SEED_AGENT_2_EMAIL et SEED_AGENT_2_PASSWORD manquantes.",
    )
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim()
  const adminPassword = process.env.SEED_ADMIN_PASSWORD

  if (!adminEmail || !adminPassword || adminPassword.length < 12) {
    throw new Error(
      "SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD (12 caractères minimum) sont obligatoires.",
    )
  }

  const seedEmails = [
    adminEmail,
    agent1Email,
    agent2Email,
    process.env.SEED_USER_1_EMAIL,
    process.env.SEED_USER_2_EMAIL,
  ]
  if (
    seedEmails.some((email) => !email?.trim()) ||
    new Set(seedEmails.map((email) => email!.trim().toLowerCase())).size !== seedEmails.length
  ) {
    throw new Error("Tous les comptes de démonstration doivent avoir des emails distincts.")
  }

  await ensureAdmin("Administrateur Horizon", adminEmail, adminPassword)

  const agent1 = await ensureAgent(
    "Agent Horizon 1",
    agent1Email,
    agent1Password,
  )

  const agent2 = await ensureAgent(
    "Agent Horizon 2",
    agent2Email,
    agent2Password,
  )

  const users = [
    {
      name: "Utilisateur Horizon 1",
      email: process.env.SEED_USER_1_EMAIL,
      password: process.env.SEED_USER_1_PASSWORD,
    },
    {
      name: "Utilisateur Horizon 2",
      email: process.env.SEED_USER_2_EMAIL,
      password: process.env.SEED_USER_2_PASSWORD,
    },
  ]

  if (users.some((user) => !user.email || !user.password)) {
    throw new Error("Variables SEED_USER_1 et SEED_USER_2 incomplètes.")
  }

  const emails = [
    agent1Email,
    agent2Email,
    ...users.map((user) => user.email),
  ]

  if (new Set(emails).size !== emails.length) {
    throw new Error("Chaque compte du seed doit avoir un email distinct.")
  }

  for (const user of users) {
    await ensureUser(user.name, user.email!, user.password!)
  }

  console.log("🏠 Création des annonces...")

  for (const [index, bien] of annonces.entries()) {
    const auteur = index % 2 === 0 ? agent1 : agent2

    const existing = await prisma.annonce.findFirst({
      where: {
        titre: bien.titre,
        auteurId: auteur.id,
      },
      select: { id: true },
    })

    if (existing) {
      console.log(`Annonce déjà présente : ${bien.titre}`)
      continue
    }

    await prisma.annonce.create({
      data: {
        titre: bien.titre,
        description: bien.description,
        type: bien.type,
        typePropriete: bien.typePropriete,
        statut: "PUBLIE",
        etat: "DISPONIBLE",
        prix: bien.prix,
        dateDisponibilite: new Date(),
        ville: bien.ville,
        surface: bien.surface,
        chambres: bien.chambres,
        auteurId: auteur.id,

        photos: {
          create: {
            url: bien.image,
          },
        },
      },
    })

    console.log(
      `✅ ${index + 1}/12 - ${bien.titre} - ${bien.type}`,
    )
  }

  console.log(`🎉 ${annonces.length} annonces créées`)
}

main()
  .catch((error) => {
    console.error("❌ Erreur :", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })