import { DashboardPage } from "@/components/dashboard-page";

export default async function DashboardRoute({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  const params = await searchParams;
  return <DashboardPage accessState={params.access} />;
}
