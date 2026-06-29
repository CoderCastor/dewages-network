import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND_PURPLE = [88, 28, 235];
const BRAND_LIGHT = [237, 233, 254];
const GRAY = [107, 114, 128];
const DARK = [17, 24, 39];
const GREEN = [22, 163, 74];
const RED = [220, 38, 38];
const GOLD = [217, 119, 6];

function shortWallet(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

function formatSOL(lamports) {
  if (!lamports) return "—";
  return `${(lamports / 1_000_000_000).toFixed(4)} SOL`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function stars(n) {
  if (!n) return "—";
  return "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n)) + ` (${Number(n).toFixed(1)})`;
}

function experienceLabel(level) {
  const map = { beginner: "Beginner (0–2 yrs)", intermediate: "Intermediate (3–5 yrs)", experienced: "Experienced (5+ yrs)" };
  return map[level] || level || "—";
}

// Attempt to load an image from a public URL as a base64 data URL.
// Returns null on failure (CORS, network error) so we gracefully skip thumbnails.
async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateWorkerPDF(profile, completedJobs = []) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 0;

  // ── Header band ────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(0, 0, W, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("DeWages Network", 14, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Powered by Solana Blockchain", 14, 17);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("WORKER WORK-HISTORY CERTIFICATE", W - 14, 11, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${formatDate(new Date())}`, W - 14, 17, { align: "right" });

  y = 35;

  // ── Worker profile section ──────────────────────────────────────────────────
  doc.setFillColor(...BRAND_LIGHT);
  doc.roundedRect(10, y, W - 20, 54, 3, 3, "F");

  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(profile?.name || "Worker", 16, y + 9);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`Wallet: ${shortWallet(profile?.walletAddress)}`, 16, y + 15);

  // verification badges
  const emailVerified = profile?.verificationStatus?.email;
  const panVerified = profile?.verificationStatus?.identity;

  doc.setFontSize(8);
  const badgeY = y + 22;

  doc.setFillColor(...(emailVerified ? GREEN : RED));
  doc.roundedRect(16, badgeY, 30, 6, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(emailVerified ? "✓ Email" : "✗ Email", 31, badgeY + 4.2, { align: "center" });

  doc.setFillColor(...(panVerified ? GREEN : RED));
  doc.roundedRect(50, badgeY, 36, 6, 1, 1, "F");
  doc.text(panVerified ? "✓ PAN Verified" : "✗ PAN", 68, badgeY + 4.2, { align: "center" });

  // stats row
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const statsY = y + 34;
  doc.text(`Experience:  ${experienceLabel(profile?.experienceLevel)}`, 16, statsY);
  doc.text(`Location:  ${profile?.location?.city || "—"}, ${profile?.location?.state || ""}`, 16, statsY + 6);
  doc.text(`Phone:  ${profile?.phone || "—"}`, 16, statsY + 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_PURPLE);
  doc.text(`Rating: ${profile?.rating ? profile.rating.toFixed(1) : "0.0"} ★`, W / 2 + 10, statsY);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Jobs Completed: ${profile?.completedJobs || 0}`, W / 2 + 10, statsY + 6);

  // skills
  const skills = (profile?.skills || []).slice(0, 8).join(" · ");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(`Skills: ${skills || "—"}`, 16, y + 51, { maxWidth: W - 32 });

  y += 62;

  // ── Summary box ─────────────────────────────────────────────────────────────
  if (completedJobs.length > 0) {
    const totalLamports = completedJobs.reduce((s, j) => s + (j.paymentAmount || 0), 0);
    const avgRating =
      completedJobs.filter((j) => j.workerRating).reduce((s, j) => s + j.workerRating, 0) /
      (completedJobs.filter((j) => j.workerRating).length || 1);

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(10, y, W - 20, 16, 3, 3, "F");
    doc.setTextColor(...DARK);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("EARNINGS SUMMARY", 16, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Total Earned: ${formatSOL(totalLamports)}   ·   Jobs: ${completedJobs.length}   ·   Avg Rating: ${avgRating.toFixed(1)} ★`,
      16, y + 12
    );
    y += 22;
  }

  // ── Job history table ────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Job History", 14, y + 6);
  y += 10;

  if (completedJobs.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text("No completed jobs yet.", 14, y + 6);
    y += 14;
  } else {
    const tableRows = completedJobs.map((job, i) => [
      i + 1,
      job.title || "—",
      job.companyName || "—",
      formatDate(job.completedAt),
      formatSOL(job.paymentAmount),
      job.workerRating ? `${job.workerRating}/5` : "—",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Job Title", "Company", "Date", "Earned", "Rating"]],
      body: tableRows,
      theme: "striped",
      headStyles: { fillColor: BRAND_PURPLE, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: DARK },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 58 },
        2: { cellWidth: 38 },
        3: { cellWidth: 24 },
        4: { cellWidth: 24 },
        5: { cellWidth: 18 },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        y = data.cursor.y;
      },
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Per-job detail + blockchain proof ───────────────────────────────────────
  for (const job of completedJobs) {
    const hasProof =
      job.startJobOTP?.photoUrl || job.proofOfWork?.photoUrl || job.jobPDA || job.transactionSignature;
    if (!hasProof) continue;

    // Check if we need a new page
    if (y > 240) {
      doc.addPage();
      y = 14;
    }

    doc.setFillColor(249, 250, 251);
    const blockHeight = 38;
    doc.roundedRect(10, y, W - 20, blockHeight, 2, 2, "F");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(job.title || "Job", 15, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);

    const beforeUrl = job.startJobOTP?.photoUrl;
    const afterUrl = job.proofOfWork?.photoUrl;
    const gps = job.startJobOTP?.gpsCoordinates || job.proofOfWork?.gpsCoordinates;
    const pda = job.jobPDA;
    const txSig = job.fundTransfer?.transactionSignature || job.transactionSignature;

    let lineY = y + 13;
    if (beforeUrl) {
      doc.text("Before Photo:", 15, lineY);
      doc.setTextColor(...BRAND_PURPLE);
      doc.text(beforeUrl.length > 70 ? beforeUrl.slice(0, 70) + "..." : beforeUrl, 38, lineY);
      doc.setTextColor(...GRAY);
      lineY += 5.5;
    }
    if (afterUrl) {
      doc.text("After Photo:", 15, lineY);
      doc.setTextColor(...BRAND_PURPLE);
      doc.text(afterUrl.length > 70 ? afterUrl.slice(0, 70) + "..." : afterUrl, 38, lineY);
      doc.setTextColor(...GRAY);
      lineY += 5.5;
    }
    if (gps) {
      doc.text(`GPS: ${gps}`, 15, lineY);
      lineY += 5.5;
    }
    if (pda) {
      doc.text(`Job PDA: ${pda}`, 15, lineY);
      lineY += 5.5;
    }
    if (txSig) {
      doc.text(`Payment Tx: ${txSig.length > 70 ? txSig.slice(0, 70) + "..." : txSig}`, 15, lineY);
    }

    // employer review if present
    if (job.employerReview) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...GOLD);
      doc.text(`"${job.employerReview}"`, W - 15, y + 7, { align: "right", maxWidth: 80 });
    }

    y += blockHeight + 5;
  }

  // ── Photo thumbnails (best-effort — skip if CORS blocks) ─────────────────
  const jobsWithPhotos = completedJobs.filter(
    (j) => j.startJobOTP?.photoUrl || j.proofOfWork?.photoUrl
  );

  if (jobsWithPhotos.length > 0) {
    if (y > 200) { doc.addPage(); y = 14; }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Proof Photos", 14, y + 6);
    y += 12;

    for (const job of jobsWithPhotos) {
      const beforeUrl = job.startJobOTP?.photoUrl;
      const afterUrl = job.proofOfWork?.photoUrl;

      if (y > 230) { doc.addPage(); y = 14; }

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(job.title || "Job", 14, y);
      y += 5;

      let thumbX = 14;
      for (const [label, url] of [["Before", beforeUrl], ["After", afterUrl]]) {
        if (!url) continue;
        const b64 = await fetchImageAsBase64(url);
        if (b64) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...GRAY);
          doc.text(label, thumbX, y);
          try {
            doc.addImage(b64, "JPEG", thumbX, y + 2, 40, 30);
          } catch {
            doc.text("[photo]", thumbX + 5, y + 16);
          }
          thumbX += 46;
        }
      }
      y += thumbX > 14 ? 36 : 0;
      y += 4;
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFillColor(...BRAND_PURPLE);
    doc.rect(0, footerY - 4, W, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This certificate is generated by DeWages Network. Job completions and payments are recorded on the Solana blockchain.",
      W / 2, footerY + 1, { align: "center" }
    );
    doc.text(`Page ${p} of ${pageCount}`, W - 12, footerY + 1, { align: "right" });
  }

  const safeName = (profile?.name || "worker").replace(/\s+/g, "_").toLowerCase();
  doc.save(`dewages_certificate_${safeName}_${Date.now()}.pdf`);
}
