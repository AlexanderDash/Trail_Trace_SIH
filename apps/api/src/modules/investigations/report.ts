import PDFDocument from 'pdfkit';
import { getInvestigationWorkspace } from './service.js';
import { prisma } from "../../lib/prisma.js";
import { analyzeGeospatialHotspots } from "../geospatial/service.js";

export async function generateInvestigationReportPdf(investigationId: string): Promise<Buffer> {
  const inv = await getInvestigationWorkspace(investigationId);
  const hotspots = await analyzeGeospatialHotspots(); // Simplified, in a real env we'd freeze this to the case

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(20).text('TrailTrace', { align: 'center' });
      doc.fontSize(14).text('Financial Cybercrime Investigation Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Case: ${inv.caseNumber}`, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Disclaimer
      doc.fontSize(9).fillColor('#666666')
        .text(
          "DISCLAIMER: This report contains analytical intelligence generated from available transaction, complaint, behavioural and geospatial data. Predictive outputs represent analytical likelihoods and should not be interpreted as certainty or as an automated determination of criminal activity.",
          { align: 'justify' }
        );
      doc.moveDown(2);
      doc.fillColor('black');

      // Case Summary
      doc.fontSize(14).text('1. Case Overview', { underline: true });
      doc.fontSize(11).moveDown(0.5);
      doc.text(`Title: ${inv.title}`);
      doc.text(`Status: ${inv.status}`);
      doc.text(`Priority: ${inv.priority}`);
      
      if (inv.complaints.length > 0) {
        const c = inv.complaints[0];
        doc.text(`Primary Complaint: ${c.complaintRef} (Amount: ₹${c.amount})`);
        if (c.matchedTransaction) {
          doc.text(`Matched Transaction: ${c.matchedTransaction.sourceTransactionId}`);
        }
      }
      doc.moveDown();

      // Accounts & Risk
      doc.fontSize(14).text('2. Financial Trail & Risk Intelligence', { underline: true });
      doc.fontSize(11).moveDown(0.5);
      
      const highRisk = inv.accountsContext.filter(a => (a.riskProfile?.score || 0) >= 50);
      doc.text(`Total Accounts in Tracked Trail: ${inv.accountsContext.length}`);
      doc.text(`High-Risk / Suspicious Accounts Identified: ${highRisk.length}`);
      doc.moveDown();
      
      if (highRisk.length > 0) {
        doc.text('Key Suspicious Accounts:');
        highRisk.forEach(a => {
          doc.text(`- ${a.accountRef} (Risk Score: ${a.riskProfile?.score}, Watchlist: ${a.watchlist ? a.watchlist.status : 'None'})`);
        });
      }
      doc.moveDown();

      // Geospatial
      doc.fontSize(14).text('3. Geospatial & Predictive Intelligence', { underline: true });
      doc.fontSize(11).moveDown(0.5);
      if (hotspots.length > 0) {
        doc.text(`Top Predicted Withdrawal Hotspot: ${hotspots[0].city}`);
        doc.text(`Likelihood Score: ${hotspots[0].score}/100 (${hotspots[0].riskLevel})`);
        doc.text(`Evidence: ${hotspots[0].reasons.join('; ')}`);
      } else {
        doc.text('No significant geospatial hotspots detected.');
      }
      doc.moveDown();

      // Findings
      doc.fontSize(14).text('4. Investigator Findings', { underline: true });
      doc.fontSize(11).moveDown(0.5);
      if (inv.findings.length > 0) {
        inv.findings.forEach(f => {
          doc.text(`[${f.type}] ${new Date(f.createdAt).toLocaleDateString()}`);
          doc.text(`${f.description}`);
          doc.moveDown(0.5);
        });
      } else {
        doc.text('No manual findings recorded yet.');
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
