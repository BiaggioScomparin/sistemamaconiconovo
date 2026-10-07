import { lazy, Suspense } from "react";
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

// Entry pages kept eager for fast first paint; everything else is code-split
// via React.lazy so the initial bundle stays small.
import Index from "./pages/Index";
import Login from "./pages/Login";

const Register = lazy(() => import("./pages/Register"));
const Onboarding = lazy(() => import("./pages/onboarding/Onboarding"));
const Proposal = lazy(() => import("./pages/Proposal"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminLodges = lazy(() => import("./pages/admin/Lodges"));
const AdminMembers = lazy(() => import("./pages/admin/Members"));
const AdminApprovals = lazy(() => import("./pages/admin/Approvals"));
const AdminProposals = lazy(() => import("./pages/admin/Proposals"));
const AdminSindicancia = lazy(() => import("./pages/admin/Sindicancia"));
const AdminAttendances = lazy(() => import("./pages/admin/Attendances"));
const AdminPermissions = lazy(() => import("./pages/admin/Permissions"));
const AdminFinanceiro = lazy(() => import("./pages/admin/Financeiro"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminCalendar = lazy(() => import("./pages/admin/Calendar"));
const AdminLibrary = lazy(() => import("./pages/admin/Library"));
const AdminMinutes = lazy(() => import("./pages/admin/Minutes"));
const AdminInvites = lazy(() => import("./pages/admin/Invites"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminCertificates = lazy(() => import("./pages/admin/Certificates"));
const MemberInicial = lazy(() => import("./pages/member/Inicial"));
const MemberCard = lazy(() => import("./pages/member/Card"));
const MemberProfile = lazy(() => import("./pages/member/Profile"));
const MemberAttendance = lazy(() => import("./pages/member/Attendance"));
const MemberPayments = lazy(() => import("./pages/member/Payments"));
const MemberCalendar = lazy(() => import("./pages/member/Calendar"));
const MemberLibrary = lazy(() => import("./pages/member/Library"));
const ProposalStatus = lazy(() => import("./pages/member/ProposalStatus"));
const ValidateMember = lazy(() => import("./pages/ValidateMember"));
const NotFound = lazy(() => import("./pages/NotFound"));

import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000,
    },
  },
});

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground" role="status" aria-live="polite">
        Carregando...
      </div>
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
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
            <Route path="/admin/certificates" element={<ProtectedAdminRoute><AdminCertificates /></ProtectedAdminRoute>} />
            <Route path="/admin/certificados" element={<ProtectedAdminRoute><AdminCertificates /></ProtectedAdminRoute>} />
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
            <Route path="/validar/*" element={<ValidateMember />} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
