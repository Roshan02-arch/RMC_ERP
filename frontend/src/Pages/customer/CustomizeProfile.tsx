import UserNavbar from "../../components/UserNavbar";

const CustomizeProfile = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <UserNavbar />
      <div className="pt-24 px-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <p className="text-2xl text-gray-800 flex items-center gap-3">
            <span aria-hidden="true">&#9998;</span>
            <span>Customize profile</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomizeProfile;
