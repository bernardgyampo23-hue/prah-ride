import React, { useState } from 'react';
import { PrahRideLogo } from './PrahRideLogo';
import { ArrowLeft, MapPin, Phone, Mail, Clock, ShieldCheck, CheckCircle2, Send } from 'lucide-react';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ComplaintTicket } from '../types';

interface AboutContactProps {
  onBack: () => void;
}

export const AboutContact: React.FC<AboutContactProps> = ({ onBack }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const ticket: Omit<ComplaintTicket, 'id'> = {
        userId: 'guest',
        userRole: 'passenger',
        userName: name.trim() || 'Guest Inquirer',
        userEmail: email.trim() || 'guest@prahride.com',
        userPhone: phone.trim() || '',
        rideId: null,
        subject: subject.trim() || 'General Support Inquiry',
        description: message.trim() || '',
        category: 'other',
        status: 'open',
        adminNotes: '',
        createdAt: Date.now(),
        resolvedAt: null,
      };
      await addDoc(collection(db, 'complaints'), sanitizeForFirestore(ticket));
      setSubmitted(true);
      setName('');
      setPhone('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111333] text-white flex flex-col font-sans">
      <header className="bg-[#1A1D48] border-b border-[#EEC367]/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <PrahRideLogo size="sm" />
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-[#EEC367] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 sm:p-10 space-y-12">
        {/* Intro */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-[#EEC367] uppercase tracking-widest">
            About Prah Ride
          </span>
          <h1 
            style={{ fontFamily: "'Cinzel', serif" }}
            className="text-3xl sm:text-4xl font-bold text-white"
          >
            Sekondi-Takoradi's Premier Ride Service
          </h1>
          <p className="text-sm text-gray-300 leading-relaxed">
            Founded to eliminate unpredictable taxi haggling and surge pricing in the Twin City, Prah Ride provides safe, punctual, and dignified transport with transparent distance-based fares for both Everyday urban rides and Airport transfers.
          </p>
        </div>

        {/* Operating Rules & Coverage */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1A1D48] border border-[#EEC367]/20 rounded-2xl p-6 space-y-3">
            <Clock className="w-6 h-6 text-[#EEC367]" />
            <h3 className="font-bold text-base text-white">Operating Hours</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Monday through Saturday: <strong>7:00 AM – 10:00 PM GMT</strong>.<br />
              Closed all day Sunday to maintain fleet safety and driver rest.
            </p>
          </div>

          <div className="bg-[#1A1D48] border border-[#EEC367]/20 rounded-2xl p-6 space-y-3">
            <MapPin className="w-6 h-6 text-[#EEC367]" />
            <h3 className="font-bold text-base text-white">Coverage Zone</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Exclusively Sekondi-Takoradi (Western Region). Covering the whole towns: Market Circle, St. Benedict Hospital area, Effiakuma, Anaji, Kwesimintsim, Airport Ridge, Sekondi European Town, Beach Road, Kojokrom, Essikado, Inchaban, Fijai, Kansaworado, and all Twin City communities.
            </p>
          </div>

          <div className="bg-[#1A1D48] border border-[#EEC367]/20 rounded-2xl p-6 space-y-3">
            <ShieldCheck className="w-6 h-6 text-[#EEC367]" />
            <h3 className="font-bold text-base text-white">Direct Payment</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              No intermediary payment gateway. Pay your assigned driver directly via Cash or to their personal verified MoMo number.
            </p>
          </div>
        </div>

        {/* Contact Form & Dispatch Location */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 bg-[#1A1D48] border border-gray-800 rounded-3xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white">Twin City Dispatch Office</h3>
            
            <div className="space-y-4 text-xs text-gray-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#EEC367] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Current Location</strong>
                  <span>Inchaban around St. Benedict Hospital 🏥, Sekondi-Takoradi, Western Region, Ghana</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#EEC367] shrink-0" />
                <div>
                  <strong className="text-white block">Phone & WhatsApp</strong>
                  <a href="tel:+233247273827" className="text-[#EEC367] hover:underline block font-semibold">+233 24 727 3827</a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#EEC367] shrink-0" />
                <div>
                  <strong className="text-white block">Support Email</strong>
                  <span>operations@prahride.com</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#111333] rounded-2xl border border-gray-800 text-xs text-gray-400">
              Have questions regarding driver registration or a past trip receipt? Contact our local dispatch team anytime during operating hours.
            </div>
          </div>

          <div className="md:col-span-7 bg-[#1A1D48] border-2 border-[#EEC367]/40 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Send an Inquiry or Feedback</h3>
            <p className="text-xs text-gray-400 mb-6">
              Messages are sent directly to the Prah Ride Operations desk
            </p>

            {submitted && (
              <div className="mb-6 p-4 rounded-2xl bg-[#2ECC71]/15 border border-[#2ECC71]/40 text-[#2ECC71] text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Thank you! Your message has been received by our Sekondi-Takoradi team.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ama Mensah"
                    className="w-full px-3.5 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-xs focus:border-[#EEC367] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="024 XXX XXXX"
                    className="w-full px-3.5 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-xs focus:border-[#EEC367] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-xs focus:border-[#EEC367] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Driver Fleet Question / Feedback"
                  className="w-full px-3.5 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-xs focus:border-[#EEC367] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full px-3.5 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-xs focus:border-[#EEC367] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutContact;
