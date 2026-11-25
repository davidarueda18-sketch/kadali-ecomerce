import BusinessDashboard from "@/ui/admin/business-dashboard";
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; source?: string }>;
}) {
  return <BusinessDashboard params={await searchParams} reportsOnly />;
}
