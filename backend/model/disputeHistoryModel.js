import mongoose from "mongoose";

const disputeHistorySchema = new mongoose.Schema({
  jobId:           { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  jobPDA:          { type: String, required: true },
  jobTitle:        { type: String },
  resolution:      { type: String, enum: ["favor_worker", "favor_employer", "split"], required: true },
  resolutionNotes: { type: String },
  txSignature:     { type: String },          // on-chain tx
  onChainSuccess:  { type: Boolean, default: false },
  resolvedAt:      { type: Date, default: Date.now },

  // Dispute details snapshot
  dispute: {
    reason:          { type: String },
    raisedBy:        { type: String },
    raisedByWallet:  { type: String },
    createdAt:       { type: Date },
    disputePDA:      { type: String },
  },

  // Parties
  companyWallet:   { type: String },
  companyName:     { type: String },
  workerWallet:    { type: String },
  workerName:      { type: String },
  paymentAmount:   { type: Number },  // lamports
}, { timestamps: true });

disputeHistorySchema.index({ resolvedAt: -1 });
disputeHistorySchema.index({ jobId: 1 }, { unique: true });

const DisputeHistory =
  mongoose.models.DisputeHistory ||
  mongoose.model("DisputeHistory", disputeHistorySchema);

export { DisputeHistory };
