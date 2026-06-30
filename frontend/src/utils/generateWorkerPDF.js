import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Palette ─────────────────────────────────────────────────────────────────
const PURPLE      = [88,  28,  235];
const PURPLE_LIGHT= [124, 58,  237];
const PURPLE_PALE = [237, 233, 254];
const PURPLE_MID  = [109, 40,  217];
const GREEN       = [22,  163, 74];
const GREEN_PALE  = [240, 253, 244];
const RED         = [220, 38,  38];
const GRAY        = [107, 114, 128];
const GRAY_PALE   = [248, 248, 252];
const GRAY_MID    = [229, 231, 235];
const DARK        = [17,  24,  39];
const WHITE       = [255, 255, 255];
const AMBER       = [180, 100, 0];
const INDIGO      = [67,  56,  202];
const GOLD        = [161, 120, 0];

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const shortAddr = (a) => a ? `${a.slice(0, 10)}...${a.slice(-8)}` : "—";
const formatSOL = (l) => l ? `${(l / 1e9).toFixed(4)} SOL` : "0.0000 SOL";
const fmtDate   = (d) => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "—";
const expLabel  = (l) =>
  ({ beginner: "Beginner (0–2 yrs)", intermediate: "Intermediate (3–5 yrs)", experienced: "Experienced (5+ yrs)" }[l] || l || "—");
const ratingStr = (n) => n ? `${Number(n).toFixed(1)} / 5.0` : "—";
const certId    = (wallet) => wallet ? `DWN-${wallet.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-6)}` : "DWN-UNKNOWN";

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
function setFont(doc, size, style = "normal", color = DARK) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function pageBorder(doc, W, H) {
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.6);
  doc.roundedRect(4, 4, W - 8, H - 8, 2, 2, "S");
  doc.setDrawColor(200, 185, 255);
  doc.setLineWidth(0.2);
  doc.roundedRect(6, 6, W - 12, H - 12, 1.5, 1.5, "S");
}

function cornerAccent(doc, x, y, size, flip) {
  doc.setFillColor(...PURPLE);
  const s = size;
  if (!flip) {
    doc.rect(x, y, s, 1.2, "F");
    doc.rect(x, y, 1.2, s, "F");
  } else {
    doc.rect(x - s, y, s, 1.2, "F");
    doc.rect(x - 1.2, y, 1.2, s, "F");
  }
}

function sectionTitle(doc, text, y, W) {
  doc.setFillColor(...PURPLE);
  doc.rect(14, y - 1, 3, 7, "F");
  setFont(doc, 8.5, "bold", PURPLE);
  doc.text(text, 20, y + 4.5);
  doc.setDrawColor(...GRAY_MID);
  doc.setLineWidth(0.25);
  doc.line(20 + doc.getTextWidth(text) + 3, y + 2.5, W - 14, y + 2.5);
  return y + 12;
}

function verifiedBadge(doc, label, ok, x, y) {
  const w = 38, h = 7;
  doc.setFillColor(...(ok ? [235, 252, 243] : [254, 242, 242]));
  doc.roundedRect(x, y - 5, w, h, 1.5, 1.5, "F");
  doc.setDrawColor(...(ok ? GREEN : RED));
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y - 5, w, h, 1.5, 1.5, "S");
  setFont(doc, 6.5, "bold", ok ? GREEN : RED);
  doc.text((ok ? "✓ " : "✗ ") + label.toUpperCase(), x + w / 2, y - 0.5, { align: "center" });
}

function statBox(doc, label, value, x, y, w, h, color) {
  doc.setFillColor(...PURPLE_PALE);
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "S");
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w, 1.5, 1.5, 1.5, "F");
  setFont(doc, 13, "bold", color);
  doc.text(value, x + w / 2, y + h / 2 + 1.5, { align: "center" });
  setFont(doc, 6.5, "normal", GRAY);
  doc.text(label, x + w / 2, y + h - 4, { align: "center" });
}

