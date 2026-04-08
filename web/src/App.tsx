import { Navigate, Route, Routes } from "react-router-dom";
import CatalogPage from "./components/CatalogPage";
import MotorcycleDetailPage from "./components/MotorcycleDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/motorcycles/:motorcycleId" element={<MotorcycleDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
