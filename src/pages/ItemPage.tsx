import React from "react"
import ItemList from "../components/ItemList"
import "../style/ItemPage.css"
import "../style/LoanPage.css"
import "../style/newDash.css"

import BottomNav from "../components/BottomNav"
import { PageHeader } from "../components/PageHeaderProps"


const ItemPage: React.FC = () => {

    

    return (
        <div className="mainen itemPage">
            <div className="bgGlow" />
            <main className="itemPageMain">
                <PageHeader title="Items" subtitle="Browse & book" showBack />
                <section className="section card itemListCard">
                    <div className="sectionTitle">Available items</div>
                    <ItemList />
                </section>
            </main>
            <BottomNav/>
        </div>
    )
}

export default ItemPage;
