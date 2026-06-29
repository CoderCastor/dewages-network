import { useState } from "react";
import {
  AlertTriangle, Star, Briefcase, ThumbsUp, ThumbsDown,
  SplitSquareHorizontal, Loader2, ChevronDown, ChevronUp,
  Scale, CheckCircle, ExternalLink, X,
} from "lucide-react";
import { BACKEND_URL } from "@/env-variables";
import toast from "react-hot-toast";

// ─── Sub-components ───────────────────────────────────────────────────────────

const Stars = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
    ))}
    <span className="ml-1 text-xs font-semibold text-gray-700">{Number(rating).toFixed(1)}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    completed: "bg-green-100 text-green-700",
    in_progress: "bg-blue-100 text-blue-700",
    disputed: "bg-red-100 text-red-700",
    open: "bg-gray-100 text-gray-700",
    pending_verification: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
};

/** Inline notes modal (no window.prompt) */
const NotesModal = ({ resolution, onConfirm, onCancel }) => {
  const [notes, setNotes] = useState("");
  const labels = {
    favor_worker:   { title: "Favor Worker", color: "text-green-700",  border: "border-green-300" },
    split:          { title: "Split 50/50",  color: "text-blue-700",   border: "border-blue-300"  },
    favor_employer: { title: "Favor Company",color: "text-orange-700", border: "border-orange-300"},
  };
  const l = labels[resolution] || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl border-2 ${l.border} w-full max-w-md mx-4 p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${l.color}`}>Resolve: {l.title}</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">Add resolution notes (optional). This will be recorded on-chain and in the dispute history.</p>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-400 resize-none"
          rows={4}
          placeholder="e.g. Worker provided sufficient proof of completion. Payment released."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-semibold hover:bg-gray-50 text-sm">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(notes)}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm"
          >
            Confirm Resolution
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export default function DisputePanel({ disputes, onResolved }) {
  const [expanded,  setExpanded]  = useState({});
  const [resolving, setResolving] = useState(null); // jobId string while in-flight
  const [modal,     setModal]     = useState(null); // { jobId, resolution }

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const openModal = (jobId, resolution) => setModal({ jobId, resolution });

  const handleResolve = async (notes) => {
    if (!modal) return;
    const { jobId, resolution } = modal;
    setModal(null);
    setResolving(jobId + resolution);

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${BACKEND_URL}/admin/disputes/${jobId}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, notes: notes || resolution }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`✅ Dispute resolved on-chain! TX: ${data.txSignature?.slice(0, 12)}…`);
        onResolved();
      } else if (res.status === 502) {
        // On-chain failed — no DB changes made
        toast.error(
          `❌ On-chain transaction failed. No changes made.\n${data.error || ""}`,
          { duration: 8000 }
        );
        console.error("[DisputePanel] On-chain error logs:", data.logs);
      } else {
        toast.error(data.message || "Failed to resolve dispute");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error resolving dispute");
    } finally {
      setResolving(null);
    }
  };


  if (!disputes.length) return (
    <div className="bg-white rounded-xl shadow-md p-12 text-center">
      <Scale className="w-16 h-16 text-slate-300 mx-auto mb-4" />
      <p className="text-slate-500 text-lg font-medium">No active disputes</p>
      <p className="text-slate-400 text-sm mt-2">All disputes have been resolved</p>
    </div>
  );

  return (
    <>
      {modal && (
        <NotesModal
          resolution={modal.resolution}
          onConfirm={handleResolve}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="space-y-6">
        {disputes.map((job) => {
          const isOpen  = expanded[job._id];
          const dispute = job.dispute || {};
          const w       = job.workerDetails  || {};
          const c       = job.companyDetails || {};
          const isAnyResolving = !!resolving;

          return (
            <div key={job._id} className="bg-white rounded-xl shadow-md border-l-4 border-red-500 overflow-hidden">
              {/* ── Card header ── */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{job.title}</h3>
                    <div className="flex gap-4 mt-1 text-sm text-slate-500">
                      <span>Company: <span className="font-semibold text-slate-700">{c.companyName || job.companyName}</span></span>
                      <span>Worker: <span className="font-semibold text-slate-700">{w.name || job.workerName}</span></span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Payment: {job.paymentAmount ? (job.paymentAmount / 1_000_000_000).toFixed(2) + " SOL" : "—"}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">DISPUTED</span>
                </div>

                {/* Dispute reason */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-semibold text-red-800">
                      Raised by: {dispute.raisedBy === "worker"
                        ? `Worker (${w.name || job.workerName})`
                        : `Company (${c.companyName || job.companyName})`}
                    </p>
                  </div>
                  {dispute.otpNotProvided && (
                    <div className="flex items-center gap-1.5 mb-2 bg-orange-100 border border-orange-300 rounded px-2 py-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                      <span className="text-xs font-semibold text-orange-800">
                        ⚠️ Employer did NOT give End OTP — worker disputes work completion
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-slate-700"><span className="font-medium">Reason:</span> {dispute.reason || "—"}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Raised on: {dispute.createdAt ? new Date(dispute.createdAt).toLocaleString() : "—"}
                  </p>
                  {(dispute.evidencePhotoUrl || dispute.evidenceGpsCoordinates) && (
                    <div className="mt-2 pt-2 border-t border-red-200 space-y-1">
                      <p className="text-xs font-semibold text-slate-600">Worker Evidence:</p>
                      {dispute.evidencePhotoUrl && (
                        <a href={dispute.evidencePhotoUrl} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          📷 View Evidence Photo
                        </a>
                      )}
                      {dispute.evidenceGpsCoordinates && (
                        <p className="text-xs text-slate-500">
                          📍 GPS: {dispute.evidenceGpsCoordinates}
                          <a
                            href={`https://maps.google.com/?q=${dispute.evidenceGpsCoordinates}`}
                            target="_blank" rel="noreferrer"
                            className="ml-1 text-blue-600 hover:underline"
                          >(View Map)</a>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick ratings */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Worker — {w.name || "—"}</p>
                    {w.rating ? <Stars rating={w.rating} /> : <p className="text-xs text-gray-400">No ratings yet</p>}
                    <p className="text-xs text-gray-500 mt-1">{w.completedJobs || 0} jobs · {w.experienceLevel || "—"}</p>
                    {w.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {w.skills.slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-700 mb-1">Company — {c.companyName || "—"}</p>
                    {c.rating ? <Stars rating={c.rating} /> : <p className="text-xs text-gray-400">No ratings yet</p>}
                    <p className="text-xs text-gray-500 mt-1">{c.location?.city || "—"}</p>
                  </div>
                </div>

                {/* Resolution buttons */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { res: "favor_worker",   label: "Favor Worker",   icon: ThumbsUp,              cls: "from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"   },
                    { res: "split",          label: "Split 50/50",    icon: SplitSquareHorizontal, cls: "from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"       },
                    { res: "favor_employer", label: "Favor Company",  icon: ThumbsDown,            cls: "from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"         },
                  ].map(({ res, label, icon: Icon, cls }) => (
                    <button
                      key={res}
                      onClick={() => openModal(job._id, res)}
                      disabled={isAnyResolving}
                      className={`flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r ${cls} text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50`}
                    >
                      {resolving === job._id + res
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Icon className="w-4 h-4" />}
                      {resolving === job._id + res ? "Processing…" : label}
                    </button>
                  ))}
                </div>

                {/* Expand toggle */}
                <button onClick={() => toggle(job._id)} className="mt-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isOpen ? "Hide" : "Show"} full history & details
                </button>
              </div>

              {/* ── Expanded section ── */}
              {isOpen && (
                <div className="border-t border-slate-200 p-6 bg-slate-50 space-y-6">
                  {/* Rating histories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" /> Worker Rating History
                      </h4>
                      {(job.workerRatingHistory || []).length === 0
                        ? <p className="text-xs text-slate-400">No ratings yet</p>
                        : (job.workerRatingHistory || []).map((r, i) => (
                          <div key={i} className="bg-white rounded-lg p-3 mb-2 border border-slate-200">
                            <p className="text-xs font-semibold text-slate-700">{r.title}</p>
                            <p className="text-xs text-slate-500">{r.companyName}</p>
                            <Stars rating={r.employerRating?.rating || 0} />
                            {r.employerRating?.review && <p className="text-xs text-slate-600 italic mt-1">"{r.employerRating.review}"</p>}
                          </div>
                        ))}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <Star className="w-4 h-4 text-purple-500" /> Company Rating History
                      </h4>
                      {(job.companyRatingHistory || []).length === 0
                        ? <p className="text-xs text-slate-400">No ratings yet</p>
                        : (job.companyRatingHistory || []).map((r, i) => (
                          <div key={i} className="bg-white rounded-lg p-3 mb-2 border border-slate-200">
                            <p className="text-xs font-semibold text-slate-700">{r.title}</p>
                            <p className="text-xs text-slate-500">Worker: {r.workerName}</p>
                            <Stars rating={r.workerRating?.rating || 0} />
                            {r.workerRating?.review && <p className="text-xs text-slate-600 italic mt-1">"{r.workerRating.review}"</p>}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Job histories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <Briefcase className="w-4 h-4 text-blue-500" /> Worker's Job History
                      </h4>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {(job.workerJobHistory || []).map((j, i) => (
                          <div key={i} className="bg-white rounded-lg p-2 border border-slate-200 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-slate-700 truncate max-w-[160px]">{j.title}</p>
                              <p className="text-xs text-slate-400">{j.companyName}</p>
                            </div>
                            <StatusBadge status={j.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <Briefcase className="w-4 h-4 text-purple-500" /> Company's Job History
                      </h4>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {(job.companyJobHistory || []).map((j, i) => (
                          <div key={i} className="bg-white rounded-lg p-2 border border-slate-200 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-slate-700 truncate max-w-[160px]">{j.title}</p>
                              <p className="text-xs text-slate-400">{j.workerName || "Unassigned"}</p>
                              {j.dispute?.status && <span className="text-xs text-red-500 font-semibold">⚠ {j.dispute.status}</span>}
                            </div>
                            <StatusBadge status={j.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Evidence Bundle — Before & After Photos */}
                  {(job.proofOfWork || job.startJobOTP?.photoUrl) && (
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-1">
                        🛡️ Evidence Bundle — Before &amp; After
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* ── BEFORE photo (Start OTP) ── */}
                        <div className="bg-white rounded-lg border-2 border-green-200 overflow-hidden text-xs">
                          <div className="bg-green-50 px-3 py-2 font-semibold text-green-700 flex items-center gap-1.5">
                            📸 Before Work
                            <span className="ml-auto text-green-500 font-normal">Start OTP</span>
                          </div>
                          {job.startJobOTP?.photoUrl ? (
                            <>
                              <img
                                src={job.startJobOTP.photoUrl}
                                alt="Before-work photo"
                                className="w-full h-40 object-cover"
                              />
                              <a
                                href={job.startJobOTP.photoUrl}
                                target="_blank" rel="noreferrer"
                                className="block text-center py-1 text-green-600 hover:underline bg-green-50"
                              >
                                Open full photo ↗
                              </a>
                            </>
                          ) : (
                            <div className="h-40 flex items-center justify-center text-gray-400 bg-gray-50">
                              No before-work photo
                            </div>
                          )}
                          <div className="p-3 space-y-1.5">
                            {job.startJobOTP?.gpsCoordinates ? (
                              <a
                                href={`https://maps.google.com/?q=${job.startJobOTP.gpsCoordinates}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-green-600 hover:underline"
                              >
                                📍 {job.startJobOTP.gpsCoordinates} — Map ↗
                              </a>
                            ) : (
                              <p className="text-gray-400">📍 No GPS data</p>
                            )}
                            {job.startJobOTP?.usedAt && (
                              <p><span className="font-medium">Started:</span> {new Date(job.startJobOTP.usedAt).toLocaleString()}</p>
                            )}
                          </div>
                        </div>

                        {/* ── AFTER photo (Proof of Work) ── */}
                        <div className="bg-white rounded-lg border-2 border-indigo-200 overflow-hidden text-xs">
                          <div className="bg-indigo-50 px-3 py-2 font-semibold text-indigo-700 flex items-center gap-1.5">
                            ✅ After Work
                            <span className="ml-auto text-indigo-400 font-normal">End OTP + Blockchain</span>
                          </div>
                          {job.proofOfWork?.photoUrl ? (
                            <>
                              <img
                                src={job.proofOfWork.photoUrl}
                                alt="After-work proof photo"
                                className="w-full h-40 object-cover"
                              />
                              <a
                                href={job.proofOfWork.photoUrl}
                                target="_blank" rel="noreferrer"
                                className="block text-center py-1 text-indigo-600 hover:underline bg-indigo-50"
                              >
                                Open full photo ↗
                              </a>
                            </>
                          ) : (
                            <div className="h-40 flex items-center justify-center text-gray-400 bg-gray-50">
                              No after-work photo
                            </div>
                          )}
                          <div className="p-3 space-y-1.5">
                            {job.proofOfWork?.gpsCoordinates ? (
                              <a
                                href={`https://maps.google.com/?q=${job.proofOfWork.gpsCoordinates}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-indigo-600 hover:underline"
                              >
                                📍 {job.proofOfWork.gpsCoordinates} — Map ↗
                              </a>
                            ) : (
                              <p className="text-gray-400">📍 No GPS data</p>
                            )}
                            {job.proofOfWork?.submittedAt && (
                              <p><span className="font-medium">Submitted:</span> {new Date(job.proofOfWork.submittedAt).toLocaleString()}</p>
                            )}
                            {job.proofOfWork?.txSignature && (
                              <a
                                href={`https://explorer.solana.com/tx/${job.proofOfWork.txSignature}?cluster=devnet`}
                                target="_blank" rel="noreferrer"
                                className="text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" /> View on Solana ↗
                              </a>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* On-chain dispute PDA */}
                  {dispute.disputePDA && (
                    <div className="text-xs font-mono bg-gray-100 rounded-lg p-3 break-all">
                      <span className="font-semibold text-gray-600">Dispute PDA: </span>{dispute.disputePDA}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
