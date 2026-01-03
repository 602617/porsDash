import React from "react";

import "../style/ItemPage.css"
import ItemDetail from "../components/ItemDetail";
import BottomNav from "../components/BottomNav";
import { PageHeader } from "../components/PageHeaderProps";

const ItemDetailPage: React.FC = () => {

    return (
        <div className="mainen">
            
            <main>
                <PageHeader  title="Items detail" showBack />
                
                    <ItemDetail />
                
                <BottomNav />
            </main>
        </div>
    )
}

export default ItemDetailPage;