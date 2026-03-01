import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Box, FileText, Home, ShoppingCart } from "lucide-react"
import Link from "next/link"

const navItems = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
    },
    {
        title: "Penjualan (Kasir)",
        url: "/sales",
        icon: ShoppingCart,
    },
    {
        title: "Inventaris / Master",
        url: "/inventory",
        icon: Box,
    },
    {
        title: "Laporan Keuangan",
        url: "/reports",
        icon: FileText,
    },
]

export function AppSidebar() {
    return (
        <Sidebar>
            <SidebarHeader className="h-16 flex items-center px-4 font-bold text-xl tracking-tight text-primary">
                Buku Kas Roti
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
