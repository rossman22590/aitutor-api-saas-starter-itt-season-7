// Modify your dashboard/layout.tsx file:
"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";

// Create a wrapper component that adapts to sidebar state
function AdaptiveContent({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  
  return (
    <div 
      className="flex flex-col w-full transition-all duration-200 ease-linear"
      style={{
        marginLeft: state === "expanded" ? "18rem" : "4rem",
        width: state === "expanded" ? "calc(100% - 18rem)" : "calc(100% - 4rem)",
      }}
    >
      {children}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider className="bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100">
      <AppSidebar variant="sidebar" collapsible="icon" />
      <SidebarInset>
        <div className="bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 min-h-[calc(100dvh)]">
          <AdaptiveContent>
            {children}
          </AdaptiveContent>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
