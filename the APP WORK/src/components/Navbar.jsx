import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiUser, FiLogIn, FiUserPlus, FiBriefcase, FiMessageSquare, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isAuthPage = ['/login', '/signup', '/password'].includes(location.pathname);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/home', icon: <FiHome className="mr-2" />, roles: ['user', 'admin', 'promoter', 'brand'] },
    { name: 'Jobs', path: '/jobs', icon: <FiBriefcase className="mr-2" />, roles: ['user', 'admin', 'promoter', 'brand'] },
    { name: 'My Jobs', path: '/my-jobs', icon: <FiBriefcase className="mr-2" />, roles: ['promoter', 'brand'] },
    { name: 'Messages', path: '/messages', icon: <FiMessageSquare className="mr-2" />, roles: ['user', 'admin', 'promoter', 'brand'] },
  ];

  const promoterBrandLinks = [];

  const isPromoter = user?.role === 'promoter';
  const isBrand = user?.role === 'brand';
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${isAuthPage ? 'bg-transparent' : scrolled ? 'glass shadow-lg' : 'bg-gray-900/90'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="text-2xl font-extrabold gradient-text sm:text-3xl animate-slide-in">
                PromoHire
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {!isAuthPage && isAuthenticated && navLinks.map((link, index) => {
                const hasAccess = !link.roles || link.roles.includes(user?.role);
                if (!hasAccess) return null;

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center px-4 py-2 text-sm font-medium animate-slide-in transition-all duration-300 hover:text-cyan-400 hover:underline hover:underline-offset-8 ${
                      isActive(link.path) ? 'text-cyan-400 underline underline-offset-8 animate-pulse-slow' : 'text-gray-200'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                );
              })}

              {/* Promoter/Brand specific links */}
              {!isAuthPage && isAuthenticated && (isPromoter || isBrand) && promoterBrandLinks.length > 0 && (
                <>
                  {promoterBrandLinks.slice(isPromoter ? 0 : 1).map((link, index) => {
                    if (link.action === 'post') {
                      return (
                        <button
                          key="post-job"
                          onClick={() => navigate('/create-job')}
                          className="flex items-center px-4 py-2 text-sm font-medium animate-slide-in transition-all duration-300 text-green-400 hover:text-green-300 hover:underline hover:underline-offset-8"
                          style={{ animationDelay: `${navLinks.length * 0.1}s` }}
                        >
                          <FiBriefcase className="mr-2" />
                          Post Job
                        </button>
                      );
                    }

                    const hasAccess = !link.roles || link.roles.includes(user?.role);
                    if (!hasAccess) return null;

                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`flex items-center px-4 py-2 text-sm font-medium animate-slide-in transition-all duration-300 hover:text-cyan-400 hover:underline hover:underline-offset-8 ${
                          isActive(link.path) ? 'text-cyan-400 underline underline-offset-8 animate-pulse-slow' : 'text-gray-200'
                        }`}
                        style={{ animationDelay: `${(navLinks.length + index) * 0.1}s` }}
                      >
                        {link.icon}
                        {link.name}
                      </Link>
                    );
                  })}
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              {isAuthenticated && !isAuthPage && (
                <Link
                  to="/profile/me"
                  className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-semibold text-sm"
                >
                  {user?.firstName?.charAt(0) || 'U'}
                </Link>
              )}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none"
              >
                <span className="sr-only">Toggle menu</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden bg-gray-900/95 glass transition-all duration-500 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
          <div className="px-4 pt-4 pb-6 space-y-2">
            {!isAuthPage && navLinks.map((link) => {
              const hasAccess = !link.roles || link.roles.includes(user?.role);
              if (!hasAccess) return null;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-4 py-3 text-base font-medium rounded-md transition-all duration-300 ${
                    isActive(link.path) ? 'gradient-text bg-gray-800' : 'text-gray-200 hover:bg-gray-800 hover:gradient-text'
                  }`}
                >
                  {link.icon}
                  {link.name}
                </Link>
              );
            })}

            {/* Promoter/Brand specific mobile links */}
            {!isAuthPage && isAuthenticated && (isPromoter || isBrand) && promoterBrandLinks.length > 0 && (
              <>
                {promoterBrandLinks.slice(isPromoter ? 0 : 1).map((link) => {
                  if (link.action === 'post') {
                    return (
                      <button
                        key="post-job-mobile"
                        onClick={() => {
                          navigate('/create-job');
                          setIsOpen(false);
                        }}
                        className="flex items-center px-4 py-3 text-base font-medium rounded-md transition-all duration-300 text-green-400 hover:bg-gray-800 w-full text-left"
                      >
                        <FiBriefcase className="mr-2" />
                        Post Job
                      </button>
                    );
                  }

                  const hasAccess = !link.roles || link.roles.includes(user?.role);
                  if (!hasAccess) return null;

                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center px-4 py-3 text-base font-medium rounded-md transition-all duration-300 ${
                        isActive(link.path) ? 'gradient-text bg-gray-800' : 'text-gray-200 hover:bg-gray-800 hover:gradient-text'
                      }`}
                    >
                      {link.icon}
                      {link.name}
                    </Link>
                  );
                })}
              </>
            )}

            {!isAuthPage ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 text-base font-medium rounded-md ${location.pathname === '/login' ? 'gradient-btn text-white' : 'text-gray-200 hover:bg-gray-800'}`}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-base font-medium gradient-btn rounded-md"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <Link
                to="/home"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 text-base font-medium gradient-btn rounded-md"
              >
                Back to Home
              </Link>
            )}
          </div>
        </div>
      </nav>
      <div className="h-16"></div>
    </>
  );
}

export default Navbar;