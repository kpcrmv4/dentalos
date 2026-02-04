import { DashboardShell } from '@/components/layout/dashboard-shell'

// Mock profile for initial build
const mockProfile = {
  full_name: 'ผู้ดูแลระบบ',
  roles: {
    name: 'admin',
    display_name: 'ผู้บริหาร',
  },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO: Add Supabase auth check after database setup
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) redirect('/login')

  return <DashboardShell profile={mockProfile}>{children}</DashboardShell>
}
