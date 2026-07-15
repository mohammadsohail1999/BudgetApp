import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import FlightIcon from "@mui/icons-material/Flight";
import HomeIcon from "@mui/icons-material/Home";
import LocalGroceryStoreIcon from "@mui/icons-material/LocalGroceryStore";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MovieIcon from "@mui/icons-material/Movie";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import PetsIcon from "@mui/icons-material/Pets";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import SavingsIcon from "@mui/icons-material/Savings";
import SchoolIcon from "@mui/icons-material/School";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import WorkIcon from "@mui/icons-material/Work";
import CategoryIcon from "@mui/icons-material/Category";
import type { ElementType } from "react";

export const ICON_MAP: Record<string, ElementType> = {
  "attach-money": AttachMoneyIcon,
  "savings": SavingsIcon,
  "credit-card": CreditCardIcon,
  "shopping-cart": ShoppingCartIcon,
  "local-grocery-store": LocalGroceryStoreIcon,
  "restaurant": RestaurantIcon,
  "home": HomeIcon,
  "directions-car": DirectionsCarIcon,
  "local-hospital": LocalHospitalIcon,
  "school": SchoolIcon,
  "work": WorkIcon,
  "flight": FlightIcon,
  "fitness-center": FitnessCenterIcon,
  "sports-esports": SportsEsportsIcon,
  "movie": MovieIcon,
  "music-note": MusicNoteIcon,
  "pets": PetsIcon,
  "category": CategoryIcon,
};

export const ICON_OPTIONS = Object.entries(ICON_MAP).map(([slug, Icon]) => ({
  slug,
  label: slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()),
  Icon,
}));
