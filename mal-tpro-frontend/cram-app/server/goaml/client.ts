import type { FincenCtrPayload, FincenPayload, GoamlPayload, GoamlSubmitResult } from "./payloadBuilder";

export type FiuSubmitPayload = GoamlPayload | FincenPayload | FincenCtrPayload;

function goamlMode(): "mock" | "live" {
  return process.env.GOAML_MODE === "live" ? "live" : "mock";
}

function fincenMode(): "mock" | "live" {
  return process.env.FINCEN_MODE === "live" ? "live" : "mock";
}

function mockReference(system: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  return system === "goAML" ? `UAE-FIU-${ts}` : `FINCEN-BSA-${ts}`;
}

export async function submitToGoaml(payload: GoamlPayload): Promise<GoamlSubmitResult> {
  const mode = goamlMode();
  const submittedAt = new Date().toISOString();

  if (mode === "mock") {
    return {
      ok: true,
      fiuReference: mockReference("goAML"),
      status: "accepted",
      message: "Mock goAML submission accepted — no live FIU connection",
      submittedAt,
      mode: "mock",
      rawResponse: { mock: true, reportType: payload.reportType },
    };
  }

  const base = process.env.GOAML_API_BASE ?? "https://services.uaeiec.gov.ae/goaml/api";
  const apiKey = process.env.GOAML_API_KEY;
  if (!apiKey) {
    throw new Error("GOAML_API_KEY required for live submission");
  }

  const res = await fetch(`${base}/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      fiuReference: "",
      status: "rejected",
      message: String(body.message ?? body.error ?? res.statusText),
      submittedAt,
      mode: "live",
      rawResponse: body,
    };
  }

  return {
    ok: true,
    fiuReference: String(body.fiuReference ?? body.reference ?? mockReference("goAML")),
    status: "accepted",
    message: "Submitted to UAE FIU goAML",
    submittedAt,
    mode: "live",
    rawResponse: body,
  };
}

export async function submitToFincen(payload: FincenPayload): Promise<GoamlSubmitResult> {
  const mode = fincenMode();
  const submittedAt = new Date().toISOString();

  if (mode === "mock") {
    return {
      ok: true,
      fiuReference: mockReference("FinCEN"),
      status: "accepted",
      message: "Mock FinCEN BSA E-File submission accepted",
      submittedAt,
      mode: "mock",
      rawResponse: { mock: true, form: payload.form },
    };
  }

  const base = process.env.FINCEN_API_BASE ?? "https://bsaefiling.fincen.gov/api";
  const apiKey = process.env.FINCEN_API_KEY;
  if (!apiKey) {
    throw new Error("FINCEN_API_KEY required for live submission");
  }

  const res = await fetch(`${base}/sar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      fiuReference: "",
      status: "rejected",
      message: String(body.message ?? body.error ?? res.statusText),
      submittedAt,
      mode: "live",
      rawResponse: body,
    };
  }

  return {
    ok: true,
    fiuReference: String(body.bsaId ?? body.reference ?? mockReference("FinCEN")),
    status: "accepted",
    message: "Submitted to FinCEN BSA E-File",
    submittedAt,
    mode: "live",
    rawResponse: body,
  };
}

export async function submitToFincenCtr(payload: FincenCtrPayload): Promise<GoamlSubmitResult> {
  const mode = fincenMode();
  const submittedAt = new Date().toISOString();

  if (mode === "mock") {
    return {
      ok: true,
      fiuReference: mockReference("FinCEN-CTR"),
      status: "accepted",
      message: "Mock FinCEN CTR (Form 104) submission accepted",
      submittedAt,
      mode: "mock",
      rawResponse: { mock: true, form: "104", aggregateUsd: payload.amounts.aggregateUsd },
    };
  }

  const base = process.env.FINCEN_API_BASE ?? "https://bsaefiling.fincen.gov/api";
  const apiKey = process.env.FINCEN_API_KEY;
  if (!apiKey) {
    throw new Error("FINCEN_API_KEY required for live CTR submission");
  }

  const res = await fetch(`${base}/ctr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      fiuReference: "",
      status: "rejected",
      message: String(body.message ?? body.error ?? res.statusText),
      submittedAt,
      mode: "live",
      rawResponse: body,
    };
  }

  return {
    ok: true,
    fiuReference: String(body.bsaId ?? body.reference ?? mockReference("FinCEN-CTR")),
    status: "accepted",
    message: "Submitted to FinCEN BSA E-File (Form 104 CTR)",
    submittedAt,
    mode: "live",
    rawResponse: body,
  };
}