function blockchainSeal(doc, W, y, wallet) {
  const cx = W - 40, cy = y + 22;
  const r1 = 20, r2 = 16;
  doc.setFillColor(...PURPLE_PALE);
  doc.circle(cx, cy, r1, "F");
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.8);
  doc.circle(cx, cy, r1, "S");
  doc.setDrawColor(180, 150, 255);
  doc.setLineWidth(0.3);
  doc.circle(cx, cy, r2, "S");
  setFont(doc, 6, "bold", PURPLE);
  doc.text("BLOCKCHAIN", cx, cy - 6, { align: "center" });
  setFont(doc, 8, "bold", PURPLE_MID);
  doc.text("VERIFIED", cx, cy + 0.5, { align: "center" });
  setFont(doc, 5, "normal", GRAY);
  doc.text("SOLANA", cx, cy + 6, { align: "center" });
  if (wallet) {
    setFont(doc, 4.5, "normal", INDIGO);
    doc.text(wallet.slice(0, 12) + "...", cx, cy + 11, { align: "center" });
  }
  return cy + r1;
}

function pageHeader(doc, W) {
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, W, 26, "F");
  doc.setFillColor(...PURPLE_LIGHT);
  doc.rect(0, 20, W, 6, "F");

  setFont(doc, 17, "bold", WHITE);
  doc.text("DeWages Network", 14, 12);
  setFont(doc, 7, "normal", [200, 185, 255]);
  doc.text("Blockchain-Powered Labour Platform  |  Solana Network", 14, 19);

  setFont(doc, 9.5, "bold", WHITE);
  doc.text("WORK HISTORY CERTIFICATE", W - 14, 11, { align: "right" });
  setFont(doc, 6.5, "normal", [200, 185, 255]);
  doc.text(`Generated: ${fmtDate(new Date())}`, W - 14, 18, { align: "right" });
  setFont(doc, 6, "normal", [220, 210, 255]);
  doc.text("Confidential — For verification purposes only", W / 2, 24, { align: "center" });
}

