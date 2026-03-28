import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 p-0" style={{ marginLeft: 220 }}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
