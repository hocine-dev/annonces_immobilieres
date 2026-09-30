import { Building2, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

const navigation = [
  { label: "Accueil", href: "/" },
  { label: "Annonces", href: "#annonces" },
  { label: "Estimation", href: "#" },
  { label: "Contact", href: "#" },
];

const services = [
  "Achat & Vente",
  "Location",
  "Gestion locative",
  "Estimation gratuite",
];

export function Footer() {
  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gold text-gold-foreground">
              <Building2 className="size-5" />
            </span>
            <span className="font-display text-lg font-bold">
              Horizon<span className="text-gold">Immo</span>
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-navy-foreground/70">
            Agence immobilière indépendante. Achats, ventes et locations avec
            un accompagnement personnalisé à chaque étape de votre projet.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-gold">
            Navigation
          </h4>
          <ul className="mt-4 space-y-2 text-sm">
            {navigation.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="text-navy-foreground/80 transition-colors hover:text-gold"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-gold">
            Nos services
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-navy-foreground/80">
            {services.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-gold">
            Contact
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-navy-foreground/80">
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-gold" />
              12 rue de la République, Lyon
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-gold" />
              04 78 00 00 00
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-gold" />
              contact@horizon-immo.fr
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-navy-foreground/60">
          © {new Date().getFullYear()} Horizon Immo — Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}