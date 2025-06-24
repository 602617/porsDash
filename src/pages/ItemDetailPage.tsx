import React from "react";
import Topbar from "../components/TopBar";
import BackButton from "../components/BackButton";
import ItemDetail from "../components/ItemDetail";

const ItemDetailPage: React.FC = () => {

    return (
        <div>
            <Topbar />
            <main>
                <BackButton />
                <div>
                    <ItemDetail />
                </div>
            </main>
        </div>
    )
}

export default ItemDetailPage;