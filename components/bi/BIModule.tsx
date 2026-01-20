import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BISidebar from './BISidebar';
import BIDashboard from './BIDashboard';
import { ModulePlaceholder } from '../ModulePlaceholder';

export default function BIModule() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar própria do módulo BI */}
      <BISidebar />

      {/* Área de trabalho - sub-rotas de BI */}
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<BIDashboard />} />
          <Route path="financeiro" element={<ModulePlaceholder module="Relatório Financeiro" />} />
          <Route path="ocupacao" element={<ModulePlaceholder module="Relatório de Ocupação" />} />
          <Route path="reservas" element={<ModulePlaceholder module="Relatório de Reservas" />} />
          <Route path="clientes" element={<ModulePlaceholder module="Relatório de Clientes" />} />
          <Route path="tendencias" element={<ModulePlaceholder module="Análise de Tendências" />} />
          <Route path="comparativos" element={<ModulePlaceholder module="Análises Comparativas" />} />
          <Route path="previsoes" element={<ModulePlaceholder module="Previsões" />} />
          <Route path="construtor" element={<ModulePlaceholder module="Construtor de Relatórios" />} />
          <Route path="meus-relatorios" element={<ModulePlaceholder module="Meus Relatórios" />} />
          <Route path="agendados" element={<ModulePlaceholder module="Relatórios Agendados" />} />
          <Route path="kpis" element={<ModulePlaceholder module="KPIs e Metas" />} />
          <Route path="configuracoes" element={<ModulePlaceholder module="Configurações BI" />} />
          <Route path="*" element={<Navigate to="/bi" replace />} />
        </Routes>
      </div>
    </div>
  );
}
