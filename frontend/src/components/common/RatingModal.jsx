import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, Loader2, Award, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

const RatingModal = ({ isOpen, onClose, onSubmit, targetName, targetType }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a star rating before submitting");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(rating, review);
      setRating(0);
      setReview("");
      onClose();
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const ratingLabels = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent" };
  const displayRating = hoveredRating || rating;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: "rgba(0,0,0,0.75)" }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 30 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-8 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white opacity-10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white opacity-10 rounded-full" />
          <div className="relative flex flex-col items-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-4">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-1">
              {targetType === "worker" ? "Rate the Worker" : "Rate the Company"}
            </h2>
            <p className="text-blue-100 text-sm text-center">
              Rating is required before proceeding
            </p>
            <p className="text-white font-semibold text-sm text-center mt-1">
              {targetName}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Stars */}
          <div className="mb-6">
            <div className="flex justify-center items-center space-x-3 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-all"
                  disabled={isSubmitting}
                >
                  <Star
                    className={`w-12 h-12 transition-all ${
                      star <= displayRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300"
                    }`}
                  />
                </motion.button>
              ))}
            </div>

            <div className="text-center min-h-[2.5rem]">
              {displayRating > 0 ? (
                <motion.div
                  key={displayRating}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-xl font-bold text-gray-800">{ratingLabels[displayRating]}</p>
                  <p className="text-sm text-gray-500">{displayRating} out of 5 stars</p>
                </motion.div>
              ) : (
                <p className="text-gray-400 text-sm pt-1">Click stars to rate</p>
              )}
            </div>
          </div>

          {/* Review */}
          <div className="mb-6">
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4" />
              <span>Feedback (Optional)</span>
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={`Share your experience with ${targetName}...`}
              disabled={isSubmitting}
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{review.length}/500</p>
          </div>

          {/* Submit — mandatory, no skip */}
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-base shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Rating & Continue</span>
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            ⚠️ Rating is mandatory to proceed
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default RatingModal;
