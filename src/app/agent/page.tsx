"use client";

import { useState } from "react";

const sections = ["Vue d’ensemble", "Annonces", "Agents", "Utilisateurs", "Demandes"];

export default function AgentPage() {
  const [active, setActive] = useState(sections[0]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white p-6 lg:flex">
        <div className="mb-10 flex items-center gap-3 text-xl font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white">⌂</span>
          <span>immo<span className="text-indigo-600">admin</span></span>
        </div>
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Administration</p>
        <nav className="space-y-1">
          {sections.map((section, index) => (
            <button key={section} onClick={() => setActive(section)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${active === section ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}>
              <span className="w-5 text-center">{["▦", "⌂", "♙", "♧", "▤"][index]}</span>{section}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">AD</span><div><p className="text-sm font-semibold">Administrateur</p><p className="text-xs text-slate-500">Espace de gestion</p></div></div>
          <button className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">Se déconnecter</button>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div><p className="text-xs text-slate-400">Administration / {active}</p><h1 className="font-semibold">{active}</h1></div>
          <div className="flex items-center gap-4"><button aria-label="Notifications" className="text-xl text-slate-500">♧</button><span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">AD</span></div>
        </header>

        <div className="mx-auto max-w-7xl space-y-7 p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-sm text-slate-500">Bienvenue dans votre espace de gestion</p><h2 className="mt-1 text-2xl font-bold">Tableau de bord</h2></div>
            <button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">＋ Nouvelle annonce</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[{ title: "Annonces publiées", icon: "⌂", tone: "bg-indigo-50 text-indigo-600" }, { title: "Agents actifs", icon: "♙", tone: "bg-emerald-50 text-emerald-600" }, { title: "Demandes reçues", icon: "▤", tone: "bg-amber-50 text-amber-600" }, { title: "Utilisateurs", icon: "♧", tone: "bg-rose-50 text-rose-600" }].map((card) => (
              <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{card.title}</span><span className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${card.tone}`}>{card.icon}</span></div><p className="mt-5 text-3xl font-bold">—</p><p className="mt-1 text-xs text-slate-400">Aucune donnée disponible</p></article>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2"><h3 className="font-semibold">Activité récente</h3><p className="mt-1 text-sm text-slate-500">Suivez les dernières actions sur la plateforme</p><div className="mt-6 grid min-h-56 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center"><div><span className="mb-3 block text-2xl text-slate-300">▤</span><p className="text-sm font-medium text-slate-600">Aucune activité pour le moment</p><p className="mt-1 text-xs text-slate-400">Les nouvelles activités apparaîtront ici.</p></div></div></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-semibold">Actions rapides</h3><p className="mt-1 text-sm text-slate-500">Accédez aux tâches courantes</p><div className="mt-5 space-y-3">{["Gérer les annonces", "Ajouter un agent", "Voir les demandes"].map((action, index) => <button key={action} onClick={() => setActive(["Annonces", "Agents", "Demandes"][index])} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50">{action}<span className="text-slate-400">→</span></button>)}</div></section>
          </div>
        </div>
      </section>
    </main>
  );
}