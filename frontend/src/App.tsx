import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Pages/auth/Login";
import Logout from "./Pages/auth/Logout";
import Register from "./Pages/auth/Register";
import ForgotPassword from "./Pages/auth/ForgotPassword";
import ResetPassword from "./Pages/auth/ResetPassword";
import Dashboard from "./Pages/customer/Dashboard";
import PurchaseProduct from "./Pages/customer/PurchaseProduct";
import DeliveryTracking from "./Pages/customer/DeliveryTracking";
import BillingPayment from "./Pages/customer/BillingPayment";
import QualityAccess from "./Pages/customer/QualityAccess";
import OrderSuccess from "./Pages/customer/OrderSuccess";
import CheckoutPayment from "./Pages/customer/CheckoutPayment";
import AdminDashboard from "./Pages/admin/AdminDashboard";
import AdminOrders from "./Pages/admin/AdminOrders";
import AdminUsers from "./Pages/admin/AdminUsers";
import AdminLogins from "./Pages/admin/AdminLogins";
import AdminSchedule from "./Pages/admin/AdminSchedule";
import AdminInventory from "./Pages/admin/AdminInventory";
import ProtectedRoute from "./components/ProtectedRoute";
import CustomerLayout from "./components/CustomerLayout";
import HomePage from "./Pages/customer/HomePage";
import AboutUsPage from "./Pages/customer/AboutUsPage";
import ContactUsPage from "./Pages/customer/ContactUsPage";
import CustomizeProfile from "./Pages/customer/CustomizeProfile";
import GlobalFooter from "./components/GlobalFooter";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
      <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about-us" element={<AboutUsPage />} />
          <Route path="/contact-us" element={<ContactUsPage />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Customer */}
        <Route
          element={
            <ProtectedRoute role="CUSTOMER">
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/purchaseproduct" element={<PurchaseProduct />} />
          <Route path="/checkout-payment" element={<CheckoutPayment />} />
          <Route path="/delivery-tracking" element={<DeliveryTracking />} />
          <Route path="/billing-payment" element={<BillingPayment />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/quality-access" element={<QualityAccess />} />
          <Route path="/customize-profile" element={<CustomizeProfile />} />
        </Route>

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminUsers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/adminlogins"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminLogins />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/schedule"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminSchedule />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/inventory"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminInventory />
            </ProtectedRoute>
          }
        />

        </Routes>
        </div>
        <GlobalFooter />
      </div>
    </BrowserRouter>
  );
}

export default App;
