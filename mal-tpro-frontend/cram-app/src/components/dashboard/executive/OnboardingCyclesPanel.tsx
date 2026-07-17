import { useState } from "react";
import { Sec } from "../../ui";
import { ONBOARDING_CYCLE_DEMOS, type OnboardingCycleDemo } from "../../../config/onboardingCycleDemos";
import OnboardingCycleGifTile from "./OnboardingCycleGifTile";
import OnboardingCycleDemoModal from "./OnboardingCycleDemoModal";

/**
 * Executive Dashboard — clickable GIF demos for Individual & SME onboarding cycles.
 */
export default function OnboardingCyclesPanel() {
  const [active, setActive] = useState<OnboardingCycleDemo | null>(null);

  return (
    <div className="mt-5">
      <Sec>Onboarding cycles · click the GIF to open the demo</Sec>
      <p className="text-[11.5px] text-muted mt-1 mb-3 max-w-3xl">
        Risk-based Global Account journeys — Individual and SME — as looping demos.
        Open either GIF for the interactive six-beat cycle, lanes, and playbook PDF.
      </p>
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {ONBOARDING_CYCLE_DEMOS.map((demo) => (
          <OnboardingCycleGifTile
            key={demo.kind}
            demo={demo}
            onOpen={() => setActive(demo)}
          />
        ))}
      </div>
      <OnboardingCycleDemoModal demo={active} onClose={() => setActive(null)} />
    </div>
  );
}
