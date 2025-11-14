'use client'

import AuthProvider from "@/components/AuthProvider";
import AuthGuard from "@/components/AuthGuard";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <AuthGuard requireAdmin={true}>
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
          <AdminSidebar />
          <main className="flex-1 lg:ml-64 w-full min-h-screen">
            {children}
          </main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}

