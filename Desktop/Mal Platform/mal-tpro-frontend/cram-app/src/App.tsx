import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import CramWorkspace from "./pages/CramWorkspace";
import RiskTestBench from "./pages/RiskTestBench";
import InvestigationHub from "./pages/InvestigationHub";
import Reporting from "./pages/Reporting";
import Governance from "./pages/Governance";
import ModelValidation from "./pages/ModelValidation";
import ActivityRiskRegister from "./pages/ActivityRiskRegister";
import ReRating from "./pages/ReRating";
import Feeds from "./pages/Feeds";
import RegulatoryManagement from "./pages/RegulatoryManagement";
import Screening from "./pages/Screening";
import TransactionMonitoring from "./pages/TransactionMonitoring";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="cram" element={<CramWorkspace />} />
        <Route path="test-bench" element={<RiskTestBench />} />
        <Route path="investigation" element={<InvestigationHub />} />
        <Route path="transaction-monitoring" element={<TransactionMonitoring />} />
        <Route path="reporting" element={<Reporting />} />
        <Route path="rerating" element={<ReRating />} />
        <Route path="feeds" element={<Feeds />} />
        <Route path="governance" element={<Governance />} />
        <Route path="validation" element={<ModelValidation />} />
        <Route path="activity-register" element={<ActivityRiskRegister />} />
        <Route path="regulatory" element={<RegulatoryManagement />} />
        <Route path="screening" element={<Screening />} />
      </Route>
    </Routes>
  );
}
