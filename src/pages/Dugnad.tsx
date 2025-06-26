import React from "react";
import Topbar from "../components/TopBar";
import BackButton from "../components/BackButton";

const DugnadPage: React.FC = () => {
    return (
        <div>
            <Topbar/>
            <div>
                <BackButton />
                <div>
                    Hello
                </div>
            </div>
        </div>
    )
};

export default DugnadPage;