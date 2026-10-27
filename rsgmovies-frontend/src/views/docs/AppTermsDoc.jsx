import React from 'react';
import { FileText, ExternalLink, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TERMS_DOC_URL =
  'https://docs.google.com/document/d/1IoIq5D9-LnbHTCLEQ8dKKHTWQBdkxo5g/edit?usp=drive_link&ouid=109790455436310891623&rtpof=true&sd=true';

export const AppTermsDoc = () => {
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
              <FileText size={16} />
              <span>Legal Terms</span>
            </div>
            <h1 className="text-3xl font-black font-display text-white tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-xs text-gray-400">Last updated: August 2026</p>
          </div>

          <a
            href={TERMS_DOC_URL}
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
            <h2 className="text-lg font-bold text-white">1. Authorized Personal Use Only</h2>
            <p>
              Access to RSG Movies and its cloud-synchronized media services is restricted to authenticated organizational members with valid Microsoft Entra credentials. Account sharing or credential distribution is strictly prohibited.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Single Active Session Policy</h2>
            <p>
              Each user account is granted a single concurrent active session. Initiating a new session from another browser, tab, or device will automatically terminate previously active sessions to protect account integrity.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Cloud Storage & Bandwidth Quotas</h2>
            <p>
              Seedr cloud storage resources are shared across configured organization pools. Fair usage policies apply to all storage, downloading, and streaming activities.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Official Terms Document</h2>
            <p>
              For complete legal terms and conditions, please reference the official approved document:
            </p>
            <div className="pt-2">
              <a
                href={TERMS_DOC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-medium flex items-center gap-1.5"
              >
                <span>View Full Terms & Conditions on Google Drive</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AppTermsDoc;
