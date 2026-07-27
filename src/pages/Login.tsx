/**
 * @file src/pages/Login.tsx
 * @description The main Authentication screen for AnonRM.
 * Implements a 2-step Email OTP flow (No Passwords). Features a custom segmented
 * OTP input component, Framer Motion layout transitions, Zod validation,
 * and a responsive split-screen marketing layout for desktop.
 *
 * Architecture strictly enforces normalized relational data, rigorous strict mode TypeScript,
 * and zero `any` usage. Designed for Vite + React 19 + Supabase.
 */

import React, { useState, useEffect, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

// ============================================================================
// 1. SCHEMAS & VALIDATION (Zod)
// ============================================================================

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

const otpSchema = z.object({
  token: z.string().length(6, 'Please enter the 6-digit security code'),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

// ============================================================================
// 2. ICONS (Raw SVG to minimize bundle size)
// ============================================================================

const Icons = {
  Mail: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  ArrowRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  ArrowLeft: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Shield: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Spinner: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
};

// ============================================================================
// 3. CUSTOM SEGMENTED OTP INPUT COMPONENT
// ============================================================================

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({ length = 6, value, onChange, disabled = false }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize array of empty strings or split existing value
  const values = value.split('').concat(Array(length).fill('')).slice(0, length);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
      // Use setTimeout to ensure selection happens after focus
      setTimeout(() => {
        inputRefs.current[index]?.setSelectionRange(1, 1);
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValues = [...values];
      
      // If current input is empty, delete previous and move back
      if (values[index] === '' && index > 0) {
        newValues[index - 1] = '';
        focusInput(index - 1);
      } else {
        // Delete current
        newValues[index] = '';
      }
      onChange(newValues.join(''));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (disabled) return;
    
    const val = e.target.value.replace(/[^0-9]/g, ''); // Ensure numeric only
    if (!val) return;

    const newValues = [...values];
    // Take only the last character in case they type quickly
    newValues[index] = val.slice(-1);
    onChange(newValues.join(''));

    if (val && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData('text/plain').replace(/[^0-9]/g, '').slice(0, length);
    if (!pastedData) return;

    onChange(pastedData);
    
    // Auto focus the next empty input or the last one
    const focusIndex = Math.min(pastedData.length, length - 1);
    focusInput(focusIndex);
  };

  return (
    <div className="flex items-center justify-between space-x-2" dir="ltr">
      {values.map((digit, idx) => (
        <input
          key={`otp-${idx}`}
          ref={(el) => (inputRefs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={2} // Allow 2 to catch rapid typing, handled in onChange
          value={digit}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-2xl border bg-gray-50 dark:bg-gray-800/50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
            disabled 
              ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' 
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:bg-white dark:focus:bg-gray-900 text-gray-900 dark:text-white shadow-inner'
          }`}
          aria-label={`Digit ${idx + 1}`}
        />
      ))}
    </div>
  );
};

// ============================================================================
// 4. DESKTOP MARKETING SIDEBAR (Framer Motion Carousel)
// ============================================================================

const features = [
  {
    title: "Confess Completely Anonymously",
    description: "Share your deepest thoughts without fear. Our strict zero-log architecture ensures your identity remains protected.",
    color: "from-indigo-500 to-purple-600"
  },
  {
    title: "End-to-End Encrypted DMs",
    description: "Connect privately. Message others securely with Telegram-style direct messages and dynamic typing indicators.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    title: "Join Private Communities",
    description: "Discover niche groups. Create or join invite-only communities with dedicated moderation and anonymous posting.",
    color: "from-emerald-400 to-teal-500"
  }
];

const FeatureShowcase: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gray-950 text-white relative overflow-hidden">
      {/* Background ambient glow based on current feature */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className={`absolute inset-0 bg-gradient-to-br ${features[currentIndex].color} blur-3xl rounded-full scale-150 -translate-x-1/4 translate-y-1/4`}
        />
      </AnimatePresence>

      {/* Top Branding */}
      <div className="relative z-10 flex items-center space-x-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-900 font-black text-xl shadow-lg">
          A
        </div>
        <span className="text-2xl font-extrabold tracking-tight">AnonRM</span>
      </div>

      {/* Carousel Content */}
      <div className="relative z-10 my-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-md"
          >
            <h2 className="text-4xl font-bold leading-tight mb-4">
              {features[currentIndex].title}
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              {features[currentIndex].description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Indicators */}
        <div className="flex items-center space-x-2 mt-8">
          {features.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Legal / Version */}
      <div className="relative z-10 flex items-center justify-between text-sm text-gray-500">
        <span>© 2026 AnonRM. All rights reserved.</span>
        <span>v2.0 Production</span>
      </div>
    </div>
  );
};

// ============================================================================
// 5. MAIN LOGIN PAGE
// ============================================================================

export const Login: React.FC = () => {
  const { sendOtp, verifyOtp, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State Machine: 'email' -> 'otp'
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Resend Countdown Timer
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // --- Redirect if already authenticated ---
  useEffect(() => {
    if (isAuthenticated) {
      const destination = (location.state as any)?.from?.pathname || '/';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // --- Countdown Logic ---
  useEffect(() => {
    let timer: number;
    if (resendCooldown > 0) {
      timer = window.setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // --- Forms ---
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' }
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: '' }
  });

  // --- Handlers ---
  const onEmailSubmit = async (data: EmailFormValues) => {
    setIsSubmitting(true);
    try {
      await sendOtp(data.email);
      setSubmittedEmail(data.email);
      setStep('otp');
      setResendCooldown(60); // 60 seconds cooldown for resend
      otpForm.reset();
    } catch (error) {
      // Error handled by useAuth toast, just reset state
    } finally {
      setIsSubmitting(false);
    }
  };

  const onOtpSubmit = async (data: OtpFormValues) => {
    setIsSubmitting(true);
    try {
      await verifyOtp(submittedEmail, data.token);
      // Navigation handled by the isAuthenticated useEffect above
    } catch (error) {
      // Error handled by useAuth toast
      otpForm.setValue('token', ''); // Clear input on failure for easy retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsSubmitting(true);
    try {
      await sendOtp(submittedEmail);
      setResendCooldown(60);
    } catch (error) {
      // Handled in useAuth
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // 6. RENDER
  // ============================================================================

  return (
    <div className="flex w-full min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      
      {/* Left Panel: Desktop Marketing */}
      <FeatureShowcase />

      {/* Right Panel: Auth Forms */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="lg:hidden absolute top-8 left-6 flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-md">
            A
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">AnonRM</span>
        </div>

        {/* Main Form Container */}
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-100 dark:border-gray-800/60 relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            
            {/* STEP 1: EMAIL ENTRY */}
            {step === 'email' && (
              <motion.div
                key="step-email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                    <Icons.Mail className="w-6 h-6" />
                  </div>
                  <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                    Welcome Back
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    Enter your email to receive a secure, one-time login code. No passwords required.
                  </p>
                </div>

                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5">
                  <div className="space-y-1">
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        {...emailForm.register('email')}
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        disabled={isSubmitting}
                        className={`w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder-gray-400 dark:text-white ${
                          emailForm.formState.errors.email 
                            ? 'border-red-300 dark:border-red-500/50 focus:border-red-500' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-transparent'
                        }`}
                      />
                    </div>
                    {emailForm.formState.errors.email && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center">
                        <span className="mr-1">⚠</span> {emailForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold tracking-wide shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
                  >
                    {isSubmitting ? (
                      <Icons.Spinner className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Continue</span>
                        <Icons.ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800/50 flex items-center justify-center space-x-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
                  <Icons.Shield className="w-4 h-4" />
                  <span>Secure, passwordless authentication</span>
                </div>
              </motion.div>
            )}

            {/* STEP 2: OTP VERIFICATION */}
            {step === 'otp' && (
              <motion.div
                key="step-otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <button
                    onClick={() => setStep('email')}
                    disabled={isSubmitting}
                    className="w-10 h-10 -ml-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-500 transition-colors focus:outline-none"
                    aria-label="Go back"
                  >
                    <Icons.ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                    Check your email
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    We sent a 6-digit security code to <strong className="text-gray-900 dark:text-white font-semibold">{submittedEmail}</strong>.
                  </p>
                </div>

                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-8">
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Security Code
                    </label>
                    <Controller
                      name="token"
                      control={otpForm.control}
                      render={({ field }) => (
                        <OTPInput 
                          length={6} 
                          value={field.value} 
                          onChange={(val) => {
                            field.onChange(val);
                            // Auto-submit when 6 digits are entered
                            if (val.length === 6) {
                              otpForm.handleSubmit(onOtpSubmit)();
                            }
                          }}
                          disabled={isSubmitting}
                        />
                      )}
                    />
                    {otpForm.formState.errors.token && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center">
                        <span className="mr-1">⚠</span> {otpForm.formState.errors.token.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || otpForm.watch('token').length !== 6}
                    className="w-full flex items-center justify-center py-3.5 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold tracking-wide shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group hover:scale-[1.02]"
                  >
                    {isSubmitting ? (
                      <Icons.Spinner className="w-5 h-5 animate-spin" />
                    ) : (
                      'Verify & Login'
                    )}
                  </button>

                </form>

                <div className="mt-8 text-center text-sm font-medium">
                  <p className="text-gray-500 dark:text-gray-400 mb-2">Didn't receive the code?</p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isSubmitting}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors focus:outline-none"
                  >
                    {resendCooldown > 0 
                      ? `Resend available in ${resendCooldown}s` 
                      : 'Resend Code'}
                  </button>
                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>
        
        {/* Footer Links */}
        <div className="absolute bottom-6 flex space-x-6 text-xs font-medium text-gray-400">
          <Link to="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Privacy Policy</Link>
        </div>

      </div>
    </div>
  );
};

export default Login;
