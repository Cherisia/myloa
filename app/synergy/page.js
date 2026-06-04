import { permanentRedirect } from 'next/navigation'

export default function SynergyPage() {
  permanentRedirect('/dictionary?tab=synergy')
}
