import React from "react";
import { PageHeader } from "../components/PageHeaderProps";
import BottomNav from "../components/BottomNav";
import MyBookings from "../components/MyBookings";
import "../style/ProfilePage.css";
import "../style/LoanPage.css";
import "../style/MyBookings.css";

const MyBookingsPage: React.FC = () => {
  return (
    <div className="profilePage">
      <div className="bgGlow" />
      <main className="profileMain">
        <PageHeader title="Mine bookinger" subtitle="Oversikt og status" showBack />
        <section className="section card profileProducts">
          <MyBookings />
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default MyBookingsPage;
