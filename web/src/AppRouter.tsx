import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";

const ActiveRouter = import.meta.env.VITE_STATIC_DATA_MODE === "1" ? HashRouter : BrowserRouter;

export default function AppRouter() {
  return (
    <ActiveRouter>
      <App />
    </ActiveRouter>
  );
}
