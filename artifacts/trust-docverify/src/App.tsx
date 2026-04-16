import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Verify from "@/pages/Verify";
import Dashboard from "@/pages/Dashboard";
import RoleDashboard from "@/pages/RoleDashboard";
import SignDocument from "@/pages/SignDocument";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Reports from "@/pages/Reports";
import ExternalSign from "@/pages/ExternalSign";
import AdminUsers from "@/pages/AdminUsers";

function Router() {
  return (
    <Switch>
      {/* الصفحات العامة */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify" component={Verify} />
      
      {/* صفحة التوقيع الخارجي */}
      <Route path="/external-sign/:token" component={ExternalSign} />
      
      {/* ✅ صفحة إدارة المستخدمين (للأدمن فقط) */}
      <Route path="/admin" component={AdminUsers} />
      
      {/* لوحة التحكم العامة (للمسؤول) */}
      <Route path="/dashboard" component={Dashboard} />
      
      {/* لوحات التحكم حسب الدور */}
      <Route path="/dashboard/graduate-affairs" component={() => <RoleDashboard params={{ role: "Graduate-Affairs" }} />} />
      <Route path="/dashboard/college-registrar" component={() => <RoleDashboard params={{ role: "College-Registrar" }} />} />
      <Route path="/dashboard/dean" component={() => <RoleDashboard params={{ role: "Dean" }} />} />
      <Route path="/dashboard/general-registrar" component={() => <RoleDashboard params={{ role: "General-Registrar" }} />} />
      <Route path="/dashboard/president" component={() => <RoleDashboard params={{ role: "University-President" }} />} />
      <Route path="/dashboard/employment" component={() => <RoleDashboard params={{ role: "Employment-Officer" }} />} />
      <Route path="/dashboard/secretary" component={() => <RoleDashboard params={{ role: "Secretary-General" }} />} />
      <Route path="/dashboard/board-chairman" component={() => <RoleDashboard params={{ role: "Board-Chairman" }} />} />
      <Route path="/dashboard/requester" component={() => <RoleDashboard params={{ role: "Requester" }} />} />
      <Route path="/dashboard/finance" component={() => <RoleDashboard params={{ role: "Financial-Manager" }} />} />
      <Route path="/dashboard/auditor" component={() => <RoleDashboard params={{ role: "Auditor" }} />} />
      <Route path="/dashboard/accounts" component={() => <RoleDashboard params={{ role: "Accounts" }} />} />
      
      {/* الصفحات الأخرى */}
      <Route path="/sign" component={SignDocument} />
      <Route path="/reports" component={Reports} />
      
      {/* صفحة 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter>
          <Router />
          <Toaster />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;