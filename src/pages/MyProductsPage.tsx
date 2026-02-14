import React from "react";
import MyProducts from "../components/MyProducts";
import { PageHeader } from "../components/PageHeaderProps";
import "../style/MyProducts.css";
import "../style/LoanPage.css";
import BottomNav from "../components/BottomNav";

const MyProductsPage: React.FC = () => {

    return(
        <div className="myProductsPage">
            <div className="bgGlow" />
            <main className="myProductsMain">
              <PageHeader title="" subtitle="Administrer dine produkter" showBack/>
              <section className="section card myProductsCard">
                <MyProducts />
              </section>
            </main>
            <BottomNav />
        </div>
    )
}

export default MyProductsPage;
