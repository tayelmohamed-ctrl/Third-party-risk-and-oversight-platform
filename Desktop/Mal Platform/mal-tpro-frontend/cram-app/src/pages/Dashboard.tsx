import { useNavigate } from "react-router-dom";
import { Card, Sec, RatingPill } from "../components/ui";
import Theme1Status from "../components/Theme1Status";
import Theme2Status from "../components/Theme2Status";
import Theme3Status from "../components/Theme3Status";
import Theme4Status from "../components/Theme4Status";
import Theme5Status from "../components/Theme5Status";
import Theme6Status from "../components/Theme6Status";
import AgentCard from "../components/agents/AgentCard";
import AgentAiTag from "../components/agents/AgentAiTag";
import AgentAvatar from "../components/agents/AgentAvatar";
import { AGENT_LIST } from "../config/agents";
import PortfolioRiskDashboard from "../components/dashboard/PortfolioRiskDashboard";
import OnboardingTracker from "../components/dashboard/OnboardingTracker";

const KPIS = [
  { n: "92%", l: "CRAM health", t: "▲ 3 pts MoM", c: "low" },
  { n: "88/100", l: "Regulatory compliance score", t: "6 open gaps", c: "med" },
  { n: "14", l: "Critical alerts / cases", t: "3 breach SLA soon", c: "hi" },
  { n: "6.8%", l: "High-risk customers", t: "within appetite", c: "low" },
];

export default function Dashboard() {
  const nav = useNavigate();
  return (
    <div>
      <Sec>Your three AI agents — AI prepares · humans decide</Sec>
      <p className="text-[12px] text-muted -mt-3 mb-4 max-w-2xl">
        Each agent has a distinct role. Click a card to open their workspace — nothing is filed or decided without you.
      </p>
      <div className="grid grid-cols-3 gap-3.5 max-md:grid-cols-1">
        {AGENT_LIST.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 mt-5 max-md:grid-cols-2">
        {KPIS.map((k) => (
          <Card key={k.l} className="p-4">
            <div className={`font-display font-bold text-[27px] tracking-tight ${k.c === "low" ? "text-low" : k.c === "hi" ? "text-hi" : ""}`}>{k.n}</div>
            <div className="text-muted text-[11.5px] mt-0.5">{k.l}</div>
            <div className={`text-[10.5px] font-semibold mt-2 inline-block px-2 py-0.5 rounded ${k.c === "low" ? "bg-low/15 text-low" : k.c === "hi" ? "bg-hi/15 text-hi" : "bg-med/15 text-med"}`}>{k.t}</div>
          </Card>
        ))}
      </div>

      <Theme1Status />
      <div className="mt-5"><Theme2Status /></div>
      <div className="mt-5"><Theme3Status /></div>
      <div className="mt-5"><Theme4Status /></div>
      <div className="mt-5"><Theme5Status /></div>
      <div className="mt-5"><Theme6Status /></div>

      <PortfolioRiskDashboard />

      <Sec>Onboarding pipeline</Sec>
      <OnboardingTracker />

      <Sec>Where the MLRO acts first</Sec>
      <div className="grid grid-cols-[1.4fr_1fr] gap-4 max-md:grid-cols-1">
        <Card>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
            <h3 className="m-0 text-sm font-display">Investigations funnel</h3>
            <AgentAiTag agent="mohsen">Mohsen prepares · MLRO decides</AgentAiTag>
          </div>
          <div className="p-4">
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-faint text-[10px] uppercase tracking-wide">
                <th className="text-left font-semibold pb-2">Stage</th><th className="text-left font-semibold pb-2">Open</th><th className="text-left font-semibold pb-2">Prepared</th><th className="text-left font-semibold pb-2">Awaiting decision</th></tr></thead>
              <tbody>
                <tr className="border-t border-lineSoft"><td className="py-2.5">L1 Triage</td><td>128</td><td>128</td><td><RatingPill rating="Low" /></td></tr>
                <tr className="border-t border-lineSoft"><td className="py-2.5">L2 Investigation</td><td>37</td><td>37</td><td><RatingPill rating="Medium" /></td></tr>
                <tr className="border-t border-lineSoft">
                  <td className="py-2.5 flex items-center gap-2"><AgentAvatar agent="jana" size="xs" />SAR/STR (Jana)</td>
                  <td>9</td><td>9</td><td><RatingPill rating="High" /></td>
                </tr>
              </tbody>
            </table>
            <Sec>Emerging typologies (Mohsen-surfaced)</Sec>
            <div className="flex gap-2 flex-wrap">
              <RatingPill rating="High" /><span className="pill bg-med/15 text-med">New-beneficiary velocity</span>
              <span className="pill bg-med/15 text-med">Crypto off-ramp corridor</span><span className="pill bg-low/15 text-low">Salary mule clusters</span>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <AgentAiTag agent="sayed">Sayed — morning brief</AgentAiTag>
          <div className="text-[12.5px] text-muted mt-2 mb-3">Programme healthy. Three items need your decision; each links to evidence &amp; its CRAM obligation.</div>
          {[
            { agent: "sayed" as const, t: "CBUAE notice 2026/14 has no mapped control", s: "Sayed drafted a control + scoring-parameter mapping for approval" },
            { agent: "mohsen" as const, t: "Case CLC…366 ready for SAR sign-off", s: "Mohsen investigated · Jana drafted the STR" },
            { agent: "sayed" as const, t: "2 High-risk onboardings await approval", s: "Foreign-PEP floor applied · EDD complete" },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 items-start py-2.5 border-b border-lineSoft last:border-0">
              <AgentAvatar agent={item.agent} size="sm" />
              <div className="text-[12.5px] min-w-0">{item.t}<small className="block text-muted text-[11px] mt-0.5">{item.s}</small></div>
            </div>
          ))}
          <button type="button" className="btn w-full mt-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai" onClick={() => nav("/investigation")}>Open priority 2 →</button>
        </Card>
      </div>
    </div>
  );
}
