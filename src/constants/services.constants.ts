// One list of the public /services studies, shared by the page's cards, the
// enquiry form's Service dropdown and the server-side validation in
// serviceEnquiryPersistence.ts — so the three can't drift apart.
export type ServiceCode = "S01" | "S02" | "S03" | "S04" | "S05";

export const SERVICES: { code: ServiceCode; title: string }[] = [
  { code: "S01", title: "Vehicle Noise Assessment" },
  { code: "S02", title: "Noise Reduction Study" },
  { code: "S03", title: "Radar Signature (RCS) Assessment" },
  { code: "S04", title: "Signature Reduction Design" },
  { code: "S05", title: "Mission-to-Design Study" },
];

export const SERVICE_NOT_SURE = "Not sure yet";

// The exact strings the dropdown submits and the server accepts.
export const SERVICE_OPTIONS: string[] = [
  ...SERVICES.map((s) => `${s.code} — ${s.title}`),
  SERVICE_NOT_SURE,
];

export function serviceOptionFor(code: ServiceCode): string {
  return SERVICE_OPTIONS.find((o) => o.startsWith(code)) ?? SERVICE_NOT_SURE;
}

export const ENQUIRY_LIMITS = { name: 200, organisation: 200, email: 320, message: 4000 } as const;
