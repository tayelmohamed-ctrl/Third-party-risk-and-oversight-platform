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
import AuditLog from "./pages/AuditLog";
import Training from "./pages/Training";
import Examination from "./pages/Examination";
import ExamPack from "./pages/ExamPack";
import Retention from "./pages/Retention";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import PartnerPlatformPage from "./pages/PartnerPlatformPage";
import KybChecklistCentre from "./pages/KybChecklistCentre";

export default function App() {
  return (
    <Routes>
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/partner/*" element={<PartnerPlatformPage />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="cram" element={<CramWorkspace />} />
        <Route path="kyb-checklist" element={<KybChecklistCentre />} />
        <Route path="test-bench" element={<RiskTestBench />} />
        <Route path="investigation" element={<InvestigationHub />} />
        <Route path="transaction-monitoring" element={<TransactionMonitoring />} />
        <Route path="reporting" element={<Reporting />} />
        <Route path="rerating" element={<ReRating />} />
        <Route path="feeds" element={<Feeds />} />
        <Route path="governance" element={<Governance />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="training" element={<Training />} />
        <Route path="examination" element={<Examination />} />
        <Route path="exam-pack" element={<ExamPack />} />
        <Route path="retention" element={<Retention />} />
        <Route path="validation" element={<ModelValidation />} />
        <Route path="activity-register" element={<ActivityRiskRegister />} />
        <Route path="regulatory" element={<RegulatoryManagement />} />
        <Route path="screening" element={<Screening />} />
      </Route>
    </Routes>
  );
}
