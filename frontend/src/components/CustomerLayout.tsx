import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import GlobalFooter from "./GlobalFooter";
import { NotificationProvider } from "../context/NotificationContext";

const CustomerLayout = () => {
  return (
    <NotificationProvider>
      <Navbar />
      <Outlet />
      <GlobalFooter />
    </NotificationProvider>
  );
};

export default CustomerLayout;
