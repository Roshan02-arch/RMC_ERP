import { Navigate } from "react-router-dom";
import { normalizeRole } from "../utils/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: string;
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const userRole = normalizeRole(localStorage.getItem("role"));
  const requiredRole = normalizeRole(role);

  if (userRole !== requiredRole) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
