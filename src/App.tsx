import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CreateSession } from "./routes/CreateSession";
import { Home } from "./routes/Home";
import { JoinSession } from "./routes/JoinSession";
import { MapScreen } from "./routes/MapScreen";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-[100dvh]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateSession />} />
          <Route path="/join" element={<JoinSession />} />
          <Route path="/map" element={<MapScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
