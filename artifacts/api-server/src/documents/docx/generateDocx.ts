import { Packer } from "docx";
import { buildProposalDocx } from "./templates/proposalDocx";
import type {
  ExportSettings,
  ProposalReportData,
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
