import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Bot, House, Settings as SettingsIcon } from "lucide-react";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { SettingsPage } from "./pages/settings/SettingsPage";

export default function App() {
  return (
    <main className="theme-scrollbar flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-6">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">Agent Workbench</h1>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`
              }
            >
              <House className="h-4 w-4" />
              Home
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`
              }
            >
              <SettingsIcon className="h-4 w-4" />
              Settings
            </NavLink>
          </nav>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings/:tab?" element={<SettingsPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
    </main>
  );
}
