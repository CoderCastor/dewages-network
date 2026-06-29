import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Wallet,
  Zap,
  Shield,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Coins,
  Lock,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

// ─── Data ────────────────────────────────────────────────────────────────────

const OFFICIAL_LINKS = [
  {
    title: "Install Phantom Wallet",
    description: "The most popular Solana wallet — available as a browser extension and mobile app.",
    url: "https://phantom.app",
    cta: "Download Phantom",
    color: "from-purple-500 to-violet-600",
    icon: Wallet,
  },
  {
    title: "What is Solana?",
    description: "Learn about the fast, low-cost blockchain network that powers DeWages payments.",
    url: "https://solana.com",
    cta: "Visit Solana.com",
    color: "from-green-500 to-emerald-600",
    icon: Zap,
  },
  {
    title: "Get Free Devnet SOL",
    description: "Need SOL to test transactions? Use the faucet to get free devnet tokens instantly.",
    url: "https://solfaucet.com",
    cta: "Get Devnet SOL",
    color: "from-orange-500 to-amber-600",
    icon: Coins,
  },
  {
    title: "Solana Documentation",
    description: "Deep-dive into how Solana works — for the technically curious.",
    url: "https://solana.com/docs",
    cta: "Read the Docs",
    color: "from-blue-500 to-indigo-600",
    icon: BookOpen,
  },
];

