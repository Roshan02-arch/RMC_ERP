const GlobalFooter = () => {
  return (
    <footer className="bg-slate-900 text-gray-300 py-6 text-center border-t border-slate-800">
      <h3 className="text-base font-semibold text-white">RMC ERP System</h3>
      <p className="text-sm mt-1">© {new Date().getFullYear()} RMC ERP. All Rights Reserved.</p>
    </footer>
  );
};

export default GlobalFooter;
