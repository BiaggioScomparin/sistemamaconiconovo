import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedAdminRoute } from "@/components/auth/ProtectedAdminRoute";
import { ProtectedMinutesRoute } from "@/components/auth/ProtectedMinutesRoute";
import { ProtectedMemberRoute } from "@/components/auth/ProtectedMemberRoute";
import { ProtectedInvitesRoute } from "@/components/auth/ProtectedInvitesRoute";
import { ProtectedAttendanceRoute } from "@/components/auth/ProtectedAttendanceRoute";
import { ProtectedFinanceRoute } from "@/components/auth/ProtectedFinanceRoute";
import { ProtectedReportsRoute } from "@/components/auth/ProtectedReportsRoute";
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
import AdminSindicancia from "./pages/admin/Sindicancia";
import AdminAttendances from "./pages/admin/Attendances";
import AdminPermissions from "./pages/admin/Permissions";
import AdminFinanceiro from "./pages/admin/Financeiro";
import AdminSettings from "./pages/admin/Settings";
import AdminCalendar from "./pages/admin/Calendar";
import AdminLibrary from "./pages/admin/Library";
import AdminMinutes from "./pages/admin/Minutes";
import AdminInvites from "./pages/admin/Invites";
import AdminNotifications from "./pages/admin/Notifications";
import AdminReports from "./pages/admin/Reports";
import MemberInicial from "./pages/member/Inicial";
import MemberCard from "./pages/member/Card";
import MemberProfile from "./pages/member/Profile";
import MemberAttendance from "./pages/member/Attendance";
import MemberPayments from "./pages/member/Payments";
import MemberCalendar from "./pages/member/Calendar";
import MemberLibrary from "./pages/member/Library";
import ProposalStatus from "./pages/member/ProposalStatus";
import ValidateMember from "./pages/ValidateMember";
import NotFound from "./pages/NotFound";

import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
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
            <Route path="/status" element={<ProposalStatus />} />
            <Route path="/dashboard" element={<ProtectedAdminRoute><Dashboard /></ProtectedAdminRoute>} />
            {/* Admin routes - Protected */}
            <Route path="/admin/lodges" element={<ProtectedAdminRoute><AdminLodges /></ProtectedAdminRoute>} />
            <Route path="/admin/members" element={<ProtectedAdminRoute><AdminMembers /></ProtectedAdminRoute>} />
            <Route path="/admin/approvals" element={<ProtectedAdminRoute><AdminApprovals /></ProtectedAdminRoute>} />
            <Route path="/admin/proposals" element={<ProtectedAdminRoute><AdminProposals /></ProtectedAdminRoute>} />
            <Route path="/admin/sindicancia" element={<ProtectedAdminRoute><AdminSindicancia /></ProtectedAdminRoute>} />
            <Route path="/admin/attendances" element={<ProtectedAttendanceRoute><AdminAttendances /></ProtectedAttendanceRoute>} />
            <Route path="/admin/permissions" element={<ProtectedAdminRoute><AdminPermissions /></ProtectedAdminRoute>} />
            <Route path="/admin/financeiro" element={<ProtectedFinanceRoute><AdminFinanceiro /></ProtectedFinanceRoute>} />
            <Route path="/admin/calendar" element={<ProtectedAdminRoute><AdminCalendar /></ProtectedAdminRoute>} />
            <Route path="/admin/settings" element={<ProtectedAdminRoute><AdminSettings /></ProtectedAdminRoute>} />
            <Route path="/admin/library" element={<ProtectedAdminRoute><AdminLibrary /></ProtectedAdminRoute>} />
            <Route path="/admin/minutes" element={<ProtectedMinutesRoute><AdminMinutes /></ProtectedMinutesRoute>} />
            <Route path="/admin/invites" element={<ProtectedInvitesRoute><AdminInvites /></ProtectedInvitesRoute>} />
            <Route path="/admin/notifications" element={<ProtectedAdminRoute><AdminNotifications /></ProtectedAdminRoute>} />
            <Route path="/admin/reports" element={<ProtectedReportsRoute><AdminReports /></ProtectedReportsRoute>} />
            {/* Member routes - Protected by status */}
            <Route path="/member/inicial" element={<ProtectedMemberRoute><MemberInicial /></ProtectedMemberRoute>} />
            <Route path="/member/card" element={<ProtectedMemberRoute><MemberCard /></ProtectedMemberRoute>} />
            <Route path="/member/profile" element={<ProtectedMemberRoute><MemberProfile /></ProtectedMemberRoute>} />
            <Route path="/member/attendance" element={<ProtectedMemberRoute><MemberAttendance /></ProtectedMemberRoute>} />
            <Route path="/member/payments" element={<ProtectedMemberRoute><MemberPayments /></ProtectedMemberRoute>} />
            <Route path="/member/calendar" element={<ProtectedMemberRoute><MemberCalendar /></ProtectedMemberRoute>} />
            <Route path="/member/library" element={<ProtectedMemberRoute><MemberLibrary /></ProtectedMemberRoute>} />
            {/* Public validation route */}
            <Route path="/validar/:profileId" element={<ValidateMember />} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
