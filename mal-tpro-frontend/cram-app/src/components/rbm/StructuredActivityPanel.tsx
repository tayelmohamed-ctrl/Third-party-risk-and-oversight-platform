import type { StructuredBusinessActivity } from "../../engine/rbm/types";

interface Props {
  activity: StructuredBusinessActivity;
}

function Flag({ label, value }: { label: string; value: string | boolean | number }) {
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div className="rbm-activity__flag">
      <span className="text-faint">{label}</span>
      <span className="text-ink font-medium">{display}</span>
    </div>
  );
}

export default function StructuredActivityPanel({ activity }: Props) {
  return (
    <div className="rbm-activity">
      <div className="rbm-activity__head">
        <div>
          <div className="text-[13px] font-semibold text-ink">{activity.label}</div>
          <div className="text-[11px] text-muted mt-0.5">
            ISIC {activity.isicCode} · {activity.industry} · {activity.fatfSector}
          </div>
          {activity.nraRating && (
            <div className="text-[10px] mt-1 px-2 py-0.5 rounded-full inline-block bg-med/15 text-med border border-med/25">
              {activity.nraSource?.includes("UAE") ? "UAE NRA" : "US NRA"} {activity.nraRating}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] text-faint uppercase">Base risk</div>
          <div className="font-display text-xl font-bold text-ink">{activity.baseRiskScore}/100</div>
          <div className="text-[10px] text-muted">{activity.baseRiskBand}</div>
        </div>
      </div>

      <div className="rbm-activity__grid">
        <Flag label="Cash intensive" value={activity.cashIntensive} />
        <Flag label="Cross border" value={activity.crossBorder} />
        <Flag label="Trade finance" value={activity.tradeFinance} />
        <Flag label="High value payments" value={activity.highValuePayments} />
        <Flag label="Third party payments" value={activity.thirdPartyPayments} />
        <Flag label="Nested payments" value={activity.nestedPayments} />
        <Flag label="Virtual assets" value={activity.virtualAssetsExposure} />
        <Flag label="MSB exposure" value={activity.msbExposure} />
        <Flag label="High risk goods" value={activity.highRiskGoods} />
        <Flag label="Dual use goods" value={activity.dualUseGoods} />
        <Flag label="Government contracts" value={activity.governmentContracts} />
        <Flag label="Sanctions exposure" value={activity.sanctionsExposure} />
        <Flag label="Fraud exposure" value={activity.fraudExposure} />
        <Flag label="ML typology" value={activity.mlTypology} />
        <Flag label="EDD required" value={activity.eddRequired} />
        <Flag label="Review cycle" value={`${activity.reviewCycleMonths} months`} />
      </div>

      {activity.monitoringRules.length > 0 && (
        <div className="mt-3 text-[10px] text-muted">
          <span className="text-faint uppercase font-semibold">Monitoring · </span>
          {activity.monitoringRules.join(" · ")}
        </div>
      )}

      <p className="text-[10px] text-faint mt-2 mb-0 italic">{activity.rationale}</p>
    </div>
  );
}
