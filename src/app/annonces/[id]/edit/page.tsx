import EditAgentPage from "@/app/agent/annonces/[id]/edit/page"

type PageProps = {
  params: Promise<{ id: string }>
}

// Réutilise les contrôles d'accès et le formulaire AGENT.
export default function EditAnnoncePage(props: PageProps) {
  return <EditAgentPage {...props} />
}
