export type AbhaHistory = {
  abhaNumberMasked: string;
  verified: boolean;
  source: "ABDM sandbox" | "TriageSetu demo" | "Configured ABDM gateway";
  conditions: string[];
  allergies: string[];
  medications: string[];
  recentEncounters: Array<{ date: string; facility: string; summary: string }>;
};

function maskAbha(abha: string) {
  return `XXXX-XXXX-${abha.slice(-4)}`;
}

function demoHistory(abha: string): AbhaHistory {
  const first = abha === "12345678901234";
  return {
    abhaNumberMasked: maskAbha(abha),
    verified: true,
    source: "TriageSetu demo",
    conditions: first ? ["Hypertension", "Type 2 diabetes"] : ["Asthma"],
    allergies: first ? ["Penicillin"] : ["No known drug allergies"],
    medications: first ? ["Amlodipine", "Metformin"] : ["Salbutamol inhaler"],
    recentEncounters: first
      ? [
          { date: "2026-08-14", facility: "District Hospital Mumbai", summary: "Follow-up for blood pressure and diabetes." },
          { date: "2026-06-02", facility: "City Diagnostics", summary: "Routine laboratory investigation." },
        ]
      : [
          { date: "2026-07-21", facility: "Rural Health Centre Pune", summary: "Asthma review; inhaler technique checked." },
        ],
  };
}

/**
 * Server-only ABDM history adapter.
 *
 * ABDM does not expose a safe "give me all records for this ABHA number"
 * endpoint. Real record access is a consented HIU/HIP exchange. Therefore
 * the application has two modes:
 *
 *  - demo: deterministic synthetic records for the prototype/presentation.
 *  - live: POSTs the consented request to a configured, registered ABDM
 *    gateway/HIU adapter. The adapter is kept server-side so credentials
 *    never reach the browser.
 *
 * A live gateway should implement the ABDM consent + health-information
 * exchange and return the compact shape below after the patient grants access.
 */
export async function fetchAbhaHistory(abhaNumber: string, consent: boolean): Promise<AbhaHistory> {
  const abha = abhaNumber.replace(/\D/g, "");
  if (!/^\d{14}$/.test(abha)) throw new Error("ABHA number must contain 14 digits.");
  if (!consent) throw new Error("Patient consent is required before requesting health history.");

  const mode = process.env.ABDM_MODE ?? "demo";
  if (mode === "demo") return demoHistory(abha);

  const endpoint = process.env.ABDM_HISTORY_ENDPOINT;
  const token = process.env.ABDM_ACCESS_TOKEN;
  if (!endpoint || !token) {
    throw new Error("Live ABDM mode is not configured. Set ABDM_HISTORY_ENDPOINT and ABDM_ACCESS_TOKEN.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      abhaNumber: abha,
      purpose: "CAREMGT",
      consent: { granted: true, accessMode: "VIEW" },
      hiTypes: ["OPConsultation", "Prescription", "DiagnosticReport", "AllergyIntolerance", "Condition"],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ABDM gateway request failed (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }

  const payload = await response.json();
  return normalizeGatewayHistory(payload, abha);
}

function normalizeGatewayHistory(payload: any, abha: string): AbhaHistory {
  const history = payload?.history ?? payload?.data?.history ?? payload;
  if (!history || typeof history !== "object") throw new Error("ABDM gateway returned an unsupported history response.");
  return {
    abhaNumberMasked: maskAbha(abha),
    verified: Boolean(history.verified ?? true),
    source: "Configured ABDM gateway",
    conditions: stringArray(history.conditions),
    allergies: stringArray(history.allergies),
    medications: stringArray(history.medications),
    recentEncounters: Array.isArray(history.recentEncounters)
      ? history.recentEncounters.map((e: any) => ({
          date: String(e.date ?? ""),
          facility: String(e.facility ?? "Unknown facility"),
          summary: String(e.summary ?? ""),
        }))
      : [],
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 20) : [];
}
