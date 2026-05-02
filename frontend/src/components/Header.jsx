import { Search, Calculator, UserCircle } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 w-full h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
      <h1 className="text-2xl font-semibold text-gray-800">Order Report</h1>

      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search Order By AWB Number & Order Id" 
            className="pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 border rounded-lg w-80 text-sm outline-none transition-all"
          />
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
          <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><Calculator size={20} /></button>
          <button className="flex items-center gap-2 ml-2 p-1 hover:bg-gray-100 rounded-full">
            <UserCircle size={28} className="text-blue-500" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;