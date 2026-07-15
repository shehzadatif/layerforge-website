export type Province =
  | "BC"
  | "AB"
  | "SK"
  | "MB"
  | "ON"
  | "QC"
  | "NB"
  | "NS"
  | "PE"
  | "NL";

export const TAX_RATES: Record<
  Province,
  {
    gst: number;
    pst: number;
    hst: number;
    qst: number;
  }
> = {
  BC: { gst: 0.05, pst: 0.07, hst: 0, qst: 0 },
  AB: { gst: 0.05, pst: 0, hst: 0, qst: 0 },
  SK: { gst: 0.05, pst: 0.06, hst: 0, qst: 0 },
  MB: { gst: 0.05, pst: 0.07, hst: 0, qst: 0 },
  ON: { gst: 0, pst: 0, hst: 0.13, qst: 0 },
  QC: { gst: 0.05, pst: 0, hst: 0, qst: 0.09975 },
  NB: { gst: 0, pst: 0, hst: 0.15, qst: 0 },
  NS: { gst: 0, pst: 0, hst: 0.15, qst: 0 },
  PE: { gst: 0, pst: 0, hst: 0.15, qst: 0 },
  NL: { gst: 0, pst: 0, hst: 0.15, qst: 0 },
};