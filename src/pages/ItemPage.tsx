import React from "react"
import ItemList from "../components/ItemList"
import Topbar from "../components/TopBar"

const ItemPage: React.FC = () => {

    return (
        <div>
            <Topbar />
            <div>
                <h1>Items</h1>
            <ItemList />
            </div>
            
        </div>
        
    )
}

export default ItemPage;