'use client'

import AuthProvider from "@/components/AuthProvider";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>

      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}

