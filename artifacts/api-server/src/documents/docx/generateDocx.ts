import { Packer } from "docx";
import { buildProposalDocx } from "./templates/proposalDocx";
import { buildValuationDocx } from "./templates/valuationDocx";
import type {
  ExportSettings,
  ProposalReportData,
  ValuationReportData,
  YachtProfile,
} from "../documentTypes";

/** Build the proposal Word document and pack it to a Buffer. */
export async function renderProposalDocx(input: {
  yacht: YachtProfile;
  reportData: ProposalReportData;
  settings: ExportSettings;
}): Promise<Buffer> {
  const doc = buildProposalDocx(input);
  return Packer.toBuffer(doc);
}

/** Build the valuation report Word document and pack it to a Buffer. */
export async function renderValuationDocx(input: {
  yacht: YachtProfile;
  reportData: ValuationReportData;
  settings: ExportSettings;
}): Promise<Buffer> {
  const doc = buildValuationDocx(input);
  return Packer.toBuffer(doc);
}
