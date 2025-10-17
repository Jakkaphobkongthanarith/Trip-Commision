import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PackageDetails from "./pages/PackageDetails";
import PackageList from "./pages/PackageList";
import Profile from "./pages/Profile";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import AdvertiserDashboard from "./pages/AdvertiserDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import MemberManagement from "./pages/MemberManagement";
import AdminDashboard from "./pages/AdminDashboard";
import PackageManagement from "./pages/PackageManagementClean";
import BookingTest from "./pages/BookingTest";
import DiscountCodes from "./pages/DiscountCodes";
import DiscountCodeManagement from "./pages/DiscountCodeManagement";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/packages" element={<PackageList />} />
                <Route path="/packages/:id" element={<PackageDetails />} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route
                  path="/payment/confirm/:bookingId"
                  element={<PaymentConfirmation />}
                />
                <Route
                  path="/advertiser"
                  element={
                    <ProtectedRoute>
                      <AdvertiserDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manager"
                  element={
                    <ProtectedRoute>
                      <ManagerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/members"
                  element={
                    <ProtectedRoute>
                      <MemberManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/package-management"
                  element={
                    <ProtectedRoute>
                      <PackageManagement />
                    </ProtectedRoute>
                  }
                />
                <Route path="/booking-test" element={<BookingTest />} />
                <Route path="/discount-codes" element={<DiscountCodes />} />
                <Route
                  path="/discount-management"
                  element={
                    <ProtectedRoute>
                      <DiscountCodeManagement />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </AuthProvider>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
