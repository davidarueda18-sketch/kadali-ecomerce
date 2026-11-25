import { requireAdmin } from "@/lib/admin";
import AdminShell from "@/ui/admin/admin-shell";
import "./admin.css";
export const metadata = {
  title: "Administración | Kadali",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
