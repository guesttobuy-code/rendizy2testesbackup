import React from 'react';
import { Routes, Route } from 'react-router-dom';
import FinanceiroSidebar from './FinanceiroSidebar';
import FinanceiroDashboard from './FinanceiroDashboard';
import { ContasReceberPage } from './pages/ContasReceberPage';
import { ContasPagarPage } from './pages/ContasPagarPage';
import { LancamentosPage } from './pages/LancamentosPage';
import { DREPage } from './pages/DREPage';
import { FluxoCaixaPage } from './pages/FluxoCaixaPage';
import { PlanoContasPage } from './pages/PlanoContasPage';
import { ContasBancariasPage } from './pages/ContasBancariasPage';
import { CentroCustosPage } from './pages/CentroCustosPage';
import { ConciliacaoPage } from './pages/ConciliacaoPage';
import { RegrasConciliacaoPage } from './pages/RegrasConciliacaoPage';
import { FechamentoCaixaPage } from './pages/FechamentoCaixaPage';
import { InadimplenciaPage } from './pages/InadimplenciaPage';
import { RelatoriosGerenciaisPage } from './pages/RelatoriosGerenciaisPage';
import { ConfiguracoesFinanceirasPage } from './pages/ConfiguracoesFinanceirasPage';

export default function FinanceiroModule() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar própria do módulo financeiro */}
      <FinanceiroSidebar />
      
      {/* Área de trabalho - sub-rotas do financeiro */}
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<FinanceiroDashboard />} />
          <Route path="plano-contas" element={<PlanoContasPage />} />
          <Route path="lancamentos" element={<LancamentosPage />} />
          <Route path="centro-custos" element={<CentroCustosPage />} />
          <Route path="contas-receber" element={<ContasReceberPage />} />
          <Route path="contas-pagar" element={<ContasPagarPage />} />
          <Route path="inadimplencia" element={<InadimplenciaPage />} />
          <Route path="conciliacao" element={<ConciliacaoPage />} />
          <Route path="conciliacao/regras" element={<RegrasConciliacaoPage />} />
          <Route path="conciliacao/fechamento" element={<FechamentoCaixaPage />} />
          <Route path="contas-bancarias" element={<ContasBancariasPage />} />
          <Route path="dre" element={<DREPage />} />
          <Route path="fluxo-caixa" element={<FluxoCaixaPage />} />
          <Route path="relatorios" element={<RelatoriosGerenciaisPage />} />
          <Route path="configuracoes" element={<ConfiguracoesFinanceirasPage />} />
        </Routes>
      </div>
    </div>
  );
}
