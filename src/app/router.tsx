import { CadastrosPage } from '../features/cadastros/CadastrosPage'
import { CartoesPage } from '../features/cartoes/CartoesPage'
import { FaturasPage } from '../features/cartoes/FaturasPage'
import { FaturaDetailPage } from '../features/cartoes/FaturaDetailPage'
import { ExternosPage } from '../features/externos/ExternosPage'
import { ExternoDetailPage } from '../features/externos/ExternoDetailPage'
import { PainelPage } from '../features/painel/PainelPage'
import { PainelAnualPage } from '../features/painel/PainelAnualPage'
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
      <Route path="/app/cartoes" element={<CartoesPage />} />
      <Route path="/app/cartoes/:cartaoId/faturas" element={<FaturasPage />} />
      <Route path="/app/cartoes/:cartaoId/faturas/:competencia" element={<FaturaDetailPage />} />
      <Route path="/app/lancamentos" element={<ExternosPage />} />
      <Route path="/app/lancamentos/:origemId" element={<ExternoDetailPage />} />
      <Route path="/app/cadastros" element={<CadastrosPage />} />
      <Route path="/app/cadastros/:colecao" element={<CadastrosPage />} />
      <Route path="/app" element={<PainelPage />} />
      <Route path="/app/projecao" element={<PainelAnualPage />} />
      <Route element={<AdminGate />}>
        <Route path="/admin/solicitacoes" element={<RequestsPage />} />
        <Route path="/admin/solicitacoes/:requestId" element={<RequestDetailPage />} />
      </Route>
    </Route>
    <Route path="*" element={<section><h1>Página não encontrada</h1><Link to="/">Voltar ao início</Link></section>} />
  </Routes>
}
