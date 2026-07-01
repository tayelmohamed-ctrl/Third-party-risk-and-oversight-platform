import type { FeedSource } from "../../src/pipeline/feeds";
import { prisma } from "../db/client";

export interface ResolvedIdentity {
  customerId: string;
  customerName: string;
  vendorId: string;
  source: FeedSource;
}

export interface UnresolvedIdentity {
  vendorId: string;
  source: FeedSource;
  reason: string;
}

/** Map vendor subject id → internal customerId (CRM / core banking master). */
export async function resolveVendorIdentity(
  vendorId: string,
  source: FeedSource,
): Promise<ResolvedIdentity | UnresolvedIdentity> {
  const row = await prisma.vendorIdentity.findUnique({
    where: { vendorId_source: { vendorId, source } },
  });
  if (row) {
    return {
      customerId: row.customerId, customerName: row.customerName,
      vendorId, source,
    };
  }
  return { vendorId, source, reason: `no mapping for vendor id "${vendorId}" on source "${source}"` };
}

export async function upsertVendorMapping(
  vendorId: string, source: FeedSource, customerId: string, customerName: string,
) {
  return prisma.vendorIdentity.upsert({
    where: { vendorId_source: { vendorId, source } },
    create: { vendorId, source, customerId, customerName },
    update: { customerId, customerName },
  });
}

export async function allVendorMappings() {
  return prisma.vendorIdentity.findMany({ orderBy: [{ source: "asc" }, { vendorId: "asc" }] });
}

/** Seed demo vendor → customer mappings for simulators. */
export async function seedVendorMappings() {
  const mappings: [string, FeedSource, string, string][] = [
    ["VND-10021", "adverse-media", "ACT00021", "Gulf Bullion DMCC"],
    ["VND-10033", "transaction-monitoring", "ACT00033", "Pearl Mart Grocery"],
    ["VND-10010", "kyc-crm", "ACT00010", "A. Haddad"],
    ["VND-10005", "sanctions-list", "ACT00005", "Omar Khalid"],
    ["VND-10005", "adverse-media", "ACT00005", "Omar Khalid"],
    ["VND-10005", "transaction-monitoring", "ACT00005", "Omar Khalid"],
    ["VND-10021", "sar-goaml", "ACT00021", "Gulf Bullion DMCC"],
  ];
  for (const [vendorId, source, customerId, customerName] of mappings) {
    await upsertVendorMapping(vendorId, source, customerId, customerName);
  }
}
