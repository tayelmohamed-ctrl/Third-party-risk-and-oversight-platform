import { scoreCustomer } from "../src/engine/cram";
import { buildAssessment, type Assessment, type Trigger } from "../src/engine/rerating";
import type { ScoreInput, Score } from "../src/engine/types";
import { appendAssessment, storeEmpty } from "./db/auditStore";
import { seedVendorMappings } from "./identity/resolver";
import { prisma } from "./db/client";

function makeInput(p: Partial<ScoreInput>): ScoreInput {
  return {
    segment: "Retail", lifecycle: "New",
    employmentScore: 1 as Score, professionScore: 1 as Score, natureOfBusinessScore: 1 as Score,
    pep: "None", segmentScore: 1 as Score,
    expectedMonthlyBand: 1 as Score, actualMonthlyBand: 1 as Score,
    legalForm: "natural", uboStatus: "na", uboLayers: 1,
    residenceFirm: 1.35, nationalityFirm: 1.35, birthFirm: 1.35, sowFirm: 1.35, sofFirm: 1.35,
    residenceName: "United Arab Emirates", sofName: "United Arab Emirates",
    productScore: 2 as Score, serviceScore: 1 as Score, initiationChannelScore: 2 as Score, deliveryChannelScore: 2 as Score,
    investigationsScore: 1 as Score, strsScore: 1 as Score,
    sanctions: "Clear", watchlist: "Clear", adverse: "None",
    manualOverride: "",
    ...p,
  };
}

function monthsAgo(m: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return d;
}

async function seedOne(
  customerId: string, customerName: string, input: ScoreInput,
  trigger: Trigger, at: Date, note?: string, prev?: Assessment,
) {
  const result = scoreCustomer(input, "calculator");
  const a = buildAssessment({
    customerId, customerName, input, result, trigger,
    triggerNote: note, actor: "system (seed)", at,
    prevRating: prev?.rating, boundary: "calculator",
  });
  await appendAssessment(a);
  return a;
}

export async function seedIfEmpty() {
  if (!(await storeEmpty())) return false;

  await seedOne("ACT00021", "Gulf Bullion DMCC",
    makeInput({
      segment: "SME", segmentScore: 2 as Score, legalForm: "legal", uboStatus: "verified", uboLayers: 2,
      natureOfBusinessScore: 3 as Score, professionScore: 3 as Score,
      expectedMonthlyBand: 3 as Score, actualMonthlyBand: 3 as Score, serviceScore: 2 as Score,
    }),
    "ONBOARDING", monthsAgo(14));

  await seedOne("ACT00033", "Pearl Mart Grocery",
    makeInput({
      segment: "SME", segmentScore: 2 as Score, legalForm: "legal", uboStatus: "verified",
      natureOfBusinessScore: 2 as Score, professionScore: 2 as Score,
      expectedMonthlyBand: 2 as Score, actualMonthlyBand: 2 as Score,
    }),
    "ONBOARDING", monthsAgo(40));

  await seedOne("ACT00042", "Shadow Holdings Ltd",
    makeInput({
      segment: "Corporate", segmentScore: 2 as Score, legalForm: "legal", uboStatus: "refused", uboLayers: 4,
      natureOfBusinessScore: 2 as Score, professionScore: 2 as Score,
      expectedMonthlyBand: 2 as Score, actualMonthlyBand: 1 as Score,
    }),
    "ONBOARDING", monthsAgo(2));

  await seedOne("ACT00010", "A. Haddad",
    makeInput({
      segment: "Retail", segmentScore: 1 as Score, professionScore: 1 as Score, natureOfBusinessScore: 1 as Score,
      productScore: 1 as Score, expectedMonthlyBand: 1 as Score, actualMonthlyBand: 1 as Score,
      initiationChannelScore: 1 as Score, deliveryChannelScore: 1 as Score,
    }),
    "ONBOARDING", monthsAgo(3));

  const omarInput = makeInput({
    segment: "HNW", segmentScore: 3 as Score, professionScore: 2 as Score, natureOfBusinessScore: 2 as Score,
    expectedMonthlyBand: 2 as Score, actualMonthlyBand: 3 as Score, sofName: "Germany", sofFirm: 1.35, serviceScore: 2 as Score,
  });
  const omar1 = await seedOne("ACT00005", "Omar Khalid", omarInput, "ONBOARDING", monthsAgo(14));
  const omar2Input = { ...omarInput, actualMonthlyBand: 3 as Score, investigationsScore: 2 as Score, adverse: "True Match" as const };
  await seedOne("ACT00005", "Omar Khalid", omar2Input, "ADVERSE_MEDIA", monthsAgo(1), "Negative news: layering allegations", omar1);

  await seedVendorMappings();

  // Seed app users for RBAC reference
  const users = [
    { id: "u_mlro", email: "mlro@mal.ae", name: "MLRO", roles: ["MLRO"] },
    { id: "u_analyst", email: "analyst@mal.ae", name: "Analyst", roles: ["Analyst"] },
    { id: "u_service", email: "feeds@mal.ae", name: "Feed Service", roles: ["ServiceAccount"] },
  ];
  for (const u of users) {
    await prisma.appUser.upsert({
      where: { email: u.email },
      create: u,
      update: { roles: u.roles, name: u.name },
    });
  }

  return true;
}
