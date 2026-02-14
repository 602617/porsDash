import React from "react";
import EventList from "../components/EventList";
import { PageHeader } from "../components/PageHeaderProps";
import { Link } from "react-router-dom";
import "../style/dugnad.css"
import BottomNav from "../components/BottomNav";
import "../style/ItemPage.css"
import "../style/LoanPage.css";
import "../style/newDash.css";

const DugnadPage: React.FC = () => {
    return (
        <div className="mainen dugnadPage">
            <div className="bgGlow" />
            <main className="dugnadMain">
              <PageHeader title="Arrangement" subtitle="Finn og opprett" showBack />
              <section className="section card dugnadActions">
                <Link to="/nyevent" className="new-event-btn">Opprett nytt arrangement</Link>
              </section>
              <section className="section card dugnadList">
                <div className="sectionTitle">Kommende arrangement</div>
                <EventList />
              </section>
            </main>
            <BottomNav />
        </div>
    )
};

export default DugnadPage;
