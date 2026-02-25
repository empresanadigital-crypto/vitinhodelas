import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
