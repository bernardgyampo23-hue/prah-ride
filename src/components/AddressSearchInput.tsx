import React, { useState } from 'react';
import { Search, MapPin, Navigation } from 'lucide-react';
import { SEKONDI_TAKORADI_LANDMARKS } from '../lib/constants';

interface AddressSearchProps {
  label: string;
  badge: 'A' | 'B';
  badgeColor: string;
  value: string;
  placeholder: string;
  onSelect: (coords: { lat: number; lng: number; address: string }) => void;
  onActivateMapPick?: () => void;
  isActivePick?: boolean;
}

export const AddressSearchInput: React.FC<AddressSearchProps> = ({
  label,
  badge,
  badgeColor,
  value,
  placeholder,
  onSelect,
  onActivateMapPick,
  isActivePick,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Sync internal state with external value changes
  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleInputChange = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setIsSearching(true);

    // 1. Check local Sekondi-Takoradi landmark quick matches
    const localMatches = SEKONDI_TAKORADI_LANDMARKS.filter(lm =>
      lm.name.toLowerCase().includes(text.toLowerCase())
    ).map(lm => ({
      name: lm.name,
      lat: lm.lat,
      lng: lm.lng,
    }));

    // 2. Fetch from OpenStreetMap Nominatim bounded to Sekondi-Takoradi area
    try {
      // Sekondi-Takoradi bounding box: ~4.85 to 4.98 lat, -1.82 to -1.68 lon
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text + ', Takoradi')}&viewbox=-1.83,4.98,-1.67,4.84&bounded=1&limit=5`
      );
      const data = await res.json();
      
      const osmMatches = (data || []).map((item: any) => ({
        name: item.display_name.split(',').slice(0, 3).join(',').trim(),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));

      // Combine unique
      const combined = [...localMatches];
      for (const item of osmMatches) {
        if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
          combined.push(item);
        }
      }

      setSuggestions(combined.slice(0, 5));
    } catch {
      setSuggestions(localMatches);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (item: { name: string; lat: number; lng: number }) => {
    setQuery(item.name);
    setIsOpen(false);
    onSelect({
      lat: item.lat,
      lng: item.lng,
      address: item.name,
    });
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <span 
            className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-[#1A1D48]"
            style={{ backgroundColor: badgeColor }}
          >
            {badge}
          </span>
          {label}
        </label>
        {onActivateMapPick && (
          <button
            type="button"
            onClick={onActivateMapPick}
            className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded transition ${
              isActivePick 
                ? 'bg-[#EEC367] text-[#1A1D48] font-bold' 
                : 'text-[#EEC367] hover:bg-[#EEC367]/10'
            }`}
          >
            <MapPin className="w-3 h-3" />
            {isActivePick ? 'Pinning on Map...' : 'Tap to Pin'}
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-[#111333] border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#EEC367] focus:ring-1 focus:ring-[#EEC367] transition shadow-inner"
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="w-4 h-4 border-2 border-[#EEC367] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1A1D48] border border-[#EEC367]/30 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 bg-[#111333]/90 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800">
            Sekondi-Takoradi Locations
          </div>
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full px-3.5 py-2.5 text-left text-sm text-gray-200 hover:bg-[#EEC367]/15 hover:text-white flex items-center gap-2.5 transition border-b border-gray-800/50 last:border-b-0"
            >
              <Navigation className="w-3.5 h-3.5 text-[#EEC367] shrink-0" />
              <span className="truncate">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressSearchInput;
