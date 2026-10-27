import React from 'react';
import { Shield, ExternalLink, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRIVACY_DOC_URL =
  'https://docs.google.com/document/d/1OlD1XrCQFy9ITMRPDPf1huQ4ud6tRmFa/edit?usp=drive_link&ouid=109790455436310891623&rtpof=true&sd=true';

export const AppPrivacyDoc = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-16">
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
      >
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </button>

      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider">
              <Shield size={16} />
              <span>Legal Document</span>
            </div>
            <h1 className="text-3xl font-black font-display text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs text-gray-400">Last updated: August 2026</p>
          </div>

          <a
            href={PRIVACY_DOC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-blue-500/20"
          >
            <span>Open Official Google Doc</span>
            <ExternalLink size={14} />
          </a>
        </div>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Information We Collect</h2>
            <p>
              When you log into RSG Movies via Microsoft Entra ID (Single Sign-On), we securely receive your authenticated profile claims including your User Principal Name (UPN), Display Name, Object ID, and Email address. We do not store or process your Microsoft password.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Session Security & Single Active Device Policy</h2>
            <p>
              To maintain system integrity and prevent unauthorized sharing of cloud storage credentials, RSG Movies enforces a single active session policy per user account. When you sign in from a new device, previous sessions are automatically invalidated.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Cloud Media & Seedr Account Integration</h2>
            <p>
              Cloud storage connections (Seedr) are managed through encrypted backend credentials. Browser clients do not have direct access to raw third-party storage tokens or passwords.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Official Document</h2>
            <p>
              For the full, legally binding Privacy Policy terms approved for RSG Movies, please view the official document:
            </p>
            <div className="pt-2">
              <a
                href={PRIVACY_DOC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-medium flex items-center gap-1.5"
              >
                <span>View Full Privacy Policy on Google Drive</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AppPrivacyDoc;
