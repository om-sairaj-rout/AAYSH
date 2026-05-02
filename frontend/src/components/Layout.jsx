import { Outlet } from "react-router-dom";
import SideBar from "./SideBar";
import Header from "./Header";
import Footer from "./Footer";

const Layout = () => {
  return (
    // h-screen and overflow-hidden prevent the entire page from scrolling
    <div className="flex w-full h-screen bg-slate-50 font-sans antialiased overflow-hidden">
      
      {/* Sidebar - Remains fixed due to h-screen in its own component */}
      <SideBar />

      {/* Main Content Area - This now handles its own scrolling */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        
        {/* main container scrolls independently */}
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