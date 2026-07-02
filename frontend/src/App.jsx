import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import ThirdParties from "./pages/ThirdParties.jsx";
import ThirdPartyDetail from "./pages/ThirdPartyDetail.jsx";
import Assessments from "./pages/Assessments.jsx";
import Findings from "./pages/Findings.jsx";

const NAV = [
  { to: "/", label: "Dashboard", icon: "▦", end: true },
  { to: "/third-parties", label: "Third Parties", icon: "▣" },
  { to: "/assessments", label: "Assessments", icon: "✔" },
  { to: "/findings", label: "Findings", icon: "⚠" },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">◇</span>
        <div>
          <div className="brand-title">Oversight</div>
          <div className="brand-sub">TPRM Platform</div>
        </div>
      </div>
      <nav className="nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span className="ico" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">Source of truth: /spec/*.json</div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="topbar">
      <div>
        <h1>Third-Party Risk &amp; Oversight</h1>
        <p>Continuous monitoring across the vendor portfolio</p>
      </div>
      <NavLink to="/third-parties" className="btn primary">
        View portfolio
      </NavLink>
    </header>
  );
}

export default function App() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="content">
        <Topbar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/third-parties" element={<ThirdParties />} />
            <Route path="/third-parties/:id" element={<ThirdPartyDetail />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/findings" element={<Findings />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
