
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { DataProvider } from "./data/DataContext.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <App />
  </DataProvider>
);