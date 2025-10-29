import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  Briefcase,
  Users,
  CheckCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

const CompanyInfoModal = ({ isOpen, onClose, company }) => {
  if (!isOpen || !company) return null;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Company Profile
                  </h2>
                  <p className="text-purple-100 text-sm">
                    View company information
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Company Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-3xl">
                  {company.name?.charAt(0).toUpperCase() || "C"}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {company.name || "Company Name"}
              </h3>
              {company.tagline && (
                <p className="text-gray-600 italic">{company.tagline}</p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-200">
                <Briefcase className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">
                  {company.totalJobsPosted || 0}
                </p>
                <p className="text-xs text-blue-700">Jobs Posted</p>
              </div>

              <div className="bg-green-50 p-4 rounded-xl text-center border border-green-200">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">
                  {company.completedJobs || 0}
                </p>
                <p className="text-xs text-green-700">Completed</p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-xl text-center border border-yellow-200">
                <Star className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-900">
                  {company.rating?.toFixed(1) || "N/A"}
                </p>
                <p className="text-xs text-yellow-700">Rating</p>
              </div>
            </div>

            {/* About Section */}
            {company.description && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info size={18} className="text-gray-600" />
                  About Company
                </h4>
                <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {company.description}
                </p>
              </div>
            )}

            {/* Contact Information */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">
                Contact Information
              </h4>
              <div className="space-y-3">
                {company.email && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">
                        {company.email}
                      </p>
                    </div>
                  </div>
                )}

                {company.phone && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">
                        {company.phone}
                      </p>
                    </div>
                  </div>
                )}

                {company.website && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Website</p>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {company.website}
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                )}

                {company.location && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-medium text-gray-900">
                        {company.location}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Blockchain Info */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Building className="w-5 h-5 text-indigo-600" />
                <h4 className="font-semibold text-indigo-900">
                  Wallet Address
                </h4>
              </div>
              <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                <code className="text-sm font-mono text-indigo-900 truncate flex-1">
                  {company.walletAddress}
                </code>
                <button
                  onClick={() =>
                    copyToClipboard(company.walletAddress, "Wallet address")
                  }
                  className="ml-2 p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4 text-indigo-600" />
                </button>
              </div>
              <a
                href={`https://explorer.solana.com/address/${company.walletAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center space-x-2 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View on Solana Explorer</span>
              </a>
            </div>

            {/* Industry/Categories */}
            {company.industries && company.industries.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Industries</h4>
                <div className="flex flex-wrap gap-2">
                  {company.industries.map((industry, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-medium"
                    >
                      {industry}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Member Since */}
            {company.createdAt && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Member since{" "}
                  {new Date(company.createdAt).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompanyInfoModal;
