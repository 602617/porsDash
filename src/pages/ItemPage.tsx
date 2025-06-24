import React from "react"
import ItemList from "../components/ItemList"
import Topbar from "../components/TopBar"
import BackButton from "../components/BackButton"


const ItemPage: React.FC = () => {

    

    return (
        <div className="mainen">
            <Topbar />
            
            <main>
                <BackButton />
            <div>
                <h1 style={{margin: 0}}>Items</h1>
                
            <ItemList />
            </div>
            </main>
            
        </div>
        
    )
}

export default ItemPage;