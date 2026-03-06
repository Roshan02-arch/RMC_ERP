import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const CustomerLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

export default CustomerLayout;
