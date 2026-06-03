import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DocumentosListPage } from "@/pages/DocumentosListPage";
import { DocumentosBandejaPage } from "@/pages/DocumentosBandejaPage";
import { DocumentoNuevoPage } from "@/pages/DocumentoNuevoPage";
import { DocumentoDetallePage } from "@/pages/DocumentoDetallePage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route path="documentos">
          <Route index element={<DocumentosListPage />} />
          <Route path="bandeja" element={<DocumentosBandejaPage />} />
          <Route
            path="nuevo"
            element={
              <ProtectedRoute requierePermiso="documentos.crear">
                <DocumentoNuevoPage />
              </ProtectedRoute>
            }
          />
          <Route path=":id" element={<DocumentoDetallePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
