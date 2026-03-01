import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="flex w-full flex-col min-h-screen relative bg-slate-50/50">
                <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b bg-white px-4 md:px-6 shadow-sm">
                    <SidebarTrigger className="-ml-1 mr-4" />
                    <h1 className="text-lg font-semibold tracking-tight">
                        Dashboard
                    </h1>
                </header>
                <div className="flex-1 p-4 md:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    )
}
