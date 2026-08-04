import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import RequireAuth from './components/RequireAuth'
import AppLayout from './components/layout/AppLayout'
import Hub from './pages/public/Hub'
import Login from './pages/Login'
import RegisterBusiness from './pages/RegisterBusiness'
import AcceptInvite from './pages/AcceptInvite'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Jobs from './pages/Jobs'
import JobField from './pages/JobField'
import Quotes from './pages/Quotes'
import Employees from './pages/Employees'
import Inventory from './pages/Inventory'
import Finances from './pages/Finances'
import Reports from './pages/Reports'
import QuoteRequests from './pages/QuoteRequests'
import Payments from './pages/Payments'
import Reviews from './pages/Reviews'
import Team from './pages/Team'
import Payroll from './pages/Payroll'
import MyPay from './pages/MyPay'
import CommissionTerms from './pages/CommissionTerms'
import CommissionDisputes from './pages/CommissionDisputes'
import TaxSettings from './pages/TaxSettings'
import ThemeSettings from './pages/ThemeSettings'
import QuoteEstimatorSettings from './pages/QuoteEstimatorSettings'
import RoleHierarchy from './pages/RoleHierarchy'
import PlatformDashboard from './pages/platform/PlatformDashboard'
import PlatformApplications from './pages/platform/PlatformApplications'
import PlatformBusinesses from './pages/platform/PlatformBusinesses'
import PlatformCommissions from './pages/platform/PlatformCommissions'
import RequestQuote from './pages/public/RequestQuote'
import PayOnline from './pages/public/PayOnline'
import LeaveReview from './pages/public/LeaveReview'
import PortalLogin from './pages/portal/PortalLogin'
import PortalDashboard from './pages/portal/PortalDashboard'

function StaffOnly({ children }: { children: React.ReactNode }) {
  const { profile, loading, isPlatformAdmin } = useAuth()
  if (loading) return null
  if (isPlatformAdmin) return <>{children}</>
  if (profile?.role === 'customer') return <Navigate to="/portal/dashboard" replace />
  return <>{children}</>
}

function PlatformOnly({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin, loading } = useAuth()
  if (loading) return null
  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter basename="/tidyledger">
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/" element={<Hub />} />
            <Route path="/request-quote" element={<RequestQuote />} />
            <Route path="/pay/:token" element={<PayOnline />} />
            <Route path="/review/:token" element={<LeaveReview />} />
            <Route path="/portal" element={<PortalLogin />} />
            <Route path="/portal/dashboard" element={<PortalDashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterBusiness />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />

            <Route
              path="/*"
              element={
                <RequireAuth>
                  <StaffOnly>
                    <AppLayout>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/jobs" element={<Jobs />} />
                        <Route path="/jobs/:jobId/field" element={<JobField />} />
                        <Route path="/quotes" element={<Quotes />} />
                        <Route path="/quote-requests" element={<QuoteRequests />} />
                        <Route path="/employees" element={<Employees />} />
                        <Route path="/team" element={<Team />} />
                        <Route path="/payroll" element={<Payroll />} />
                        <Route path="/my-pay" element={<MyPay />} />
                        <Route path="/commission-terms" element={<CommissionTerms />} />
                        <Route path="/disputes" element={<CommissionDisputes />} />
                        <Route path="/tax-settings" element={<TaxSettings />} />
                        <Route path="/theme-settings" element={<ThemeSettings />} />
                        <Route path="/quote-estimator-settings" element={<QuoteEstimatorSettings />} />
                        <Route path="/roles" element={<RoleHierarchy />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/finances" element={<Finances />} />
                        <Route path="/payments" element={<Payments />} />
                        <Route path="/reviews" element={<Reviews />} />
                        <Route path="/reports" element={<Reports />} />

                        <Route
                          path="/platform"
                          element={
                            <PlatformOnly>
                              <PlatformDashboard />
                            </PlatformOnly>
                          }
                        />
                        <Route
                          path="/platform/applications"
                          element={
                            <PlatformOnly>
                              <PlatformApplications />
                            </PlatformOnly>
                          }
                        />
                        <Route
                          path="/platform/businesses"
                          element={
                            <PlatformOnly>
                              <PlatformBusinesses />
                            </PlatformOnly>
                          }
                        />
                        <Route
                          path="/platform/commissions"
                          element={
                            <PlatformOnly>
                              <PlatformCommissions />
                            </PlatformOnly>
                          }
                        />
                      </Routes>
                    </AppLayout>
                  </StaffOnly>
                </RequireAuth>
              }
            />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
