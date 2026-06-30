/** Dev auth persona for cram-app (5174). Persisted in sessionStorage — not used by mal-tpro-frontend (5173). */
export type DevPersona = "Analyst" | "MLRO";

const KEY = "cram.devAuth";

const PERSONAS: Record<DevPersona, { email: string; roles: DevPersona[] }> = {
  Analyst: { email: "analyst@mal.ae", roles: ["Analyst"] },
  MLRO: { email: "mlro@mal.ae", roles: ["MLRO"] },
};

export function getPersona(): DevPersona {
  try {
    const v = sessionStorage.getItem(KEY) as DevPersona | null;
    return v === "MLRO" ? "MLRO" : "Analyst";
  } catch {
    return "Analyst";
  }
}

export function setPersona(persona: DevPersona): void {
  sessionStorage.setItem(KEY, persona);
}

const SERVICE = {
  email: "feeds@mal.ae",
  roles: ["ServiceAccount"] as const,
};

/** Headers for feed/pipeline/dashboard reads (ServiceAccount). */
export function getServiceAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer dev:${SERVICE.email}:${SERVICE.roles.join(",")}`,
    "X-CRAM-User": SERVICE.email,
    "X-CRAM-Roles": SERVICE.roles.join(","),
  };
}

/** Headers for assessment submit — uses Analyst/MLRO persona (override governance). */
export function getAuthHeaders(): Record<string, string> {
  const { email, roles } = PERSONAS[getPersona()];
  return {
    Authorization: `Bearer dev:${email}:${roles.join(",")}`,
    "X-CRAM-User": email,
    "X-CRAM-Roles": roles.join(","),
  };
}

export function hasOverrideCapability(): boolean {
  return getPersona() === "MLRO";
}

export function getMlroAuthHeaders(): Record<string, string> {
  const { email, roles } = PERSONAS.MLRO;
  return {
    Authorization: `Bearer dev:${email}:${roles.join(",")}`,
    "X-CRAM-User": email,
    "X-CRAM-Roles": roles.join(","),
  };
}
