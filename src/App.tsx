import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Proposal from "./pages/Proposal";
import Dashboard from "./pages/Dashboard";
import AdminLodges from "./pages/admin/Lodges";
import AdminMembers from "./pages/admin/Members";
import AdminApprovals from "./pages/admin/Approvals";
import AdminProposals from "./pages/admin/Proposals";
import AdminAttendances from "./pages/admin/Attendances";
import AdminPermissions from "./pages/admin/Permissions";
import AdminFinanceiro from "./pages/admin/Financeiro";
import AdminSettings from "./pages/admin/Settings";
import MemberCard from "./pages/member/Card";
import MemberProfile from "./pages/member/Profile";
import MemberAttendance from "./pages/member/Attendance";
import MemberPayments from "./pages/member/Payments";
import ValidateMember from "./pages/ValidateMember";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/proposta" element={<Proposal />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Admin routes */}
            <Route path="/admin/lodges" element={<AdminLodges />} />
            <Route path="/admin/members" element={<AdminMembers />} />
            <Route path="/admin/approvals" element={<AdminApprovals />} />
            <Route path="/admin/proposals" element={<AdminProposals />} />
            <Route path="/admin/attendances" element={<AdminAttendances />} />
            <Route path="/admin/permissions" element={<AdminPermissions />} />
            <Route path="/admin/financeiro" element={<AdminFinanceiro />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            {/* Member routes */}
            <Route path="/member/card" element={<MemberCard />} />
            <Route path="/member/profile" element={<MemberProfile />} />
            <Route path="/member/attendance" element={<MemberAttendance />} />
            <Route path="/member/payments" element={<MemberPayments />} />
            {/* Public validation route */}
            <Route path="/validar/:profileId" element={<ValidateMember />} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