const FAQS = [
  {
    category: "Platform",
    icon: HelpCircle,
    color: "text-blue-600",
    bg: "bg-blue-50",
    questions: [
      {
        q: "What is DeWages Network?",
        a: "DeWages is a blockchain-powered platform connecting daily wage workers with verified employers across India. When a job is accepted, payment is locked in a smart contract escrow — so workers are guaranteed to get paid when they complete their work, and employers are protected by photo + GPS proof of work.",
      },
      {
        q: "Do I need technical knowledge to use this platform?",
        a: "No. You only need a smartphone and a Phantom wallet. Installing Phantom takes about 2 minutes — the link above will guide you through it. Once your wallet is set up, signing up on DeWages is as simple as filling a form.",
      },
      {
        q: "Why do I need a PAN card to register?",
        a: "PAN (Permanent Account Number) is India's government-issued identity document linked to your financial records. We use it to verify that each person has only one account and to ensure financial accountability. If you don't have a PAN, you can apply for one free of charge at the Income Tax India portal — it typically takes a few days.",
      },
      {
        q: "Is my personal data safe?",
        a: "Your PAN details are used only for identity verification during signup and are stored securely. Your name, phone, and email are visible only to employers for jobs you apply to. We never share your data with third parties.",
      },
    ],
  },
  {
    category: "Payments & Escrow",
    icon: Lock,
    color: "text-green-600",
    bg: "bg-green-50",
    questions: [
      {
        q: "What is escrow and how does it protect me?",
        a: "Escrow is a digital safe. When a company accepts your job application, they deposit your wage into a smart contract — a self-executing program on the Solana blockchain. The money sits locked there until you complete the work and submit proof. Nobody — not even DeWages — can touch it. When the job is done, the contract releases the payment directly to your wallet automatically.",
      },
      {
        q: "What if the employer refuses to pay after I finish the work?",
        a: "This cannot happen. The payment is already locked in the smart contract before work begins. Once you verify the Start OTP (proof you arrived) and End OTP (proof the employer confirmed completion), the contract releases your money automatically. If the employer refuses to give you the End OTP, you can raise a dispute — your before-work photo and GPS location serve as evidence, and an admin reviews it within 24 hours.",
      },
      {
        q: "How fast are payments?",
        a: "Solana transactions settle in under a second. Once the End OTP is verified and the smart contract executes, your wages appear in your wallet almost instantly — no waiting 2–7 days like traditional bank transfers.",
      },
      {
        q: "What are the fees?",
        a: "Solana transaction fees are typically less than ₹0.01 (a fraction of a paisa). There is a small platform fee on each completed job, which is shown transparently when you apply.",
      },
    ],
  },
  {
    category: "Safety & Disputes",
    icon: Shield,
    color: "text-red-600",
    bg: "bg-red-50",
    questions: [
      {
        q: "What is the Start OTP and End OTP?",
        a: "When you arrive at a job site, the employer generates a Start OTP on their phone and shares it with you. You enter it in the app, which triggers a before-work photo and GPS capture — timestamped proof that you were there. When the job is done, the employer generates an End OTP to confirm completion, which triggers your after-work photo and releases your payment. Both photos and GPS coordinates are stored permanently.",
      },
      {
        q: "What happens if there is a dispute?",
        a: "If the employer refuses the End OTP or you believe the work was unfairly rejected, you can raise a dispute directly from the job screen. Describe the situation, attach your before-work photo as evidence, and submit. An admin freezes the escrow funds and reviews the evidence from both sides within 24 hours. The resolution is final and is recorded on the blockchain.",
      },
      {
        q: "What if an employer behaves badly or is fraudulent?",
        a: "Employers are KYC-verified before they can post jobs — their company registration and email are checked by our admin team. If an employer is found to be acting in bad faith, their account is deactivated and their on-chain history remains as a permanent record. Their wallet's reputation cannot be erased.",
      },
      {
        q: "Can I create multiple accounts?",
        a: "No. Each PAN card can only be linked to one account. Our system checks for duplicate PAN numbers at registration, and the admin review team cross-references before approving your profile.",
      },
    ],
  },
  {
    category: "Blockchain Basics",
    icon: Zap,
    color: "text-purple-600",
    bg: "bg-purple-50",
    questions: [
      {
        q: "What is a blockchain wallet?",
        a: "A blockchain wallet is like a digital bank account that only you control — there is no bank in the middle. Your wallet has a public address (like an account number you share with others) and a private key (like a PIN you never share). Phantom wallet manages all of this for you securely.",
      },
      {
        q: "What is SOL and why do I need it?",
        a: "SOL is the currency of the Solana network, used to pay tiny transaction fees (typically less than ₹0.01 each). You need a small amount of SOL in your wallet to sign transactions. Your actual job wages can be in any currency the platform supports — SOL is just for fees.",
      },
      {
        q: "What is a smart contract?",
        a: "A smart contract is a program that lives on the blockchain and runs automatically when certain conditions are met — no human needed. DeWages uses smart contracts to hold job payments in escrow and release them automatically when work is verified. Once deployed, the contract's rules cannot be changed by anyone.",
      },
      {
        q: "What does 'on-chain' mean?",
        a: "'On-chain' means the data is stored directly on the Solana blockchain — permanently and publicly. Your work history, ratings, and payment records are on-chain, meaning they cannot be deleted, altered, or hidden. This is what makes the platform trustworthy — there is no central authority that can manipulate your record.",
      },
    ],
  },
];

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800 pr-4">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
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
            <p className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const EducatePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Language switcher */}
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
              <span className="text-sm font-medium">Back</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Learn & Resources</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full mb-4">
            <BookOpen className="w-4 h-4" />
            New to blockchain? Start here.
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Everything you need to get started
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            DeWages runs on the Solana blockchain. This page explains what that means,
            how payments work, and how we keep workers and employers safe.
          </p>
        </motion.div>

        {/* Official Links */}
        <section className="mb-14">
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-blue-600" />
            Official Resources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {OFFICIAL_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <motion.a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${link.color} mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {link.title}
                  </h4>
                  <p className="text-sm text-gray-500 mb-3 leading-relaxed">{link.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                    {link.cta} <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </motion.a>
              );
            })}
          </div>
        </section>

        {/* Step-by-step getting started */}
        <section className="mb-14">
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Getting Started — 3 Steps
          </h3>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {[
              {
                step: "1",
                title: "Install Phantom Wallet",
                body: "Go to phantom.app and install the browser extension or mobile app. Create a new wallet and save your recovery phrase somewhere safe — this is the only way to recover your account if you lose your device. Never share your recovery phrase with anyone.",
                color: "bg-purple-600",
              },
              {
                step: "2",
                title: "Get some SOL for transaction fees",
                body: "You need a tiny amount of SOL (less than ₹1 worth) to pay blockchain transaction fees. For testing, visit solfaucet.com and paste your wallet address to receive free devnet SOL instantly. For real usage, you can buy SOL on any crypto exchange.",
                color: "bg-orange-500",
              },
              {
                step: "3",
                title: "Sign up on DeWages",
                body: "Connect your Phantom wallet on the DeWages signup page, fill in your details, verify your email with a one-time password, and complete PAN verification for identity. Once our admin team approves your profile (usually within a few hours), you're ready to work or post jobs.",
                color: "bg-blue-600",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 p-5 ${i < 2 ? "border-b border-gray-100" : ""}`}
              >
                <span className={`${item.color} text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {item.step}
                </span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">{item.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Important notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-14 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 mb-1">Never share your wallet private key or seed phrase</p>
            <p className="text-sm text-amber-800">
              DeWages will never ask for your private key or recovery phrase. Anyone who does is trying to steal your funds.
              Your wallet is yours alone — not even we can access it.
            </p>
          </div>
        </div>

        {/* FAQ sections */}
        <section>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            Frequently Asked Questions
          </h3>
          <div className="space-y-8">
            {FAQS.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.category}>
                  <div className={`inline-flex items-center gap-2 ${section.bg} ${section.color} text-sm font-bold px-3 py-1.5 rounded-lg mb-4`}>
                    <Icon className="w-4 h-4" />
                    {section.category}
                  </div>
                  <div className="space-y-2">
                    {section.questions.map((item) => (
                      <FAQItem key={item.q} q={item.q} a={item.a} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer note */}
        <div className="mt-14 text-center text-sm text-gray-400 pb-6">
          Still have questions? Reach out to us at{" "}
          <span className="text-blue-600 font-medium">contact@dewages.com</span>
        </div>
      </div>
    </div>
  );
};

export default EducatePage;
