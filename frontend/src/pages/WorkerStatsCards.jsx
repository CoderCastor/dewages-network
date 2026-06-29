import React from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Clock,
  CheckCircle,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const WorkerStatsCards = ({ stats }) => {
  const { t } = useTranslation();

  const statCards = [
    {
      label: t("worker.availableJobs"),
      value: stats.availableJobs || 0,
      icon: Briefcase,
      color: "blue",
      bgColor: "bg-blue-100",
      textColor: "text-blue-600",
    },
    {
      label: t("worker.applied"),
      value: stats.appliedJobs || 0,
      icon: Clock,
      color: "orange",
      bgColor: "bg-orange-100",
      textColor: "text-orange-600",
    },
    {
      label: t("worker.activeJobs"),
      value: stats.activeJobs || 0,
      icon: TrendingUp,
      color: "purple",
      bgColor: "bg-purple-100",
      textColor: "text-purple-600",
    },
    {
      label: t("worker.completed"),
      value: stats.completedJobs || 0,
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-600",
    },
    {
      label: t("worker.totalEarnings"),
      value: `${((stats.totalEarnings || 0) / 1_000_000_000).toFixed(2)} SOL`,
      icon: DollarSign,
      color: "emerald",
      bgColor: "bg-emerald-100",
      textColor: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 ${stat.bgColor} rounded-full`}>
                <Icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default WorkerStatsCards;