import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/categories")({
  component: () => (
    <SiteLayout activeNav="categories">
      <Outlet />
    </SiteLayout>
  ),
});
