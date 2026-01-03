import { NavLink } from "react-router-dom";
import homeIcon from "../assets/DugnadIcon.png";
import bellIcon from "../assets/MyProductsIcon.png";
import userIcon from "../assets/ShoppingIcon.png";
import '../style/BottomNav.css' 

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink 
        to="/nydash" 
        className={({ isActive }) => "tab" + (isActive ? " active" : "")}
      >
        <img src={homeIcon} alt="Hjem ikon" />
        <span>Hjem</span>
      </NavLink>

      <NavLink 
        to="/items" 
        className={({ isActive }) => "tab" + (isActive ? " active" : "")}
      >
        <img src={bellIcon} alt="Varsler ikon" />
        <span>Varsler</span>
      </NavLink>

      <NavLink 
        to="/profile" 
        className={({ isActive }) => "tab" + (isActive ? " active" : "")}
      >
        <img src={userIcon} alt="Profil ikon" />
        <span>Profil</span>
      </NavLink>
    </nav>
  );
}
