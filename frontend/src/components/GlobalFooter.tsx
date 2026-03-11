interface GlobalFooterProps {
  className?: string;
  titleClassName?: string;
  textClassName?: string;
}

const GlobalFooter = ({
  className = "",
  titleClassName = "text-slate-800",
  textClassName = "text-slate-600",
}: GlobalFooterProps) => {
  return (
    <footer className={`py-6 text-center ${className}`}>
      <h3 className={`text-base font-semibold ${titleClassName}`}>RMC ERP System</h3>
      <p className={`mt-1 text-sm ${textClassName}`}>
        © {new Date().getFullYear()} RMC ERP. All Rights Reserved.
      </p>
    </footer>
  );
};

export default GlobalFooter;
