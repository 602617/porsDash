// src/components/Layout.tsx
import React from "react";
import BackButton from "./BackButton";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <BackButton />
      <div className="mt-4">{children}</div>
    </div>
  );
};

export default Layout;
