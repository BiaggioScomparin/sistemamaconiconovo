import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminLodges from "./pages/admin/Lodges";
import AdminMembers from "./pages/admin/Members";
import AdminApprovals from "./pages/admin/Approvals";
import MemberCard from "./pages/member/Card";
import MemberProfile from "./pages/member/Profile";
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
            <Route path="/signup" element={<SignUp />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Admin routes */}
            <Route path="/admin/lodges" element={<AdminLodges />} />
            <Route path="/admin/members" element={<AdminMembers />} />
            <Route path="/admin/approvals" element={<AdminApprovals />} />
            {/* Member routes */}
            <Route path="/member/card" element={<MemberCard />} />
            <Route path="/member/profile" element={<MemberProfile />} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
