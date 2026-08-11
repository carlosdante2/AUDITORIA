import { redirect } from 'next/navigation'

// Root route: redirect to login. App routes live under app/(app)/
export default function RootPage() {
  redirect('/login')
}
