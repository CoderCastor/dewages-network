import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Wallet, Zap, Shield, ChevronDown, ChevronUp,
  ExternalLink, HelpCircle, Coins, Lock, AlertCircle, CheckCircle, ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800 pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
               : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EducatePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const OFFICIAL_LINKS = [
    { key: "phantom", url: "https://phantom.app",      color: "from-purple-500 to-violet-600", icon: Wallet },
    { key: "solana",  url: "https://solana.com",       color: "from-green-500 to-emerald-600", icon: Zap },
    { key: "faucet",  url: "https://solfaucet.com",    color: "from-orange-500 to-amber-600",  icon: Coins },
    { key: "docs",    url: "https://solana.com/docs",  color: "from-blue-500 to-indigo-600",   icon: BookOpen },
  ];

  const STEPS = [
    { key: "step1", color: "bg-purple-600" },
    { key: "step2", color: "bg-orange-500" },
    { key: "step3", color: "bg-blue-600" },
  ];

  const FAQ_CATEGORIES = [
    { catKey: "cat1", icon: HelpCircle, color: "text-blue-600",   bg: "bg-blue-50",   qs: ["q1_1","q1_2","q1_3","q1_4"] },
    { catKey: "cat2", icon: Lock,       color: "text-green-600",  bg: "bg-green-50",  qs: ["q2_1","q2_2","q2_3","q2_4"] },
    { catKey: "cat3", icon: Shield,     color: "text-red-600",    bg: "bg-red-50",    qs: ["q3_1","q3_2","q3_3","q3_4"] },
    { catKey: "cat4", icon: Zap,        color: "text-purple-600", bg: "bg-purple-50", qs: ["q4_1","q4_2","q4_3","q4_4"] },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">{t("educate.back")}</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">{t("educate.pageTitle")}</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full mb-4">
            <BookOpen className="w-4 h-4" />
            {t("educate.heroTag")}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">{t("educate.heroTitle")}</h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">{t("educate.heroSub")}</p>
        </motion.div>

        {/* Official Links */}
        <section className="mb-14">
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-blue-600" />
            {t("educate.officialTitle")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {OFFICIAL_LINKS.map(({ key, url, color, icon: Icon }) => (
              <motion.a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all group"
              >
                <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${color} mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {t(`educate.${key}.title`)}
                </h4>
                <p className="text-sm text-gray-500 mb-3 leading-relaxed">{t(`educate.${key}.desc`)}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                  {t(`educate.${key}.cta`)} <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </motion.a>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="mb-14">
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            {t("educate.stepsTitle")}
          </h3>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {STEPS.map(({ key, color }, i) => (
              <div key={key} className={`flex items-start gap-4 p-5 ${i < 2 ? "border-b border-gray-100" : ""}`}>
                <span className={`${color} text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">{t(`educate.${key}.title`)}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{t(`educate.${key}.body`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-14 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 mb-1">{t("educate.warningTitle")}</p>
            <p className="text-sm text-amber-800">{t("educate.warningBody")}</p>
          </div>
        </div>

        {/* FAQs */}
        <section>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            {t("educate.faqTitle")}
          </h3>
          <div className="space-y-8">
            {FAQ_CATEGORIES.map(({ catKey, icon: Icon, color, bg, qs }) => (
              <div key={catKey}>
                <div className={`inline-flex items-center gap-2 ${bg} ${color} text-sm font-bold px-3 py-1.5 rounded-lg mb-4`}>
                  <Icon className="w-4 h-4" />
                  {t(`educate.${catKey}`)}
                </div>
                <div className="space-y-2">
                  {qs.map((qKey) => (
                    <FAQItem
                      key={qKey}
                      q={t(`educate.${qKey}`)}
                      a={t(`educate.a${qKey.slice(1)}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-14 text-center text-sm text-gray-400 pb-6">
          {t("educate.contactNote")}{" "}
          <span className="text-blue-600 font-medium">contact@dewages.com</span>
        </div>
      </div>
    </div>
  );
};

export default EducatePage;
