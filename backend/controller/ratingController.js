import { Job } from "../model/jobModel.js";
import { CompanyProfile } from "../model/companyModel.js";
import { WorkerProfile } from "../model/workerModel.js";

// Submit rating from company to worker
const submitCompanyRating = async (req, res) => {
  try {
    const { jobId, rating, review } = req.body;
    const companyWallet = req.user.walletAddress;

    if (!jobId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Job ID and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.companyWallet !== companyWallet) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to rate this job",
      });
    }

    if (!['in_progress', 'pending_verification'].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: "Can only rate jobs that are in progress or pending verification",
      });
    }

    if (job.workerRating) {
      return res.status(400).json({
        success: false,
        message: "Worker already rated for this job",
      });
    }

    // Save rating to job
    job.workerRating = rating;
    job.workerReview = review || "";
    await job.save();

    // Update worker's average rating
    const workerProfile = await WorkerProfile.findOne({
      walletAddress: job.assignedWorker,
    });

    if (workerProfile) {
      const completedJobsWithRatings = await Job.find({
        assignedWorker: job.assignedWorker,
        workerRating: { $exists: true, $ne: null },
      });

      const totalRatings = completedJobsWithRatings.reduce(
        (sum, j) => sum + (j.workerRating || 0),
        0
      );
      const avgRating = totalRatings / completedJobsWithRatings.length;

      workerProfile.rating = parseFloat(avgRating.toFixed(2));
      await workerProfile.save();
    }

    return res.status(200).json({
      success: true,
      message: "Rating submitted successfully",
      rating: {
        workerRating: job.workerRating,
        workerReview: job.workerReview,
      },
    });
  } catch (error) {
    console.error("Error submitting company rating:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit rating",
      error: error.message,
    });
  }
};

// Submit rating from worker to company
const submitWorkerRating = async (req, res) => {
  try {
    const { jobId, rating, review } = req.body;
    const workerWallet = req.user.walletAddress;

    if (!jobId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Job ID and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.assignedWorker !== workerWallet) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to rate this job",
      });
    }

    if (!['in_progress', 'pending_verification'].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: "Can only rate jobs that are in progress or pending verification",
      });
    }

    if (job.employerRating) {
      return res.status(400).json({
        success: false,
        message: "Company already rated for this job",
      });
    }

    // Save rating to job
    job.employerRating = rating;
    job.employerReview = review || "";
    await job.save();

    // Update company's average rating
    const companyProfile = await CompanyProfile.findOne({
      walletAddress: job.companyWallet,
    });

    if (companyProfile) {
      const completedJobsWithRatings = await Job.find({
        companyWallet: job.companyWallet,
        employerRating: { $exists: true, $ne: null },
      });

      const totalRatings = completedJobsWithRatings.reduce(
        (sum, j) => sum + (j.employerRating || 0),
        0
      );
      const avgRating = totalRatings / completedJobsWithRatings.length;

      companyProfile.rating = parseFloat(avgRating.toFixed(2));
      await companyProfile.save();
    }

    return res.status(200).json({
      success: true,
      message: "Rating submitted successfully",
      rating: {
        employerRating: job.employerRating,
        employerReview: job.employerReview,
      },
    });
  } catch (error) {
    console.error("Error submitting worker rating:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit rating",
      error: error.message,
    });
  }
};

// Check if rating is required for a job
const checkRatingStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userWallet = req.user.walletAddress;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const isCompany = job.companyWallet === userWallet;
    const isWorker = job.assignedWorker === userWallet;

    if (!isCompany && !isWorker) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    return res.status(200).json({
      success: true,
      ratingStatus: {
        workerRated: !!job.workerRating,
        employerRated: !!job.employerRating,
        canRateWorker: isCompany && !job.workerRating && job.status === "in_progress",
        canRateEmployer: isWorker && !job.employerRating && job.status === "in_progress",
      },
    });
  } catch (error) {
    console.error("Error checking rating status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check rating status",
      error: error.message,
    });
  }
};

export { submitCompanyRating, submitWorkerRating, checkRatingStatus };
