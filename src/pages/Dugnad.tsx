import React from "react";
import EventList from "../components/EventList";
import { PageHeader } from "../components/PageHeaderProps";
import { Link } from "react-router-dom";
import "../style/dugnad.css"
import BottomNav from "../components/BottomNav";
import "../style/ItemPage.css"

const DugnadPage: React.FC = () => {
    return (
        <div className="mainen">
            <main>

            <PageHeader title="Arrangement" showBack />
            <div className="full-page">
                <Link to="/nyevent" className="new-event-btn"><p>Opprett nytt arrangement</p></Link>
                <div>
                    <EventList />
                </div>
            </div>
            <BottomNav />
            </main>
        </div>
    )
};

export default DugnadPage;