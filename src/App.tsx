import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedAdminRoute } from "@/components/auth/ProtectedAdminRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/onboarding/Onboarding";
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
import AdminCalendar from "./pages/admin/Calendar";
import AdminLibrary from "./pages/admin/Library";
import MemberInicial from "./pages/member/Inicial";
import MemberCard from "./pages/member/Card";
import MemberProfile from "./pages/member/Profile";
import MemberAttendance from "./pages/member/Attendance";
import MemberPayments from "./pages/member/Payments";
import MemberCalendar from "./pages/member/Calendar";
import MemberLibrary from "./pages/member/Library";
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
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/proposta" element={<Proposal />} />
            <Route path="/dashboard" element={<ProtectedAdminRoute><Dashboard /></ProtectedAdminRoute>} />
            {/* Admin routes - Protected */}
            <Route path="/admin/lodges" element={<ProtectedAdminRoute><AdminLodges /></ProtectedAdminRoute>} />
            <Route path="/admin/members" element={<ProtectedAdminRoute><AdminMembers /></ProtectedAdminRoute>} />
            <Route path="/admin/approvals" element={<ProtectedAdminRoute><AdminApprovals /></ProtectedAdminRoute>} />
            <Route path="/admin/proposals" element={<ProtectedAdminRoute><AdminProposals /></ProtectedAdminRoute>} />
            <Route path="/admin/attendances" element={<ProtectedAdminRoute><AdminAttendances /></ProtectedAdminRoute>} />
            <Route path="/admin/permissions" element={<ProtectedAdminRoute><AdminPermissions /></ProtectedAdminRoute>} />
            <Route path="/admin/financeiro" element={<ProtectedAdminRoute><AdminFinanceiro /></ProtectedAdminRoute>} />
            <Route path="/admin/calendar" element={<ProtectedAdminRoute><AdminCalendar /></ProtectedAdminRoute>} />
            <Route path="/admin/settings" element={<ProtectedAdminRoute><AdminSettings /></ProtectedAdminRoute>} />
            <Route path="/admin/library" element={<ProtectedAdminRoute><AdminLibrary /></ProtectedAdminRoute>} />
            {/* Member routes */}
            <Route path="/member/inicial" element={<MemberInicial />} />
            <Route path="/member/card" element={<MemberCard />} />
            <Route path="/member/profile" element={<MemberProfile />} />
            <Route path="/member/attendance" element={<MemberAttendance />} />
            <Route path="/member/payments" element={<MemberPayments />} />
            <Route path="/member/calendar" element={<MemberCalendar />} />
            <Route path="/member/library" element={<MemberLibrary />} />
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
