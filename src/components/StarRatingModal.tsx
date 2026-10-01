import React, { useState } from 'react';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { RideRecord } from '../types';
import { Star, CheckCircle2, ThumbsUp, X, Sparkles, Car } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface StarRatingProps {
  ride: RideRecord;
  isOpen?: boolean;
  inline?: boolean;
  onClose?: () => void;
  onRatingSubmitted?: (rating: number) => void;
}

const COMPLIMENT_TAGS = [
  'Smooth & Safe Driving',
  'Clean Vehicle',
  'Polite & Courteous',
  'Punctual Pickup',
  'Great Navigation',
  'Air Conditioning',
  'Great Music',
  'Twin City Hospitality',
];

export const StarRatingModal: React.FC<StarRatingProps> = ({
  ride,
  isOpen = true,
  inline = false,
  onClose,
  onRatingSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen && !inline) return null;

  const currentDisplayRating = hoverRating !== null ? hoverRating : rating;

  const ratingLabels: Record<number, string> = {
    1: '1 Star — Needs Improvement',
    2: '2 Stars — Below Expectations',
    3: '3 Stars — Average Service',
    4: '4 Stars — Very Good Ride',
    5: '5 Stars — Exceptional Prah Experience!',
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ride.id) return;

    setIsSubmitting(true);
    try {
      // 1. Update ride record with passenger rating & feedback
      const rideRef = doc(db, 'rides', ride.id);
      await updateDoc(rideRef, sanitizeForFirestore({
        driverRating: rating,
        driverRatingFeedback: feedback.trim() || null,
        driverRatingTags: selectedTags.length > 0 ? selectedTags : null,
        ratedAt: Date.now(),
      }));

      // 2. If driverId exists, recalculate driver profile cumulative rating
      if (ride.driverId) {
        try {
          const driverRef = doc(db, 'users', ride.driverId);
          const driverSnap = await getDoc(driverRef);

          if (driverSnap.exists()) {
            const data = driverSnap.data();
            const prevRating = data.rating || 5.0;
            const prevTrips = data.totalTrips || 1;

            // Recalculate weighted average
            const newTotalTrips = prevTrips + 1;
            const newAverageRating = parseFloat(
              (((prevRating * prevTrips) + rating) / newTotalTrips).toFixed(1)
            );

            await updateDoc(driverRef, sanitizeForFirestore({
              rating: newAverageRating,
              totalTrips: newTotalTrips,
            }));
          }
        } catch (driverErr) {
          console.error('Failed to update driver cumulative rating:', driverErr);
        }
      }

      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Confetti optional
      }

      setSubmitted(true);
      if (onRatingSubmitted) {
        onRatingSubmitted(rating);
      }

      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err) {
      console.error('Error submitting driver rating:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardContent = (
    <div className={`bg-[#1A1D48] border-2 border-[#EEC367] rounded-3xl p-6 sm:p-7 shadow-2xl relative text-left text-white ${inline ? 'w-full' : 'max-w-md w-full animate-fadeIn'}`}>
      {/* Close / Skip button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition p-1.5 rounded-xl hover:bg-white/10"
          title="Dismiss rating"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {submitted ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#2ECC71]/20 border border-[#2ECC71]/50 text-[#2ECC71] flex items-center justify-center mx-auto shadow-lg shadow-[#2ECC71]/20 animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl font-bold text-white">
            Rating Submitted!
          </h3>
          <p className="text-xs text-gray-300 max-w-xs mx-auto">
            Thank you for rating <strong className="text-[#EEC367]">{ride.driverName || 'your driver'}</strong>. Your feedback keeps Sekondi-Takoradi rides safe and reliable.
          </p>
          <div className="pt-2 flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  s <= rating
                    ? 'text-[#EEC367] fill-[#EEC367]'
                    : 'text-gray-600'
                }`}
              />
            ))}
            <span className="text-xs font-bold text-[#EEC367] ml-1.5">{rating}.0 / 5.0</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitRating} className="space-y-5">
          {/* Header */}
          <div className="text-center pb-3 border-b border-gray-800">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEC367]/15 border border-[#EEC367]/40 text-[#EEC367] text-[10px] uppercase font-bold tracking-widest mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#EEC367]" />
              <span>Trip Completed</span>
            </div>
            <h3 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl font-bold text-white">
              Rate Your Driver
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              How was your experience riding with <strong className="text-white">{ride.driverName || 'your driver'}</strong>?
            </p>
          </div>

          {/* Driver & Trip Profile Banner */}
          <div className="flex items-center gap-3 p-3.5 bg-[#111333] rounded-2xl border border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-[#1A1D48] border border-[#EEC367]/40 flex items-center justify-center font-bold text-lg text-[#EEC367] shrink-0 shadow-inner">
              {ride.driverName ? ride.driverName.charAt(0) : <Car className="w-6 h-6 text-[#EEC367]" />}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm text-white truncate">{ride.driverName || 'Twin City Driver'}</h4>
              <div className="text-xs text-gray-400 truncate">{ride.driverVehicle || 'Twin City Fleet'}</div>
              <div className="text-[10px] text-[#EEC367] font-mono mt-0.5">
                Plate: {ride.driverPlate || 'WR-Verified'}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-black text-[#2ECC71] block">GHS {ride.fareGhs}</span>
              <span className="text-[10px] text-gray-400 block">{ride.rideType}</span>
            </div>
          </div>

          {/* Interactive Star Rating Selector */}
          <div className="text-center space-y-2 py-1">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= currentDisplayRating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 focus:outline-none transition-transform hover:scale-125 cursor-pointer touch-manipulation"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-9 h-9 transition-all duration-150 ${
                        isActive
                          ? 'text-[#EEC367] fill-[#EEC367] drop-shadow-[0_0_10px_rgba(238,195,103,0.6)] scale-105'
                          : 'text-gray-600 hover:text-gray-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Dynamic Rating Label */}
            <div className="text-xs font-bold text-[#EEC367] tracking-wide h-4 transition-all">
              {ratingLabels[currentDisplayRating]}
            </div>
          </div>

          {/* Compliments Quick-Pills */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              What went well? (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMPLIMENT_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#EEC367] text-[#1A1D48] border-[#EEC367] font-bold shadow'
                        : 'bg-[#111333] text-gray-300 border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Written Feedback */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Additional Feedback (Optional)
            </label>
            <textarea
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what made this trip great or what can be improved in Sekondi-Takoradi..."
              className="w-full px-3 py-2 bg-[#111333] border border-gray-700 rounded-xl text-white text-xs focus:border-[#EEC367] focus:outline-none placeholder-gray-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition cursor-pointer"
              >
                Skip
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${onClose ? 'w-2/3' : 'w-full'} py-3 rounded-xl bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-[#1A1D48] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ThumbsUp className="w-4 h-4" />
                  <span>Submit {rating}-Star Rating</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  if (inline) {
    return cardContent;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {cardContent}
    </div>
  );
};

export default StarRatingModal;
