import { Sora, Manrope } from "next/font/google";
import "./globals.css"; // L'import de ton magnifique fichier CSS

// 1. Configuration de la police pour les titres
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display", // On relie cette police à la variable CSS de Lovable
  display: "swap",
});

// 2. Configuration de la police pour le texte
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans", // On relie cette police à la variable CSS de Lovable
  display: "swap",
});

export const metadata = {
  title: "Horizon Immo | Agence Immobilière",
  description: "Votre partenaire de confiance pour acheter, vendre et louer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 3. On injecte les deux polices dans la balise HTML pour que Tailwind les trouve
    <html lang="fr" className={`${sora.variable} ${manrope.variable} scroll-smooth`}>
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}