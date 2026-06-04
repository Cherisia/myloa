import { permanentRedirect } from 'next/navigation'

export default function RaidsPage() {
  permanentRedirect('/dictionary?tab=raids')
}
