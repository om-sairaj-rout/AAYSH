import { Outlet } from "react-router-dom";
import SideBar from "./SideBar";
import Header from "./Header";
import Footer from "./Footer";

const Layout = () => {
  return (
    <div className="flex w-full h-screen bg-slate-50 font-sans antialiased overflow-hidden">
      
      <SideBar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        
        <main className="flex-1 p-6 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-125 p-6">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Layout;