function pageFooter(doc, W, H, p, total) {
  doc.setFillColor(...PURPLE);
  doc.rect(0, H - 14, W, 14, "F");
  setFont(doc, 5.5, "normal", [200, 185, 255]);
  doc.text(
    "All transactions recorded on Solana blockchain. Verify at solscan.io using the Job PDA or Transaction Signature above.",
    W / 2, H - 7.5, { align: "center", maxWidth: W - 40 }
  );
  doc.setFillColor(255, 255, 255, 0.15);
  doc.setDrawColor(200, 185, 255);
  doc.setLineWidth(0.3);
  setFont(doc, 6, "bold", WHITE);
  doc.text(`Page ${p} / ${total}`, W - 14, H - 4, { align: "right" });
  setFont(doc, 6, "normal", [200, 185, 255]);
  doc.text("dewages.network", 14, H - 4);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export async function generateWorkerPDF(profile, completedJobs = []) {
  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W    = doc.internal.pageSize.getWidth();
  const H    = doc.internal.pageSize.getHeight();
  const ML   = 14;
  const MR   = W - 14;
  const BODY = W - ML * 2;
  let y      = 0;

  const newPage = () => {
    doc.addPage();
    pageHeader(doc, W);
    pageBorder(doc, W, H);
    y = 32;
  };
  const needRoom = (h) => { if (y + h > H - 20) newPage(); };

  // ─── Page 1 ───────────────────────────────────────────────────────────────
  pageHeader(doc, W);
  pageBorder(doc, W, H);
  cornerAccent(doc, ML - 2, 29, 7, false);
  cornerAccent(doc, MR + 2, 29, 7, true);
  y = 32;

  // Certificate title strip
  doc.setFillColor(...GRAY_PALE);
  doc.rect(ML, y, BODY, 10, "F");
  doc.setDrawColor(...GRAY_MID);
  doc.setLineWidth(0.2);
  doc.rect(ML, y, BODY, 10, "S");
  setFont(doc, 10, "bold", PURPLE_MID);
  doc.text("CERTIFICATE OF WORK HISTORY", W / 2, y + 6.5, { align: "center" });
  const cid = certId(profile?.walletAddress);
  setFont(doc, 6.5, "normal", GRAY);
  doc.text(`Certificate ID: ${cid}`, W / 2, y + 10.5, { align: "center" });
  y += 15;

  // ─── Worker profile block ─────────────────────────────────────────────────
  y = sectionTitle(doc, "WORKER PROFILE", y, W);

  // Avatar (left column)
  const avatarB64 = profile?.avatar ? await fetchB64(profile.avatar) : null;
  const aSize = 24;
  if (avatarB64) {
    doc.setDrawColor(...PURPLE);
    doc.setLineWidth(0.5);
    doc.roundedRect(ML, y, aSize, aSize, 2, 2, "S");
    try { doc.addImage(avatarB64, "JPEG", ML, y, aSize, aSize); } catch { /* skip */ }
  } else {
    doc.setFillColor(...PURPLE);
    doc.roundedRect(ML, y, aSize, aSize, 3, 3, "F");
    setFont(doc, 16, "bold", WHITE);
    doc.text((profile?.name?.[0] || "W").toUpperCase(), ML + aSize / 2, y + aSize / 2 + 5, { align: "center" });
  }

  // Name + details (center column)
  const nameX = ML + aSize + 6;
  const detailW = W - nameX - 50;
  setFont(doc, 16, "bold", DARK);
  doc.text(profile?.name || "Worker", nameX, y + 8);
  setFont(doc, 7, "normal", GRAY);
  doc.text(`Wallet:      ${shortAddr(profile?.walletAddress)}`, nameX, y + 14);
  setFont(doc, 7, "normal", DARK);
  doc.text(`Experience:  ${expLabel(profile?.experienceLevel)}`, nameX, y + 19.5);
  const city  = profile?.location?.city || "";
  const state = profile?.location?.state || "";
  const loc   = [city, state].filter(Boolean).join(", ") || "—";
  doc.text(`Location:    ${loc}`, nameX, y + 25);
  if (profile?.phone) doc.text(`Phone:       ${profile.phone}`, nameX, y + 30);

  // Blockchain seal (right column)
  blockchainSeal(doc, W - 8, y - 4, profile?.walletAddress);

  y += aSize + 6;

  // Verification badges
  const bx = ML;
  verifiedBadge(doc, "Email Verified",    !!profile?.verificationStatus?.email,    bx,      y);
  verifiedBadge(doc, "Identity Verified", !!profile?.verificationStatus?.identity, bx + 42, y);
  y += 10;

  // ─── Stats row ────────────────────────────────────────────────────────────
  if (completedJobs.length > 0 || profile?.totalEarnings) {
    needRoom(28);
    const totalLam = completedJobs.reduce((s, j) => s + (j.paymentAmount || 0), 0);
    const rated    = completedJobs.filter((j) => j.workerRating);
    const avg      = rated.length ? (rated.reduce((s, j) => s + j.workerRating, 0) / rated.length).toFixed(1) : "—";
    const boxW     = (BODY - 6) / 3;
    const boxH     = 20;

    statBox(doc, "TOTAL EARNED",   formatSOL(totalLam),             ML,              y, boxW, boxH, GREEN);
    statBox(doc, "JOBS COMPLETED", String(completedJobs.length),    ML + boxW + 3,   y, boxW, boxH, PURPLE_MID);
    statBox(doc, "AVG RATING",     avg === "—" ? "—" : avg + " ★", ML + (boxW+3)*2, y, boxW, boxH, GOLD);
    y += boxH + 6;
  }

  // ─── Skills ───────────────────────────────────────────────────────────────
  const skills = (profile?.skills || []).slice(0, 15);
  if (skills.length > 0) {
    needRoom(20);
    setFont(doc, 7, "bold", GRAY);
    doc.text("SKILLS", ML, y + 4);
    let sx = ML + 16, sy = y;
    for (const skill of skills) {
      setFont(doc, 6.5, "normal", DARK);
      const tw = doc.getTextWidth(skill) + 6;
      if (sx + tw > MR - 4) { sx = ML + 16; sy += 8; }
      doc.setFillColor(...PURPLE_PALE);
      doc.roundedRect(sx, sy, tw, 6.5, 1, 1, "F");
      doc.setDrawColor(200, 185, 255);
      doc.setLineWidth(0.2);
      doc.roundedRect(sx, sy, tw, 6.5, 1, 1, "S");
      setFont(doc, 6.5, "normal", PURPLE_MID);
      doc.text(skill, sx + tw / 2, sy + 4.5, { align: "center" });
      sx += tw + 3;
    }
    y = sy + 12;
  }

  // ─── Bio ──────────────────────────────────────────────────────────────────
  if (profile?.bio) {
    needRoom(20);
    doc.setFillColor(...GRAY_PALE);
    const bioLines = doc.splitTextToSize(`"${profile.bio}"`, BODY - 6);
    const bioH = bioLines.length * 4.5 + 6;
    doc.roundedRect(ML, y, BODY, bioH, 1.5, 1.5, "F");
    doc.setDrawColor(200, 185, 255);
    doc.setLineWidth(0.2);
    doc.roundedRect(ML, y, BODY, bioH, 1.5, 1.5, "S");
    setFont(doc, 7, "italic", GRAY);
    doc.text(bioLines, ML + 3, y + 5);
    y += bioH + 6;
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 2 — Earnings Summary (already computed above if jobs exist)
  // ══════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════
  // SECTION 3 — Job History Table
  // ══════════════════════════════════════════════════════════════════
  needRoom(24);
  y = sectionTitle(doc, "JOB HISTORY", y, W);

  if (completedJobs.length === 0) {
    doc.setFillColor(...GRAY_PALE);
    doc.roundedRect(ML, y, BODY, 12, 1.5, 1.5, "F");
    setFont(doc, 8, "italic", GRAY);
    doc.text("No completed jobs on record yet.", W / 2, y + 7.5, { align: "center" });
    y += 18;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["#", "Job Title", "Company", "Completed On", "Earned (SOL)", "Rating"]],
      body: completedJobs.map((j, i) => [
        i + 1,
        j.title || "—",
        j.companyName || j.companyDetails?.companyName || "—",
        fmtDate(j.completedAt),
        j.paymentAmount ? (j.paymentAmount / 1e9).toFixed(4) : "—",
        j.workerRating ? `${Number(j.workerRating).toFixed(1)} ★` : "—",
      ]),
      theme: "grid",
      headStyles: {
        fillColor: PURPLE, textColor: WHITE,
        fontSize: 7.5, fontStyle: "bold", cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        lineColor: PURPLE_LIGHT, lineWidth: 0.2,
      },
      bodyStyles: { fontSize: 7, textColor: DARK, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [250, 248, 255] },
      columnStyles: {
        0: { cellWidth: 8,  halign: "center", textColor: GRAY },
        1: { cellWidth: 58, fontStyle: "bold" },
        2: { cellWidth: 44 },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 24, halign: "right",  textColor: [22, 163, 74], fontStyle: "bold" },
        5: { cellWidth: 18, halign: "center", textColor: GOLD },
      },
      margin: { left: ML, right: ML },
      tableLineColor: GRAY_MID,
      tableLineWidth: 0.2,
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 4 — Blockchain Evidence
  // ══════════════════════════════════════════════════════════════════
  const proofJobs = completedJobs.filter(
    (j) => j.jobPDA || j.transactionSignature || j.startJobOTP?.photoUrl || j.proofOfWork?.photoUrl
  );

  if (proofJobs.length > 0) {
    needRoom(32);
    y = sectionTitle(doc, "BLOCKCHAIN EVIDENCE", y, W);

    for (let i = 0; i < proofJobs.length; i++) {
      const job    = proofJobs[i];
      const before = job.startJobOTP?.photoUrl;
      const after  = job.proofOfWork?.photoUrl;
      const gps    = job.startJobOTP?.gpsCoordinates || job.proofOfWork?.gpsCoordinates;
      const pda    = job.jobPDA;
      const txSig  = job.fundTransfer?.transactionSignature || job.transactionSignature;
      const review = job.employerReview;

      const fields = [before && "Photo (Before)", after && "Photo (After)", gps && "GPS", pda && "Job PDA", txSig && "Tx Sig", review && "Review"].filter(Boolean);
      const blockH = 12 + fields.length * 5.5 + 4;
      needRoom(blockH + 8);

      // Card background
      doc.setFillColor(...GRAY_PALE);
      doc.roundedRect(ML, y, BODY, blockH, 2, 2, "F");
      doc.setDrawColor(...GRAY_MID);
      doc.setLineWidth(0.2);
      doc.roundedRect(ML, y, BODY, blockH, 2, 2, "S");

      // Left accent bar
      doc.setFillColor(...PURPLE);
      doc.roundedRect(ML, y, 3, blockH, 1, 1, "F");

      // Title
      setFont(doc, 8, "bold", DARK);
      doc.text(`${i + 1}. ${job.title || "Job"}`, ML + 7, y + 8);
      setFont(doc, 6.5, "normal", GRAY);
      doc.text(job.companyName || job.companyDetails?.companyName || "", ML + 7, y + 13);

      // Completed badge
      if (job.completedAt) {
        const badge = `Completed: ${fmtDate(job.completedAt)}`;
        setFont(doc, 6, "normal", GREEN);
        doc.text(badge, MR - 2, y + 8, { align: "right" });
      }

      let ly = y + 18;
      const F = (label, val, truncLen = 85) => {
        if (!val) return;
        setFont(doc, 6.5, "bold", INDIGO);
        doc.text(label, ML + 7, ly);
        setFont(doc, 6.5, "normal", DARK);
        const display = String(val).length > truncLen ? String(val).slice(0, truncLen) + "..." : String(val);
        doc.text(display, ML + 32, ly);
        ly += 5.5;
      };

      F("Job PDA",    pda);
      F("Payment Tx", txSig);
      F("GPS",        gps);
      F("Before URL", before);
      F("After URL",  after);
      if (review) F("Employer Note", `"${review}"`);

      y += blockH + 6;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 5 — Proof Photo Thumbnails
  // ══════════════════════════════════════════════════════════════════
  const photoJobs = completedJobs.filter(
    (j) => j.startJobOTP?.photoUrl || j.proofOfWork?.photoUrl
  );

  if (photoJobs.length > 0) {
    needRoom(70);
    y = sectionTitle(doc, "PROOF PHOTO THUMBNAILS", y, W);

    for (const job of photoJobs) {
      const pairs = [
        { label: "Before Work", url: job.startJobOTP?.photoUrl },
        { label: "After Work",  url: job.proofOfWork?.photoUrl },
      ].filter((p) => p.url);

      if (pairs.length === 0) continue;
      needRoom(65);

      setFont(doc, 7.5, "bold", DARK);
      doc.text(job.title || "Job", ML, y + 1);
      setFont(doc, 6.5, "normal", GRAY);
      doc.text(fmtDate(job.completedAt), MR, y + 1, { align: "right" });
      y += 6;

      let tx2 = ML;
      for (const { label, url } of pairs) {
        const b64 = await fetchB64(url);
        const TW = 55, TH = 44;
        doc.setFillColor(...GRAY_PALE);
        doc.roundedRect(tx2, y, TW, TH + 8, 2, 2, "F");
        doc.setDrawColor(...GRAY_MID);
        doc.setLineWidth(0.2);
        doc.roundedRect(tx2, y, TW, TH + 8, 2, 2, "S");
        setFont(doc, 6.5, "bold", GRAY);
        doc.text(label, tx2 + TW / 2, y + 5, { align: "center" });
        if (b64) {
          try {
            doc.addImage(b64, "JPEG", tx2 + 1, y + 7, TW - 2, TH - 2);
            doc.setDrawColor(...GRAY_MID);
            doc.setLineWidth(0.15);
            doc.rect(tx2 + 1, y + 7, TW - 2, TH - 2, "S");
          } catch {
            setFont(doc, 6.5, "normal", GRAY);
            doc.text("Photo unavailable", tx2 + TW / 2, y + TH / 2 + 7, { align: "center" });
          }
        } else {
          setFont(doc, 6.5, "italic", GRAY);
          doc.text("Could not load photo", tx2 + TW / 2, y + TH / 2 + 7, { align: "center" });
        }
        tx2 += TW + 8;
      }
      y += TH + 16;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // CLOSING VERIFICATION STATEMENT (last page)
  // ══════════════════════════════════════════════════════════════════
  needRoom(32);
  doc.setFillColor(...PURPLE_PALE);
  doc.roundedRect(ML, y, BODY, 28, 2, 2, "F");
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, y, BODY, 28, 2, 2, "S");

  setFont(doc, 8, "bold", PURPLE_MID);
  doc.text("DECLARATION OF AUTHENTICITY", W / 2, y + 7, { align: "center" });
  setFont(doc, 6.5, "normal", DARK);
  const declaration = `This document certifies that ${profile?.name || "the above worker"} has completed the work engagements listed herein. All payment transactions are immutably recorded on the Solana blockchain and can be independently verified using the transaction signatures above.`;
  const declLines = doc.splitTextToSize(declaration, BODY - 10);
  doc.text(declLines, W / 2, y + 13, { align: "center" });

  setFont(doc, 6, "normal", GRAY);
  doc.text(`Issued by DeWages Network  |  Certificate ID: ${certId(profile?.walletAddress)}  |  ${fmtDate(new Date())}`, W / 2, y + 25, { align: "center" });
  y += 34;

  // ══════════════════════════════════════════════════════════════════
  // Footer on every page
  // ══════════════════════════════════════════════════════════════════
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    pageFooter(doc, W, H, p, totalPages);
  }

  const safeName = (profile?.name || "worker").replace(/\s+/g, "_").toLowerCase();
  doc.save(`dewages_certificate_${safeName}.pdf`);
}
