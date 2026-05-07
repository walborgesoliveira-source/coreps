import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Entidades from './pages/Entidades';
import EntidadeForm from './pages/EntidadeForm';
import EntidadeDetalhe from './pages/EntidadeDetalhe';
import Equipamentos from './pages/Equipamentos';
import Historico from './pages/Historico';
import Servicos from './pages/Servicos';

function PrivateRoute({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="entidades" element={<Entidades />} />
            <Route path="entidades/novo" element={<EntidadeForm />} />
            <Route path="entidades/:id" element={<EntidadeDetalhe />} />
            <Route path="entidades/:id/editar" element={<EntidadeForm />} />
            <Route path="equipamentos" element={<Equipamentos />} />
            <Route path="historico" element={<Historico />} />
            <Route path="servicos" element={<Servicos />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
