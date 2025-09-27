import HeroSection from "@/components/Home/HeroSection";
import Footer from "@/components/Layout/Footer";
import Header from "@/components/Layout/Header";
import { useState } from "react";

export default function Home() {
  const [signupPopup, setSignupPopup] = useState({
    workerSignupPopup: false,
    CompanySignupPopup: false,
  });

  return (
    <div className="h-screen">
      <Header />
      <HeroSection signupPopup={signupPopup} setSignupPopup={setSignupPopup} />
      <Footer />
    </div>
  );
}
