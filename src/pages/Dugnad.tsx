import React from "react";
import Topbar from "../components/TopBar";
import BackButton from "../components/BackButton";
import EventList from "../components/EventList";

const DugnadPage: React.FC = () => {
    return (
        <div>
            <Topbar/>
            <div>
                <BackButton />
                <div>
                    <EventList />
                </div>
            </div>
        </div>
    )
};

export default DugnadPage;