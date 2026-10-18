export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { PropertyList } from "@/components/PropertyList"; // On utilise le vrai composant

export default async function HomePage() {
 const annoncesFromDB = await prisma.annonce.findMany({
  where: {
    statut: "PUBLIE",
  },
  orderBy: {
    createdAt: "desc",
  },
  include: {
    photos: true,
  },
})

const properties = annoncesFromDB.map((annonce) => ({
  ...annonce,
  prix: Number(annonce.prix),
}))

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-grow">
        <Hero />
        <PropertyList properties={properties} />
      </main>

      <Footer />
    </div>
  );
}