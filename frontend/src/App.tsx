import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
import OrderApprovalStatus from "./Pages/customer/OrderApprovalStatus";
import Notifications from "./Pages/customer/Notifications";
import PayLaterRequest from "./Pages/customer/PayLaterRequest";
import PayLaterOrders from "./Pages/customer/PayLaterOrders";
import PayLaterOrderDetails from "./Pages/customer/PayLaterOrderDetails";
import AdminDashboard from "./Pages/admin/AdminDashboard";
import AdminOrders from "./Pages/admin/AdminOrders";
import AdminCreditOrders from "./Pages/admin/AdminCreditOrders";
import AdminUsers from "./Pages/admin/AdminUsers";
import AdminLogins from "./Pages/admin/AdminLogins";
import AdminSchedule from "./Pages/admin/AdminSchedule";
import AdminInventory from "./Pages/admin/AdminInventory";
import AdminFinance from "./Pages/admin/AdminFinance";
import AdminQualityControl from "./Pages/admin/AdminQualityControl";
import ProtectedRoute from "./components/ProtectedRoute";
import CustomerLayout from "./components/CustomerLayout";
import AdminLayout from "./components/AdminLayout";
import HomePage from "./Pages/customer/HomePage";
import CustomizeProfile from "./Pages/customer/CustomizeProfile";
import AboutUsPage from "./Pages/customer/AboutUsPage";
import ContactUsPage from "./Pages/customer/ContactUsPage";
import AdminMaintenance from "./Pages/admin/AdminMaintenance";

function App() {
  return (
    <BrowserRouter>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        toastClassName="rounded-lg shadow-md"
      />
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about-us" element={<AboutUsPage />} />
        <Route path="/contact-us" element={<ContactUsPage />} />

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
          <Route path="/order-approval-status" element={<OrderApprovalStatus />} />
          <Route path="/order-approval-status/:orderId" element={<OrderApprovalStatus />} />
          <Route path="/pay-later-request" element={<PayLaterRequest />} />
          <Route path="/pay-later-orders" element={<PayLaterOrders />} />
          <Route path="/pay-later-orders/:orderId" element={<PayLaterOrderDetails />} />
          <Route path="/delivery-tracking" element={<DeliveryTracking />} />
          <Route path="/order-tracking/:orderId" element={<DeliveryTracking />} />
          <Route path="/billing-payment" element={<BillingPayment />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/quality-access" element={<QualityAccess />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/customize-profile" element={<CustomizeProfile />} />
        </Route>

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="credit-orders" element={<AdminCreditOrders />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="adminlogins" element={<AdminLogins />} />
          <Route path="schedule" element={<AdminSchedule />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="finance" element={<AdminFinance />} />
          <Route path="quality-control" element={<AdminQualityControl />} />
          <Route path="maintenance" element={<AdminMaintenance />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
