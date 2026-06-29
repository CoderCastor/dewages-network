import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Palette ─────────────────────────────────────────────────────────────────
const PURPLE      = [88,  28,  235];
const PURPLE_PALE = [237, 233, 254];
const PURPLE_MID  = [109, 40,  217];
const GREEN       = [22,  163, 74];
const GREEN_PALE  = [240, 253, 244];
const RED         = [220, 38,  38];
const GRAY        = [107, 114, 128];
const GRAY_PALE   = [243, 244, 246];
const DARK        = [17,  24,  39];
const WHITE       = [255, 255, 255];
const AMBER       = [180, 100, 0];

// ─── Pure helpers (no unicode) ────────────────────────────────────────────────
const shortAddr   = (a) => a ? `${a.slice(0, 8)}...${a.slice(-6)}` : "—";
const formatSOL   = (l) => l ? `${(l / 1e9).toFixed(4)} SOL` : "—";
const fmtDate     = (d) => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "—";
const expLabel    = (l) =>
  ({ beginner: "Beginner (0-2 yrs)", intermediate: "Intermediate (3-5 yrs)", experienced: "Experienced (5+ yrs)" }[l] || l || "—");
const ratingStr   = (n) => n ? `${Number(n).toFixed(1)} / 5.0` : "—";

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

// ─── PDF drawing helpers ─────────────────────────────────────────────────────
function setFont(doc, size, style = "normal", color = DARK) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function divider(doc, y, W, color = [220, 220, 220]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(14, y, W - 14, y);
}

function sectionTitle(doc, text, y, W) {
  setFont(doc, 9, "bold", PURPLE);
  doc.text(text, 14, y);
  divider(doc, y + 2, W, PURPLE);
  return y + 9;
}

function verdictBadge(doc, label, ok, x, y) {
  const w = 36, h = 6;
  doc.setFillColor(...(ok ? GREEN : RED));
  doc.roundedRect(x, y - 4.5, w, h, 1.5, 1.5, "F");
  setFont(doc, 7, "bold", WHITE);
  doc.text((ok ? "VERIFIED" : "NOT VERIFIED"), x + w / 2, y - 0.5, { align: "center" });
  setFont(doc, 7, "normal", ok ? GREEN : RED);
  doc.text(label, x + w / 2, y + 4, { align: "center" });
}

function infoRow(doc, label, value, lx, vx, y, maxW) {
  setFont(doc, 7.5, "bold", GRAY);
  doc.text(label, lx, y);
  setFont(doc, 7.5, "normal", DARK);
  const lines = doc.splitTextToSize(String(value || "—"), maxW);
  doc.text(lines, vx, y);
  return y + lines.length * 4.5;
}

function pageHeader(doc, W) {
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, W, 24, "F");

  // left: brand
  setFont(doc, 16, "bold", WHITE);
  doc.text("DeWages Network", 14, 11);
  setFont(doc, 7.5, "normal", [200, 180, 255]);
  doc.text("Blockchain-Verified Work Certificate  |  Powered by Solana", 14, 18);

  // right: title + date
  setFont(doc, 10, "bold", WHITE);
  doc.text("WORK HISTORY CERTIFICATE", W - 14, 10, { align: "right" });
  setFont(doc, 7.5, "normal", [200, 180, 255]);
  doc.text(`Generated: ${fmtDate(new Date())}`, W - 14, 17, { align: "right" });
}

