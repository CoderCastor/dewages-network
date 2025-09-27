import React from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Users, Briefcase, Shield, TrendingUp } from "lucide-react";



const HeroSection = () => {
  const stats = [
    { icon: Users, value: "10K+", label: "Active Workers" },
    { icon: Briefcase, value: "5K+", label: "Jobs Completed" },
    { icon: Shield, value: "100%", label: "Secure Payments" },
    { icon: TrendingUp, value: "4.8★", label: "Average Rating" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <Badge
            variant="secondary"
            className="mb-6 px-4 py-2 text-sm font-medium bg-blue-100 text-blue-800 border-blue-200"
          >
            Blockchain Secured
          </Badge>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Connect.{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Work.
            </span>{" "}
            <br />
            Earn with Trust.
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join India's most trusted platform where skilled workers meet
            verified employers. Secure payments, fair wages, and transparent
            work relationships powered by blockchain technology.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {/* <img src={WorkerLogo.src} alt="" /> */}
              Signup as worker
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-lg font-semibold border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >

              Sign up as Company
            </Button>
          </div>

          {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl text-white mb-3 group-hover:scale-110 transition-transform duration-200">
                    <IconComponent size={24} />
                  </div>
                  <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
    </section>
  );
};

export default HeroSection;
