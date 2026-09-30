import { SearchBar } from "./SearchBar";

export function Hero() {
  return (
    <section className="relative">
      <img
        src="/hero.jpg"
        alt="Résidence moderne au coucher du soleil"
        className="absolute inset-0 h-full w-full object-cover"
        width={1920}
        height={1088}
      />
      <div className="absolute inset-0 bg-navy/70" />

      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-24 sm:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-gold/50 bg-gold/15 px-4 py-1 text-xs font-bold uppercase tracking-widest text-gold">
            Agence immobilière
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Bienvenue chez Horizon Immo
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white/85 sm:text-xl">
            Votre partenaire de confiance pour acheter, vendre et louer.
            <br className="hidden sm:block" />
            Des annonces vérifiées, un accompagnement sur mesure et une expertise locale depuis plus de 15 ans.
          </p>
        </div>

        {/* Intégration de la barre de recherche qui chevauche l'image */}
        <div className="relative z-10 mx-auto -mb-24 mt-12 max-w-4xl">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}