import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Pages/auth/Login";
import Logout from "./Pages/auth/Logout";
import Register from "./Pages/auth/Register";
import Dashboard from "./Pages/customer/Dashboard";
import PurchaseProduct from "./Pages/customer/PurchaseProduct";
import DeliveryTracking from "./Pages/customer/DeliveryTracking";
import BillingPayment from "./Pages/customer/BillingPayment";
import QualityAccess from "./Pages/customer/QualityAccess";
import AdminDashboard from "./Pages/admin/AdminDashboard";
import AdminOrders from "./Pages/admin/AdminOrders";
import AdminUsers from "./Pages/admin/AdminUsers";
import AdminLogins from "./Pages/admin/AdminLogins";
import AdminSchedule from "./Pages/admin/AdminSchedule";
import ProtectedRoute from "./components/ProtectedRoute";
import CustomerLayout from "./components/CustomerLayout";
import HomePage from "./Pages/customer/HomePage";
import CustomizeProfile from "./Pages/customer/CustomizeProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<Register />} />

        {/* Customer */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/purchaseproduct" element={<PurchaseProduct />} />
          <Route path="/delivery-tracking" element={<DeliveryTracking />} />
          <Route path="/billing-payment" element={<BillingPayment />} />
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

      </Routes>
    </BrowserRouter>
  );
}

export default App;
