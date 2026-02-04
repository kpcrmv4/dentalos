import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

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

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar profile={mockProfile} />
      <div className="lg:pl-64">
        <Header profile={mockProfile} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
