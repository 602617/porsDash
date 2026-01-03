import React from "react"
import ItemList from "../components/ItemList"
import "../style/ItemPage.css"

import BottomNav from "../components/BottomNav"
import { PageHeader } from "../components/PageHeaderProps"


const ItemPage: React.FC = () => {

    

    return (
        <div className="mainen">
            
            
            <main>
                <PageHeader title="Items" showBack/>
            <div>
                
                
            <ItemList />
            
            </div>
            
            </main>
            <BottomNav/>
        </div>
        
    )
}

export default ItemPage;