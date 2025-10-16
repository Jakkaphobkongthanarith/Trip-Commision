import { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      {/* เพิ่ม padding-top เท่ากับความสูงของ navbar และป้องกัน overlap */}
      <main className="flex-1 flex flex-col pt-16">{children}</main>
    </div>
  );
};

export default Layout;
