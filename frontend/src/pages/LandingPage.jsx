import HeroSection from "@/components/Home/HeroSection";
import Footer from "@/components/Layout/Footer";
import Header from "@/components/Layout/Header";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Wallet, CheckCircle, Star, Lock, Users, Scale, ArrowRight } from "lucide-react";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t("landing.howItWorksTitle")}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t("landing.howItWorksDesc")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Wallet, title: t("landing.step1Title"), desc: t("landing.step1Desc"), step: "01", color: "blue" },
              { icon: Users, title: t("landing.step2Title"), desc: t("landing.step2Desc"), step: "02", color: "purple" },
              { icon: Shield, title: t("landing.step3Title"), desc: t("landing.step3Desc"), step: "03", color: "green" },
            ].map((item, i) => (
              <div key={i} className="relative text-center group">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-${item.color}-100 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className={`w-8 h-8 text-${item.color}-600`} />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-900 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <ArrowRight className="hidden md:block absolute -right-4 top-8 w-8 h-8 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t("landing.featuresTitle")}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t("landing.featuresDesc")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Lock, title: t("landing.feature1"), desc: t("landing.feature1Desc"), gradient: "from-blue-500 to-blue-600" },
              { icon: CheckCircle, title: t("landing.feature2"), desc: t("landing.feature2Desc"), gradient: "from-purple-500 to-purple-600" },
              { icon: Scale, title: t("landing.feature3"), desc: t("landing.feature3Desc"), gradient: "from-orange-500 to-orange-600" },
              { icon: Star, title: t("landing.feature4"), desc: t("landing.feature4Desc"), gradient: "from-green-500 to-green-600" },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${f.gradient} mb-4`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            {t("header.about")}
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-8">
            DeWages Network is a decentralized employment platform built on Solana blockchain. 
            We connect skilled workers with verified employers, ensuring secure payments through 
            smart contract escrow, transparent dispute resolution, and a fair rating system. 
            Our mission is to bring trust and transparency to the blue-collar workforce economy.
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">Solana</div>
              <div className="text-sm text-gray-500">Blockchain</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">Anchor</div>
              <div className="text-sm text-gray-500">Smart Contracts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">Escrow</div>
              <div className="text-sm text-gray-500">Secure Payments</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {t("header.contact")}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Have questions? Reach out to us at
          </p>
          <a
            href="mailto:contact@dewages.com"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-xl transition-all duration-300"
          >
            contact@dewages.com
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
