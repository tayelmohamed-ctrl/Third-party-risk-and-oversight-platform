import Theme1Status from "../../Theme1Status";
import Theme2Status from "../../Theme2Status";
import Theme3Status from "../../Theme3Status";
import Theme4Status from "../../Theme4Status";
import Theme5Status from "../../Theme5Status";
import Theme6Status from "../../Theme6Status";
import PortfolioRiskDashboard from "../PortfolioRiskDashboard";
import OnboardingTracker from "../OnboardingTracker";
import { Sec } from "../../ui";

/** Secondary metrics — hidden from the action-first Operations view. */
export default function DashboardMetricsTab() {
  return (
    <div>
      <Theme1Status />
      <div className="mt-5"><Theme2Status /></div>
      <div className="mt-5"><Theme3Status /></div>
      <div className="mt-5"><Theme4Status /></div>
      <div className="mt-5"><Theme5Status /></div>
      <div className="mt-5"><Theme6Status /></div>
      <PortfolioRiskDashboard />
      <Sec>Onboarding pipeline</Sec>
      <OnboardingTracker />
    </div>
  );
}
