import React from "react";
import Topbar from "../components/TopBar";
import MyProducts from "../components/MyProducts";

const MyProductsPage: React.FC = () => {

    return(
        <div>
            <Topbar />
            <div>
                 <MyProducts />
            </div>
           
        </div>
    )
}

export default MyProductsPage;