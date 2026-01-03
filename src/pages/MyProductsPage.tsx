import React from "react";
import MyProducts from "../components/MyProducts";
import { PageHeader } from "../components/PageHeaderProps";

const MyProductsPage: React.FC = () => {

    return(
        <div>
            <PageHeader title="Mine Produkter" showBack/>
            <div>
                 <MyProducts />
            </div>
           
        </div>
    )
}

export default MyProductsPage;