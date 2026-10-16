import { Link, Route, Routes } from 'react-router'
import { HomePage } from '../features/home/HomePage'
import { LoginPage } from '../features/auth/LoginPage'
import { FirstLoginPage } from '../features/auth/FirstLoginPage'
import { RegistrationPage } from '../features/registration/RegistrationPage'
import { ReceiptPage } from '../features/registration/ReceiptPage'
import { RequestsPage } from '../features/admin/RequestsPage'
import { RequestDetailPage } from '../features/admin/RequestDetailPage'
import { SessionGate } from './guards/SessionGate'
import { AdminGate } from './guards/AdminGate'
export function AppRoutes() {
  return <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/cadastro" element={<RegistrationPage />} />
    <Route path="/cadastro/recebido" element={<ReceiptPage />} />
    <Route path="/primeiro-acesso" element={<FirstLoginPage />} />
    <Route element={<SessionGate />}>
      <Route path="/app" element={<section><h1>Minha área</h1><p>Sessão confirmada. Os recursos financeiros serão adicionados nas próximas etapas.</p></section>} />
      <Route element={<AdminGate />}>
        <Route path="/admin/solicitacoes" element={<RequestsPage />} />
        <Route path="/admin/solicitacoes/:requestId" element={<RequestDetailPage />} />
      </Route>
    </Route>
    <Route path="*" element={<section><h1>Página não encontrada</h1><Link to="/">Voltar ao início</Link></section>} />
  </Routes>
}
