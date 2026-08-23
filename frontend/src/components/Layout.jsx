import { Outlet } from "react-router-dom";
import { useState } from "react";
import SideBar from "./SideBar";
import Header from "./Header";
import Footer from "./Footer";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex w-full h-screen font-sans antialiased overflow-hidden relative" style={{ backgroundColor: '#EFF2F6' }}>
      {/* Sidebar with state controls */}
      <SideBar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      {/* Background Overlay for Mobile view when Sidebar is pulled out */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden w-full min-w-0">
        {/* Header receives ability to open/toggle sidebar */}
        <Header setIsSidebarOpen={setIsSidebarOpen} />
        
        {/* Adjusted bottom padding to account for fixed/sticky footer positioning safely */}
        <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 pb-16 overflow-y-auto overflow-x-hidden no-scrollbar">
          <div className="bg-transparent min-h-0 w-full max-w-full">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Layout;