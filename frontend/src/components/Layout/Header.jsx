import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import Logo from '../common/Logo';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navItems = [
    { label: t('header.howItWorks'), href: '#how-it-works' },
    { label: t('header.features'), href: '#features' },
    { label: t('header.about'), href: '#about' },
    { label: t('header.contact'), href: '#contact' },
  ];

  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-gray-600 hover:text-primary transition-colors font-medium"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              className="font-medium"
              onClick={() => navigate('/worker/signin')}
            >
              {t('header.login')}
            </Button>
            <Button
              className="font-medium"
              onClick={() => navigate('/worker/signup')}
            >
              {t('header.getStarted')}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-gray-600 hover:text-primary transition-colors font-medium py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => { navigate('/worker/signin'); setIsMobileMenuOpen(false); }}
                >
                  {t('header.login')}
                </Button>
                <Button
                  className="justify-start"
                  onClick={() => { navigate('/worker/signup'); setIsMobileMenuOpen(false); }}
                >
                  {t('header.getStarted')}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;