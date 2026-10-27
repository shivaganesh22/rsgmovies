import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import scrapersApi from '../../api/scrapers';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export const ContactPage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.display_name || '',
    email: user?.email || user?.upn || '',
    subject: '',
    message: '',
  });
  const [isSuccess, setIsSuccess] = useState(false);

  const contactMutation = useMutation({
    mutationFn: (data) => scrapersApi.submitContact(data),
    onSuccess: () => {
      setIsSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    contactMutation.mutate(formData);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto pb-16">
      <div className="text-center space-y-3 pt-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20">
          <Mail size={28} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight">
          Contact & Feedback
        </h1>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Have an issue with playback or want to request a movie or TV show? Send us a message.
        </p>
      </div>

      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl">
        {isSuccess ? (
          <div className="text-center py-8 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-2xl font-bold text-white">Message Sent Successfully</h3>
            <p className="text-sm text-gray-300 max-w-sm mx-auto">
              Thank you for reaching out. We have received your message and will review it shortly.
            </p>
            <Button variant="secondary" size="md" onClick={() => setIsSuccess(false)}>
              Send Another Message
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {contactMutation.isError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <span>
                  {contactMutation.error?.response?.data?.error?.message ||
                    'Failed to submit message. Please try again.'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@example.com"
                required
              />
            </div>

            <Input
              label="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Movie request or issue report..."
              required
            />

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Message</label>
              <textarea
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe your request or issue in detail..."
                required
                className="w-full bg-surface border border-gray-700 text-white text-sm rounded-xl p-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-500 transition"
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              type="submit"
              isLoading={contactMutation.isPending}
              icon={<Send size={16} />}
            >
              Submit Message
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ContactPage;
