import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Colours ────────────────────────────────────────────────────────────────
const C = {
  purple:      [88,  28,  235],
  purpleLight: [237, 233, 254],
  purpleMid:   [109, 40,  217],
  green:       [22,  163, 74],
  red:         [220, 38,  38],
  gray:        [107, 114, 128],
  grayLight:   [243, 244, 246],
  dark:        [17,  24,  39],
  white:       [255, 255, 255],
  gold:        [180, 100, 0],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const shortWallet = (a) => a ? `${a.slice(0, 8)}...${a.slice(-8)}` : "—";
const formatSOL   = (l) => l ? `${(l / 1e9).toFixed(4)} SOL` : "—";
const formatDate  = (d) => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "—";
const expLabel = (l) =>
  ({ beginner: "Beginner (0–2 yrs)", intermediate: "Intermediate (3–5 yrs)", experienced: "Experienced (5+ yrs)" }[l] || l || "—");

async function fetchB64(url) {
  try {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) return null;
    const blob = await r.blob();
    return new Promise((res) => {
      const rd = new FileReader();
      rd.onloadend = () => res(rd.result);
      rd.onerror   = () => res(null);
      rd.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function sectionHeader(doc, label, y, W) {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.purple);
  doc.text(label.toUpperCase(), 14, y);
  doc.setDrawColor(...C.purple);
  doc.setLineWidth(0.4);
  doc.line(14, y + 1.5, W - 14, y + 1.5);
  return y + 7;
}

function kv(doc, key, val, x, y, W) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.gray);
  doc.text(key, x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.dark);
  const lines = doc.splitTextToSize(String(val || "—"), W - x - 10);
  doc.text(lines, x + 28, y);
  return y + lines.length * 4.5;
}

function badge(doc, label, ok, x, y) {
  doc.setFillColor(...(ok ? C.green : C.red));
  doc.roundedRect(x, y - 3.5, 34, 5.5, 1, 1, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text((ok ? "✓ " : "✗ ") + label, x + 17, y, { align: "center" });
  return x + 37;
}

function pageHeader(doc, W) {
  doc.setFillColor(...C.purple);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("DeWages Network", 14, 10);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Blockchain-Verified Work Certificate", 14, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("WORK HISTORY CERTIFICATE", W - 14, 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Generated: ${formatDate(new Date())}`, W - 14, 16, { align: "right" });
}

function pageFooter(doc, W, H, pageNum, total) {
  doc.setFillColor(...C.purple);
  doc.rect(0, H - 10, W, 10, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(
    "Job completions and payments are recorded on the Solana blockchain and are independently verifiable.",
    W / 2, H - 5, { align: "center" }
  );
  doc.text(`Page ${pageNum} / ${total}`, W - 12, H - 5, { align: "right" });
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateWorkerPDF(profile, completedJobs = []) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const MARGIN = 14;
  let y = 0;

  pageHeader(doc, W);
  y = 30;

  // ── 1. Worker Profile Card ─────────────────────────────────────────────────
  doc.setFillColor(...C.purpleLight);
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 62, 3, 3, "F");

  // Avatar circle
  const avatarB64 = profile?.avatar ? await fetchB64(profile.avatar) : null;
  const avatarX = MARGIN + 6;
  const avatarY = y + 6;
  const avatarR = 10;
  if (avatarB64) {
    doc.addImage(avatarB64, "JPEG", avatarX, avatarY, avatarR * 2, avatarR * 2);
  } else {
    doc.setFillColor(...C.purple);
    doc.circle(avatarX + avatarR, avatarY + avatarR, avatarR, "F");
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text((profile?.name?.[0] || "W").toUpperCase(), avatarX + avatarR, avatarY + avatarR + 4, { align: "center" });
  }

  // Name + wallet
  const textX = avatarX + avatarR * 2 + 5;
  doc.setTextColor(...C.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(profile?.name || "Worker", textX, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray);
  doc.text(`Wallet: ${shortWallet(profile?.walletAddress)}`, textX, y + 19);

  // Verification badges
  const bx = badge(doc, "Email Verified", profile?.verificationStatus?.email, textX, y + 27);
  badge(doc, "PAN Verified", profile?.verificationStatus?.identity, bx, y + 27);

  // Stats on right side
  const statsX = W / 2 + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.purple);
  const rating = profile?.rating ? Number(profile.rating).toFixed(1) : "0.0";
  doc.text(`${rating} ★`, statsX, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.gray);
  doc.text("Overall Rating", statsX + 12, y + 13);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.dark);
  doc.text(`${profile?.completedJobs || 0}`, statsX, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.gray);
  doc.text("Jobs Completed", statsX + 6, y + 21);

  // Details row
  let dy = y + 35;
  dy = kv(doc, "Experience", expLabel(profile?.experienceLevel), MARGIN + 5, dy, W / 2);
  dy = kv(doc, "Location", `${profile?.location?.city || "—"}, ${profile?.location?.state || ""}`, MARGIN + 5, dy, W / 2);
  kv(doc, "Phone", profile?.phone || "—", W / 2, y + 35, W);

  // Skills
  const skillStr = (profile?.skills || []).slice(0, 10).join("  ·  ") || "—";
  const skillLines = doc.splitTextToSize(skillStr, W - MARGIN * 2 - 10);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.gray);
  doc.text("Skills:", MARGIN + 5, y + 54);
  doc.setTextColor(...C.dark);
  doc.text(skillLines, MARGIN + 18, y + 54);

  y += 68;

  // ── 2. Earnings Summary ────────────────────────────────────────────────────
  if (completedJobs.length > 0) {
    const totalSOL = completedJobs.reduce((s, j) => s + (j.paymentAmount || 0), 0);
    const rated    = completedJobs.filter((j) => j.workerRating);
    const avgRating = rated.length
      ? (rated.reduce((s, j) => s + j.workerRating, 0) / rated.length).toFixed(1)
      : "—";

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 16, 2, 2, "F");
    doc.setDrawColor(...C.green);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 16, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.green);
    doc.text("EARNINGS SUMMARY", MARGIN + 5, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.dark);
    doc.text(
      `Total Earned: ${formatSOL(totalSOL)}     Jobs: ${completedJobs.length}     Avg. Rating: ${avgRating} ★`,
      MARGIN + 5, y + 12
    );
    y += 22;
  }

  // ── 3. Job History Table ───────────────────────────────────────────────────
  y = sectionHeader(doc, "Job History", y, W);

  if (completedJobs.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.gray);
    doc.text("No completed jobs on record.", MARGIN, y + 5);
    y += 12;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["#", "Job Title", "Company", "Completed", "Earned", "Rating"]],
      body: completedJobs.map((j, i) => [
        i + 1,
        j.title || "—",
        j.companyName || j.companyDetails?.companyName || "—",
        formatDate(j.completedAt),
        formatSOL(j.paymentAmount),
        j.workerRating ? `${j.workerRating} / 5` : "—",
      ]),
      theme: "grid",
      headStyles: {
        fillColor: C.purple,
        textColor: C.white,
        fontSize: 8,
        fontStyle: "bold",
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 7.5, textColor: C.dark, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [248, 247, 255] },
      columnStyles: {
        0: { cellWidth: 8,  halign: "center" },
        1: { cellWidth: 62 },
        2: { cellWidth: 40 },
        3: { cellWidth: 24, halign: "center" },
        4: { cellWidth: 22, halign: "center" },
        5: { cellWidth: 18, halign: "center" },
      },
      margin: { left: MARGIN, right: MARGIN },
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // ── 4. Blockchain Evidence — one block per job ─────────────────────────────
  if (completedJobs.some((j) => j.jobPDA || j.startJobOTP?.photoUrl || j.proofOfWork?.photoUrl)) {
    if (y > H - 60) { doc.addPage(); pageHeader(doc, W); y = 30; }
    y = sectionHeader(doc, "Blockchain Evidence", y, W);

    for (let i = 0; i < completedJobs.length; i++) {
      const job = completedJobs[i];
      const beforeUrl = job.startJobOTP?.photoUrl;
      const afterUrl  = job.proofOfWork?.photoUrl;
      const gps       = job.startJobOTP?.gpsCoordinates || job.proofOfWork?.gpsCoordinates;
      const pda       = job.jobPDA;
      const txSig     = job.fundTransfer?.transactionSignature || job.transactionSignature;

      if (!pda && !beforeUrl && !afterUrl && !gps && !txSig) continue;

      // Estimate height needed
      const lines = [beforeUrl, afterUrl, gps, pda, txSig].filter(Boolean).length;
      const blockH = 12 + lines * 5.5;
      if (y + blockH > H - 18) { doc.addPage(); pageHeader(doc, W); y = 30; }

      // Job label
      doc.setFillColor(...C.grayLight);
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, blockH, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...C.purpleMid);
      doc.text(`Job ${i + 1}: ${job.title || ""}`, MARGIN + 4, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      let ly = y + 11;

      const field = (label, val) => {
        if (!val) return;
        doc.setTextColor(...C.gray);
        doc.text(label + ":", MARGIN + 4, ly);
        doc.setTextColor(...C.dark);
        const truncated = val.length > 85 ? val.slice(0, 85) + "…" : val;
        doc.text(truncated, MARGIN + 30, ly);
        ly += 5;
      };

      field("Company",    job.companyName || job.companyDetails?.companyName);
      field("Completed",  formatDate(job.completedAt));
      field("Job PDA",    pda);
      field("Payment Tx", txSig);
      field("GPS",        gps);
      field("Before",     beforeUrl);
      field("After",      afterUrl);

      y += blockH + 4;
    }
  }

  // ── 5. Proof Photo Thumbnails (best-effort) ────────────────────────────────
  const photoPairs = completedJobs
    .map((j, i) => ({
      idx: i + 1,
      title: j.title,
      before: j.startJobOTP?.photoUrl,
      after:  j.proofOfWork?.photoUrl,
    }))
    .filter((p) => p.before || p.after);

  if (photoPairs.length > 0) {
    if (y > H - 80) { doc.addPage(); pageHeader(doc, W); y = 30; }
    y = sectionHeader(doc, "Proof Photos", y, W);

    for (const pair of photoPairs) {
      if (y > H - 60) { doc.addPage(); pageHeader(doc, W); y = 30; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...C.dark);
      doc.text(`Job ${pair.idx}: ${pair.title || ""}`, MARGIN, y);
      y += 4;

      let thumbX = MARGIN;
      const thumbW = 55;
      const thumbH = 40;

      for (const [label, url] of [["Before Work", pair.before], ["After Work", pair.after]]) {
        if (!url) continue;
        const b64 = await fetchB64(url);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.gray);
        doc.text(label, thumbX, y + 3);
        if (b64) {
          try {
            doc.addImage(b64, "JPEG", thumbX, y + 5, thumbW, thumbH);
          } catch {
            doc.setFillColor(...C.grayLight);
            doc.rect(thumbX, y + 5, thumbW, thumbH, "F");
            doc.setTextColor(...C.gray);
            doc.text("[photo unavailable]", thumbX + thumbW / 2, y + 5 + thumbH / 2, { align: "center" });
          }
        } else {
          doc.setFillColor(...C.grayLight);
          doc.rect(thumbX, y + 5, thumbW, thumbH, "F");
          doc.setTextColor(...C.gray);
          doc.text("[could not load]", thumbX + thumbW / 2, y + 5 + thumbH / 2, { align: "center" });
        }
        thumbX += thumbW + 6;
      }
      y += thumbH + 12;
    }
  }

  // ── Footer on every page ───────────────────────────────────────────────────
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    pageFooter(doc, W, H, p, total);
  }

  const safeName = (profile?.name || "worker").replace(/\s+/g, "_").toLowerCase();
  doc.save(`dewages_work_certificate_${safeName}.pdf`);
}
