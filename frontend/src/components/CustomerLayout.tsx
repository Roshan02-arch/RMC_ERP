import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import GlobalFooter from "./GlobalFooter";

const CustomerLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
      <GlobalFooter />
    </>
  );
};

export default CustomerLayout;