function pageFooter(doc, W, H, p, total) {
  doc.setFillColor(...PURPLE);
  doc.rect(0, H - 12, W, 12, "F");
  setFont(doc, 6.5, "normal", [200, 180, 255]);
  doc.text(
    "All job completions and payments on this certificate are recorded on the Solana blockchain and can be independently verified.",
    W / 2, H - 6, { align: "center" }
  );
  setFont(doc, 6.5, "bold", WHITE);
  doc.text(`${p} / ${total}`, W - 12, H - 6, { align: "right" });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export async function generateWorkerPDF(profile, completedJobs = []) {
  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W    = doc.internal.pageSize.getWidth();
  const H    = doc.internal.pageSize.getHeight();
  const ML   = 14;
  const BODY = W - ML * 2;
  let y      = 0;

  const newPage = () => {
    doc.addPage();
    pageHeader(doc, W);
    y = 30;
  };
  const needRoom = (h) => { if (y + h > H - 18) newPage(); };

  pageHeader(doc, W);
  y = 30;

  // ══════════════════════════════════════════════════════════════════
  // SECTION 1 — Worker Profile
  // ══════════════════════════════════════════════════════════════════
  y = sectionTitle(doc, "WORKER PROFILE", y, W);

  // Avatar
  const avatarB64 = profile?.avatar ? await fetchB64(profile.avatar) : null;
  const aSize = 20;
  if (avatarB64) {
    try { doc.addImage(avatarB64, "JPEG", ML, y, aSize, aSize); } catch { /* skip */ }
  } else {
    doc.setFillColor(...PURPLE);
    doc.roundedRect(ML, y, aSize, aSize, 3, 3, "F");
    setFont(doc, 14, "bold", WHITE);
    doc.text((profile?.name?.[0] || "W").toUpperCase(), ML + aSize / 2, y + aSize / 2 + 4, { align: "center" });
  }

  // Name + wallet + experience
  const tx = ML + aSize + 6;
  setFont(doc, 14, "bold", DARK);
  doc.text(profile?.name || "Worker", tx, y + 7);

  setFont(doc, 7.5, "normal", GRAY);
  doc.text(`Wallet: ${shortAddr(profile?.walletAddress)}`, tx, y + 13);

  setFont(doc, 7.5, "normal", DARK);
  doc.text(`Experience: ${expLabel(profile?.experienceLevel)}`, tx, y + 19);
  doc.text(`Location:   ${profile?.location?.city || "—"}, ${profile?.location?.state || ""}`, tx, y + 24);
  doc.text(`Phone:      ${profile?.phone || "—"}`, tx, y + 29);

  // Verification badges (right side)
  const bx = W - ML - 80;
  verdictBadge(doc, "Email", !!profile?.verificationStatus?.email,   bx,      y + 9);
  verdictBadge(doc, "PAN",   !!profile?.verificationStatus?.identity, bx + 40, y + 9);

  // Rating box
  const rating = profile?.rating ? Number(profile.rating).toFixed(1) : "0.0";
  doc.setFillColor(...PURPLE_PALE);
  doc.roundedRect(bx, y + 16, 78, 14, 2, 2, "F");
  setFont(doc, 14, "bold", PURPLE);
  doc.text(rating, bx + 20, y + 26, { align: "center" });
  setFont(doc, 7, "normal", GRAY);
  doc.text("Rating", bx + 20, y + 29.5, { align: "center" });
  setFont(doc, 14, "bold", DARK);
  doc.text(String(profile?.completedJobs || 0), bx + 58, y + 26, { align: "center" });
  setFont(doc, 7, "normal", GRAY);
  doc.text("Jobs Done", bx + 58, y + 29.5, { align: "center" });

  y += aSize + 5;

  // Skills strip
  const skills = (profile?.skills || []).slice(0, 12).join("   |   ");
  if (skills) {
    doc.setFillColor(...GRAY_PALE);
    doc.roundedRect(ML, y, BODY, 9, 1.5, 1.5, "F");
    setFont(doc, 7, "normal", GRAY);
    doc.text("Skills:", ML + 3, y + 5.5);
    setFont(doc, 7, "normal", DARK);
    const skillLine = doc.splitTextToSize(skills, BODY - 20);
    doc.text(skillLine[0], ML + 17, y + 5.5);
    y += 14;
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 2 — Earnings Summary
  // ══════════════════════════════════════════════════════════════════
  if (completedJobs.length > 0) {
    needRoom(22);
    const totalLam = completedJobs.reduce((s, j) => s + (j.paymentAmount || 0), 0);
    const rated    = completedJobs.filter((j) => j.workerRating);
    const avg      = rated.length ? (rated.reduce((s, j) => s + j.workerRating, 0) / rated.length).toFixed(1) : "—";

    y = sectionTitle(doc, "EARNINGS SUMMARY", y, W);

    doc.setFillColor(...GREEN_PALE);
    doc.roundedRect(ML, y, BODY, 16, 2, 2, "F");
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML, y, BODY, 16, 2, 2, "S");

    const cols = [
      { label: "Total Earned",    val: formatSOL(totalLam) },
      { label: "Jobs Completed",  val: String(completedJobs.length) },
      { label: "Average Rating",  val: avg + " / 5.0" },
    ];
    const colW = BODY / 3;
    cols.forEach((c, i) => {
      const cx = ML + i * colW + colW / 2;
      setFont(doc, 10, "bold", PURPLE_MID);
      doc.text(c.val, cx, y + 9, { align: "center" });
      setFont(doc, 6.5, "normal", GRAY);
      doc.text(c.label, cx, y + 13.5, { align: "center" });
    });
    y += 22;
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 3 — Job History Table
  // ══════════════════════════════════════════════════════════════════
  needRoom(20);
  y = sectionTitle(doc, "JOB HISTORY", y, W);

  if (completedJobs.length === 0) {
    setFont(doc, 9, "italic", GRAY);
    doc.text("No completed jobs on record.", ML, y + 5);
    y += 12;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["#", "Job Title", "Company", "Completed On", "Earned", "Rating"]],
      body: completedJobs.map((j, i) => [
        i + 1,
        j.title || "—",
        j.companyName || j.companyDetails?.companyName || "—",
        fmtDate(j.completedAt),
        formatSOL(j.paymentAmount),
        ratingStr(j.workerRating),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: PURPLE, textColor: WHITE,
        fontSize: 8, fontStyle: "bold", cellPadding: 3,
      },
      bodyStyles: { fontSize: 7.5, textColor: DARK, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 247, 255] },
      columnStyles: {
        0: { cellWidth: 8,  halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: 42 },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 20, halign: "center" },
      },
      margin: { left: ML, right: ML },
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
    needRoom(30);
    y = sectionTitle(doc, "BLOCKCHAIN EVIDENCE", y, W);

    for (let i = 0; i < proofJobs.length; i++) {
      const job      = proofJobs[i];
      const before   = job.startJobOTP?.photoUrl;
      const after    = job.proofOfWork?.photoUrl;
      const gps      = job.startJobOTP?.gpsCoordinates || job.proofOfWork?.gpsCoordinates;
      const pda      = job.jobPDA;
      const txSig    = job.fundTransfer?.transactionSignature || job.transactionSignature;
      const review   = job.employerReview;

      // calculate block height dynamically
      const fieldCount = [before, after, gps, pda, txSig, review].filter(Boolean).length;
      const blockH = 10 + fieldCount * 5 + 4;
      needRoom(blockH + 6);

      doc.setFillColor(...GRAY_PALE);
      doc.roundedRect(ML, y, BODY, blockH, 2, 2, "F");
      doc.setDrawColor(...PURPLE);
      doc.setLineWidth(0.5);
      doc.line(ML, y + 0.5, ML, y + blockH - 0.5); // left accent bar

      setFont(doc, 8, "bold", PURPLE_MID);
      doc.text(`Job ${i + 1}: ${job.title || ""}`, ML + 4, y + 7);

      let ly = y + 13;
      const F = (label, val, truncLen = 90) => {
        if (!val) return;
        setFont(doc, 7, "bold", GRAY);
        doc.text(label + ":", ML + 4, ly);
        const display = String(val).length > truncLen ? String(val).slice(0, truncLen) + "..." : String(val);
        setFont(doc, 7, "normal", DARK);
        doc.text(display, ML + 32, ly);
        ly += 5;
      };

      F("Company",    job.companyName || job.companyDetails?.companyName);
      F("Completed",  fmtDate(job.completedAt));
      F("Job PDA",    pda);
      F("Payment Tx", txSig);
      F("GPS",        gps);
      F("Before URL", before);
      F("After URL",  after);
      if (review) { F("Employer Review", `"${review}"`); }

      y += blockH + 5;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 5 — Proof Photo Thumbnails
  // ══════════════════════════════════════════════════════════════════
  const photoJobs = completedJobs.filter(
    (j) => j.startJobOTP?.photoUrl || j.proofOfWork?.photoUrl
  );

  if (photoJobs.length > 0) {
    needRoom(60);
    y = sectionTitle(doc, "PROOF PHOTO THUMBNAILS", y, W);

    for (const job of photoJobs) {
      const pairs = [
        { label: "Before Work", url: job.startJobOTP?.photoUrl },
        { label: "After Work",  url: job.proofOfWork?.photoUrl },
      ].filter((p) => p.url);

      if (pairs.length === 0) continue;
      needRoom(58);

      setFont(doc, 8, "bold", DARK);
      doc.text(job.title || "Job", ML, y);
      y += 4;

      let tx2 = ML;
      for (const { label, url } of pairs) {
        const b64 = await fetchB64(url);
        const TW = 55, TH = 42;
        setFont(doc, 6.5, "bold", GRAY);
        doc.text(label, tx2, y + 3);
        if (b64) {
          try {
            doc.addImage(b64, "JPEG", tx2, y + 5, TW, TH);
            doc.setDrawColor(...GRAY);
            doc.setLineWidth(0.2);
            doc.rect(tx2, y + 5, TW, TH, "S");
          } catch {
            doc.setFillColor(...GRAY_PALE);
            doc.rect(tx2, y + 5, TW, TH, "F");
            setFont(doc, 7, "normal", GRAY);
            doc.text("Photo unavailable", tx2 + TW / 2, y + 5 + TH / 2, { align: "center" });
          }
        } else {
          doc.setFillColor(...GRAY_PALE);
          doc.rect(tx2, y + 5, TW, TH, "F");
          setFont(doc, 7, "normal", GRAY);
          doc.text("Could not load", tx2 + TW / 2, y + 5 + TH / 2, { align: "center" });
        }
        tx2 += TW + 8;
      }
      y += 52;
    }
  }

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
