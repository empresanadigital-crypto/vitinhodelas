import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme before render to avoid flash
const savedTheme = localStorage.getItem("readyzap_theme");
if (savedTheme === "light") {
  document.documentElement.classList.add("light");
  document.documentElement.classList.remove("dark");
} else {
  document.documentElement.classList.add("dark");
  document.documentElement.classList.remove("light");
}

createRoot(document.getElementById("root")!).render(<App />);
