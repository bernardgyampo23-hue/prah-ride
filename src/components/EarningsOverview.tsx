import React, { useState, useMemo } from 'react';
import { RideRecord } from '../types';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Wallet, 
  BarChart3, 
  Award, 
  Car, 
  Plane,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

interface EarningsOverviewProps {
  completedRides: RideRecord[];
  driverRating?: number;
}

type Timeframe = 'daily' | 'weekly' | 'monthly';

interface ChartDataPoint {
  id: string;
  label: string;
  fullDate: string;
  amount: number;
  tripsCount: number;
  momoAmount: number;
  cashAmount: number;
  everydayCount: number;
  airportCount: number;
}

export const EarningsOverview: React.FC<EarningsOverviewProps> = ({ 
  completedRides,
  driverRating = 5.0
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Now reference timestamp
  const now = useMemo(() => new Date(), []);

  // Compute standard KPI metrics
  const kpis = useMemo(() => {
    const todayStr = new Date().toDateString();
    
    // Start of this week (Monday)
    const startOfWeek = new Date();
    const dayOfWeek = startOfWeek.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of this month
    const startOfMonth = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), 1, 0, 0, 0, 0);

    let todayTotal = 0;
    let todayTrips = 0;
    let weekTotal = 0;
    let weekTrips = 0;
    let monthTotal = 0;
    let monthTrips = 0;
    let allTimeTotal = 0;
    let totalMoMo = 0;
    let totalCash = 0;
    let everydayTrips = 0;
    let everydayTotal = 0;
    let airportTrips = 0;
    let airportTotal = 0;

    completedRides.forEach(ride => {
      const fare = Number(ride.fareGhs) || 0;
      const rideDate = new Date(ride.createdAt);
      allTimeTotal += fare;

      if (ride.paymentMethod === 'MoMo') {
        totalMoMo += fare;
      } else {
        totalCash += fare;
      }

      if (ride.rideType === 'Airport') {
        airportTrips++;
        airportTotal += fare;
      } else {
        everydayTrips++;
        everydayTotal += fare;
      }

      if (rideDate.toDateString() === todayStr) {
        todayTotal += fare;
        todayTrips++;
      }

      if (rideDate.getTime() >= startOfWeek.getTime()) {
        weekTotal += fare;
        weekTrips++;
      }

      if (rideDate.getTime() >= startOfMonth.getTime()) {
        monthTotal += fare;
        monthTrips++;
      }
    });

    const avgPerRide = completedRides.length > 0 ? Math.round(allTimeTotal / completedRides.length) : 0;

    return {
      todayTotal,
      todayTrips,
      weekTotal,
      weekTrips,
      monthTotal,
      monthTrips,
      allTimeTotal,
      totalTrips: completedRides.length,
      avgPerRide,
      totalMoMo,
      totalCash,
      everydayTrips,
      everydayTotal,
      airportTrips,
      airportTotal
    };
  }, [completedRides]);

  // Aggregate Data for Daily Chart (Last 7 Days)
  const dailyData: ChartDataPoint[] = useMemo(() => {
    const points: ChartDataPoint[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);

      const targetEnd = new Date(targetDate);
      targetEnd.setHours(23, 59, 59, 999);

      const dayStr = `${dayNames[targetDate.getDay()]} ${targetDate.getDate()}`;
      const fullDateStr = `${dayNames[targetDate.getDay()]}, ${targetDate.getDate()} ${monthNames[targetDate.getMonth()]}`;

      // Filter rides on this day
      const matchingRides = completedRides.filter(r => {
        const time = r.createdAt;
        return time >= targetDate.getTime() && time <= targetEnd.getTime();
      });

      let amount = 0;
      let momoAmount = 0;
      let cashAmount = 0;
      let everydayCount = 0;
      let airportCount = 0;

      matchingRides.forEach(r => {
        const fare = Number(r.fareGhs) || 0;
        amount += fare;
        if (r.paymentMethod === 'MoMo') momoAmount += fare;
        else cashAmount += fare;

        if (r.rideType === 'Airport') airportCount++;
        else everydayCount++;
      });

      points.push({
        id: `day-${i}`,
        label: i === 0 ? 'Today' : dayStr,
        fullDate: fullDateStr,
        amount,
        tripsCount: matchingRides.length,
        momoAmount,
        cashAmount,
        everydayCount,
        airportCount
      });
    }

    return points;
  }, [completedRides, now]);

  // Aggregate Data for Weekly Chart (Last 6 Weeks)
  const weeklyData: ChartDataPoint[] = useMemo(() => {
    const points: ChartDataPoint[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      // End of this week chunk
      const weekEnd = new Date();
      weekEnd.setDate(now.getDate() - (i * 7));
      weekEnd.setHours(23, 59, 59, 999);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const label = i === 0 ? 'This Wk' : `Wk -${i}`;
      const fullDateStr = `${weekStart.getDate()} ${monthNames[weekStart.getMonth()]} - ${weekEnd.getDate()} ${monthNames[weekEnd.getMonth()]}`;

      const matchingRides = completedRides.filter(r => {
        const time = r.createdAt;
        return time >= weekStart.getTime() && time <= weekEnd.getTime();
      });

      let amount = 0;
      let momoAmount = 0;
      let cashAmount = 0;
      let everydayCount = 0;
      let airportCount = 0;

      matchingRides.forEach(r => {
        const fare = Number(r.fareGhs) || 0;
        amount += fare;
        if (r.paymentMethod === 'MoMo') momoAmount += fare;
        else cashAmount += fare;

        if (r.rideType === 'Airport') airportCount++;
        else everydayCount++;
      });

      points.push({
        id: `week-${i}`,
        label,
        fullDate: fullDateStr,
        amount,
        tripsCount: matchingRides.length,
        momoAmount,
        cashAmount,
        everydayCount,
        airportCount
      });
    }

    return points;
  }, [completedRides, now]);

  // Aggregate Data for Monthly Chart (Last 6 Months)
  const monthlyData: ChartDataPoint[] = useMemo(() => {
    const points: ChartDataPoint[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1, 0, 0, 0, 0);

      const label = monthNames[targetMonth.getMonth()];
      const fullDateStr = `${monthNames[targetMonth.getMonth()]} ${targetMonth.getFullYear()}`;

      const matchingRides = completedRides.filter(r => {
        const time = r.createdAt;
        return time >= targetMonth.getTime() && time < nextMonth.getTime();
      });

      let amount = 0;
      let momoAmount = 0;
      let cashAmount = 0;
      let everydayCount = 0;
      let airportCount = 0;

      matchingRides.forEach(r => {
        const fare = Number(r.fareGhs) || 0;
        amount += fare;
        if (r.paymentMethod === 'MoMo') momoAmount += fare;
        else cashAmount += fare;

        if (r.rideType === 'Airport') airportCount++;
        else everydayCount++;
      });

      points.push({
        id: `month-${i}`,
        label: i === 0 ? 'This Mo' : label,
        fullDate: fullDateStr,
        amount,
        tripsCount: matchingRides.length,
        momoAmount,
        cashAmount,
        everydayCount,
        airportCount
      });
    }

    return points;
  }, [completedRides, now]);

  // Current active chart data points based on timeframe toggle
  const currentChartData = useMemo(() => {
    if (timeframe === 'daily') return dailyData;
    if (timeframe === 'weekly') return weeklyData;
    return monthlyData;
  }, [timeframe, dailyData, weeklyData, monthlyData]);

  // Calculate highest point and average for the chart scale
  const { maxAmount, avgAmount, peakPoint } = useMemo<{
    maxAmount: number;
    avgAmount: number;
    peakPoint: ChartDataPoint | null;
  }>(() => {
    let max = 0;
    let sum = 0;
    let peak: ChartDataPoint | null = null;

    currentChartData.forEach(p => {
      sum += p.amount;
      if (p.amount > max) {
        max = p.amount;
        peak = p;
      }
    });

    const avg = currentChartData.length > 0 ? Math.round(sum / currentChartData.length) : 0;
    // Scale max to a rounded clean number or default to 150 GHS
    const ceiling = Math.max(max > 0 ? Math.ceil(max / 50) * 50 : 150, 100);

    return { maxAmount: ceiling, avgAmount: avg, peakPoint: peak };
  }, [currentChartData]);

  // Chart dimensions & drawing config
  const chartHeight = 220;
  const chartPaddingTop = 30;
  const chartPaddingBottom = 40;
  const availableHeight = chartHeight - chartPaddingTop - chartPaddingBottom;

  return (
    <div className="space-y-6">
      {/* Header with Title & Live Settled Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30">
              Direct Driver Payouts · 0% Commission
            </span>
          </div>
          <h2 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <span>Earnings Overview</span>
            <TrendingUp className="w-6 h-6 text-[#EEC367]" />
          </h2>
          <p className="text-xs text-gray-400">
            Real-time breakdown of your income across Sekondi-Takoradi routes
          </p>
        </div>

        {/* Timeframe Selector Pill */}
        <div className="inline-flex items-center p-1.5 bg-[#111333] border border-[#EEC367]/40 rounded-2xl shadow-inner self-start sm:self-center">
          <button
            type="button"
            onClick={() => { setTimeframe('daily'); setHoveredIndex(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              timeframe === 'daily'
                ? 'bg-[#EEC367] text-[#1A1D48] shadow-md shadow-[#EEC367]/20 font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily</span>
          </button>
          <button
            type="button"
            onClick={() => { setTimeframe('weekly'); setHoveredIndex(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              timeframe === 'weekly'
                ? 'bg-[#EEC367] text-[#1A1D48] shadow-md shadow-[#EEC367]/20 font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Weekly</span>
          </button>
          <button
            type="button"
            onClick={() => { setTimeframe('monthly'); setHoveredIndex(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              timeframe === 'monthly'
                ? 'bg-[#EEC367] text-[#1A1D48] shadow-md shadow-[#EEC367]/20 font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Monthly</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Income */}
        <div className="bg-[#1A1D48] border-2 border-[#EEC367]/40 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-[#EEC367] transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#EEC367]/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
            <span>Today's Income</span>
            <div className="w-7 h-7 rounded-lg bg-[#2ECC71]/15 text-[#2ECC71] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2ECC71] tracking-tight">
            GHS {kpis.todayTotal}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-800/80 pt-2">
            <span>{kpis.todayTrips} {kpis.todayTrips === 1 ? 'trip' : 'trips'} today</span>
            <span className="text-[#EEC367] font-semibold">100% Retained</span>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-[#1A1D48] border border-gray-800 hover:border-[#EEC367]/40 rounded-3xl p-5 shadow-xl transition">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
            <span>This Week</span>
            <div className="w-7 h-7 rounded-lg bg-[#EEC367]/15 text-[#EEC367] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            GHS {kpis.weekTotal}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-800/80 pt-2">
            <span>{kpis.weekTrips} completed trips</span>
            <span className="text-gray-300">Mon - Sun</span>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-[#1A1D48] border border-gray-800 hover:border-[#EEC367]/40 rounded-3xl p-5 shadow-xl transition">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
            <span>This Month</span>
            <div className="w-7 h-7 rounded-lg bg-[#3498DB]/15 text-[#3498DB] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            GHS {kpis.monthTotal}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-800/80 pt-2">
            <span>{kpis.monthTrips} completed trips</span>
            <span className="text-gray-300">Calendar month</span>
          </div>
        </div>

        {/* All-Time Direct Income */}
        <div className="bg-[#1A1D48] border border-gray-800 hover:border-[#EEC367]/40 rounded-3xl p-5 shadow-xl transition">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
            <span>All-Time Income</span>
            <div className="w-7 h-7 rounded-lg bg-[#EEC367]/20 text-[#EEC367] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#EEC367] tracking-tight">
            GHS {kpis.allTimeTotal}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-800/80 pt-2">
            <span>{kpis.totalTrips} total trips</span>
            <span className="text-[#2ECC71] font-semibold">{driverRating.toFixed(1)} ★ Rating</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Section */}
      <div className="bg-[#1A1D48] border-2 border-[#EEC367]/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
        {/* Chart Top Bar: Subhead & Dynamic Insights */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white capitalize">
                {timeframe} Income Trajectory
              </h3>
              <span className="text-xs text-[#EEC367] font-semibold bg-[#EEC367]/10 px-2.5 py-0.5 rounded-full border border-[#EEC367]/20">
                GHS Ghana Cedis
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Hover over bars to inspect daily bookings, passenger counts, and payment channels
            </p>
          </div>

          {/* Quick Insight Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {peakPoint && peakPoint.amount > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 flex items-center gap-1.5 font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Peak: GHS {peakPoint.amount} ({peakPoint.label})</span>
              </div>
            )}
            <div className="px-3 py-1.5 rounded-xl bg-[#111333] text-gray-300 border border-gray-800 flex items-center gap-1.5">
              <span className="text-gray-400">Average:</span>
              <strong className="text-white">GHS {avgAmount} / {timeframe === 'daily' ? 'day' : timeframe === 'weekly' ? 'week' : 'month'}</strong>
            </div>
          </div>
        </div>

        {/* SVG Bar & Trend Chart Canvas */}
        <div className="relative pt-4 pb-2">
          {/* Active Hover Detail Card */}
          {hoveredIndex !== null && currentChartData[hoveredIndex] && (
            <div className="mb-4 p-4 rounded-2xl bg-[#111333] border-2 border-[#EEC367] shadow-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Period</span>
                <span className="text-white font-bold text-sm">
                  {currentChartData[hoveredIndex].fullDate}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Gross Earned</span>
                <span className="text-[#2ECC71] font-black text-sm">
                  GHS {currentChartData[hoveredIndex].amount}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Completed Trips</span>
                <span className="text-white font-bold text-sm">
                  {currentChartData[hoveredIndex].tripsCount} {currentChartData[hoveredIndex].tripsCount === 1 ? 'ride' : 'rides'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Payment Channels</span>
                <span className="text-[#EEC367] font-semibold text-[11px] block">
                  MoMo: GHS {currentChartData[hoveredIndex].momoAmount} | Cash: GHS {currentChartData[hoveredIndex].cashAmount}
                </span>
              </div>
            </div>
          )}

          {/* SVG Canvas Container */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-[500px]">
              <svg 
                viewBox={`0 0 600 ${chartHeight}`} 
                className="w-full h-56 select-none overflow-visible"
              >
                <defs>
                  {/* Gold to Green gradient for bars */}
                  <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2ECC71" />
                    <stop offset="100%" stopColor="#EEC367" />
                  </linearGradient>
                  <linearGradient id="barGradientNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EEC367" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#EEC367" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="barGradientZero" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#374151" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#1F2937" stopOpacity="0.2" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = chartPaddingTop + availableHeight * (1 - ratio);
                  const value = Math.round(maxAmount * ratio);
                  return (
                    <g key={ratio}>
                      <line
                        x1="45"
                        y1={y}
                        x2="590"
                        y2={y}
                        stroke="#374151"
                        strokeDasharray="4 4"
                        strokeOpacity="0.4"
                      />
                      <text
                        x="38"
                        y={y + 3}
                        fill="#9CA3AF"
                        fontSize="9"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}

                {/* Bars & Labels */}
                {currentChartData.map((item, index) => {
                  const count = currentChartData.length;
                  const stepX = (590 - 55) / count;
                  const barWidth = Math.min(stepX * 0.55, 42);
                  const centerX = 55 + stepX * index + stepX / 2;
                  const x = centerX - barWidth / 2;

                  // Bar height calculation
                  const heightRatio = maxAmount > 0 ? item.amount / maxAmount : 0;
                  const computedHeight = Math.max(heightRatio * availableHeight, item.amount > 0 ? 8 : 4);
                  const y = chartPaddingTop + availableHeight - computedHeight;

                  const isHovered = hoveredIndex === index;
                  const isPeak = peakPoint?.id === item.id && item.amount > 0;

                  return (
                    <g 
                      key={item.id} 
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Interactive Column Hover Zone */}
                      <rect
                        x={centerX - stepX / 2}
                        y={chartPaddingTop}
                        width={stepX}
                        height={availableHeight + chartPaddingBottom}
                        fill={isHovered ? '#EEC367' : 'transparent'}
                        fillOpacity={isHovered ? 0.08 : 0}
                        rx="8"
                      />

                      {/* Bar Shadow */}
                      {item.amount > 0 && (
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={computedHeight}
                          rx="6"
                          fill="#000"
                          opacity="0.3"
                          transform="translate(0, 3)"
                        />
                      )}

                      {/* Actual Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={computedHeight}
                        rx="6"
                        fill={
                          item.amount === 0 
                            ? 'url(#barGradientZero)' 
                            : isHovered 
                              ? 'url(#barGradientActive)' 
                              : 'url(#barGradientNormal)'
                        }
                        stroke={isHovered ? '#2ECC71' : isPeak ? '#EEC367' : 'none'}
                        strokeWidth={isHovered ? '2' : isPeak ? '1.5' : '0'}
                      />

                      {/* Amount tag on top of bar */}
                      <text
                        x={centerX}
                        y={y - 8}
                        fill={isHovered ? '#2ECC71' : isPeak ? '#EEC367' : item.amount > 0 ? '#E5E7EB' : '#6B7280'}
                        fontSize={isHovered ? '11' : '10'}
                        fontWeight={isHovered || isPeak ? '800' : '600'}
                        textAnchor="middle"
                      >
                        {item.amount > 0 ? `₵${item.amount}` : '-'}
                      </text>

                      {/* Trips count badge inside or above bar */}
                      {item.tripsCount > 0 && (
                        <circle
                          cx={centerX}
                          cy={y + 10}
                          r="4"
                          fill={isHovered ? '#1A1D48' : '#111333'}
                        />
                      )}

                      {/* Bottom Period Label */}
                      <text
                        x={centerX}
                        y={chartHeight - 12}
                        fill={isHovered ? '#EEC367' : '#9CA3AF'}
                        fontSize={isHovered ? '11' : '10'}
                        fontWeight={isHovered ? '700' : '500'}
                        textAnchor="middle"
                      >
                        {item.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-3 border-t border-gray-800/80 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-gradient-to-t from-[#EEC367] to-[#2ECC71] inline-block" />
              <span>Earnings (GHS)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#111333] border border-[#EEC367] inline-block" />
              <span>Trip Marker</span>
            </div>
            <div className="flex items-center gap-2 text-[#2ECC71] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero Service Fee Deduction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Auxiliary Breakdown Cards: Payment Channels & Ride Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Channels (MoMo vs Cash) */}
        <div className="bg-[#1A1D48] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#EEC367]" />
              <span>Payment Channel Breakdown</span>
            </h4>
            <span className="text-[11px] text-gray-400">Direct to Driver</span>
          </div>

          <div className="space-y-3">
            {/* MoMo Channel */}
            <div className="bg-[#111333] p-3.5 rounded-2xl border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block">Mobile Money (MTN / Telecel)</span>
                  <span className="text-[10px] text-gray-400">Direct wallet-to-wallet transfer</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-[#2ECC71] block">GHS {kpis.totalMoMo}</span>
                <span className="text-[10px] text-gray-400">
                  {kpis.allTimeTotal > 0 ? Math.round((kpis.totalMoMo / kpis.allTimeTotal) * 100) : 0}% of earnings
                </span>
              </div>
            </div>

            {/* Cash Channel */}
            <div className="bg-[#111333] p-3.5 rounded-2xl border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block">Cash In-Hand</span>
                  <span className="text-[10px] text-gray-400">Paid directly at destination</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-[#2ECC71] block">GHS {kpis.totalCash}</span>
                <span className="text-[10px] text-gray-400">
                  {kpis.allTimeTotal > 0 ? Math.round((kpis.totalCash / kpis.allTimeTotal) * 100) : 0}% of earnings
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ride Tiers Breakdown */}
        <div className="bg-[#1A1D48] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Car className="w-4 h-4 text-[#EEC367]" />
              <span>Route Tier Volume</span>
            </h4>
            <span className="text-[11px] text-gray-400">Sekondi-Takoradi Route Breakdown</span>
          </div>

          <div className="space-y-3">
            {/* Everyday Rides */}
            <div className="bg-[#111333] p-3.5 rounded-2xl border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EEC367]/15 text-[#EEC367] flex items-center justify-center font-bold text-xs">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block">Everyday Urban Ride</span>
                  <span className="text-[10px] text-gray-400">Market Circle, Anaji, Sekondi & Twin City</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-white block">{kpis.everydayTrips} trips</span>
                <span className="text-[10px] text-[#2ECC71] font-semibold">GHS {kpis.everydayTotal}</span>
              </div>
            </div>

            {/* Airport Rides */}
            <div className="bg-[#111333] p-3.5 rounded-2xl border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block">Takoradi Airport Express</span>
                  <span className="text-[10px] text-gray-400">Dedicated terminal transfers</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-white block">{kpis.airportTrips} trips</span>
                <span className="text-[10px] text-[#2ECC71] font-semibold">GHS {kpis.airportTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EarningsOverviewWidgetProps {
  completedRides: RideRecord[];
  onViewFullReport?: () => void;
  driverRating?: number;
}

/**
 * Compact, high-visibility Earnings Overview Widget
 * Displays aggregated completed ride payments with Daily and Weekly totals.
 */
export const EarningsOverviewWidget: React.FC<EarningsOverviewWidgetProps> = ({
  completedRides,
  onViewFullReport,
  driverRating = 5.0,
}) => {
  const [activeMetricTab, setActiveMetricTab] = useState<'daily' | 'weekly'>('daily');

  // Aggregated calculations
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();

    // Start of current week (Monday at 00:00)
    const startOfWeek = new Date();
    const dayOfWeek = startOfWeek.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    let todayTotal = 0;
    let todayTrips = 0;
    let todayMoMo = 0;
    let todayCash = 0;

    let weekTotal = 0;
    let weekTrips = 0;
    let weekMoMo = 0;
    let weekCash = 0;

    let allTimeTotal = 0;

    completedRides.forEach((r) => {
      const fare = Number(r.fareGhs) || 0;
      allTimeTotal += fare;
      const rideDate = new Date(r.createdAt);

      // Today
      if (rideDate.toDateString() === todayStr) {
        todayTotal += fare;
        todayTrips++;
        if (r.paymentMethod === 'MoMo') todayMoMo += fare;
        else todayCash += fare;
      }

      // This week
      if (rideDate.getTime() >= startOfWeek.getTime()) {
        weekTotal += fare;
        weekTrips++;
        if (r.paymentMethod === 'MoMo') weekMoMo += fare;
        else weekCash += fare;
      }
    });

    // 7-day sparkline data for mini chart
    const last7Days: { day: string; amount: number; isToday: boolean }[] = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const endD = new Date(d);
      endD.setHours(23, 59, 59, 999);

      const dayTotal = completedRides
        .filter((r) => r.createdAt >= d.getTime() && r.createdAt <= endD.getTime())
        .reduce((sum, r) => sum + (Number(r.fareGhs) || 0), 0);

      last7Days.push({
        day: i === 0 ? 'Today' : dayLabels[d.getDay()],
        amount: dayTotal,
        isToday: i === 0,
      });
    }

    const maxSpark = Math.max(...last7Days.map((d) => d.amount), 50);

    return {
      todayTotal,
      todayTrips,
      todayMoMo,
      todayCash,
      weekTotal,
      weekTrips,
      weekMoMo,
      weekCash,
      allTimeTotal,
      totalCompletedTrips: completedRides.length,
      last7Days,
      maxSpark,
    };
  }, [completedRides]);

  return (
    <div className="bg-[#1A1D48] border-2 border-[#EEC367]/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background ambient luxury glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#EEC367]/5 rounded-bl-full pointer-events-none" />

      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30">
              Live Settled
            </span>
            <span className="text-[10px] text-gray-400 font-semibold">0% Platform Fee</span>
          </div>
          <h3 style={{ fontFamily: "'Cinzel', serif" }} className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mt-1">
            <span>Earnings Overview</span>
            <TrendingUp className="w-4 h-4 text-[#EEC367]" />
          </h3>
        </div>

        {/* Daily vs Weekly Toggle Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="inline-flex p-1 bg-[#111333] border border-gray-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveMetricTab('daily')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeMetricTab === 'daily'
                  ? 'bg-[#EEC367] text-[#1A1D48] shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Daily Total</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricTab('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeMetricTab === 'weekly'
                  ? 'bg-[#EEC367] text-[#1A1D48] shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span>Weekly Total</span>
            </button>
          </div>

          {onViewFullReport && (
            <button
              type="button"
              onClick={onViewFullReport}
              className="text-xs text-[#EEC367] hover:text-[#ffe199] font-bold flex items-center gap-1 cursor-pointer transition px-2 py-1 rounded-lg hover:bg-white/5"
            >
              <span>Full Analytics →</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Aggregated Values Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4">
        {/* Left Column: Primary Big Numbers */}
        <div className="md:col-span-7 grid grid-cols-2 gap-3.5">
          {/* Daily Total Box */}
          <div className={`p-4 rounded-2xl border transition ${
            activeMetricTab === 'daily'
              ? 'bg-[#111333] border-[#2ECC71] shadow-lg ring-1 ring-[#2ECC71]/30'
              : 'bg-[#111333]/60 border-gray-800'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold mb-1">
              <span>Daily Total (Today)</span>
              <span className="w-2 h-2 rounded-full bg-[#2ECC71] animate-pulse" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#2ECC71] tracking-tight">
              GHS {stats.todayTotal}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400 pt-1.5 border-t border-gray-800">
              <span>{stats.todayTrips} {stats.todayTrips === 1 ? 'ride' : 'rides'}</span>
              <span className="text-[#EEC367]">MoMo ₵{stats.todayMoMo}</span>
            </div>
          </div>

          {/* Weekly Total Box */}
          <div className={`p-4 rounded-2xl border transition ${
            activeMetricTab === 'weekly'
              ? 'bg-[#111333] border-[#EEC367] shadow-lg ring-1 ring-[#EEC367]/30'
              : 'bg-[#111333]/60 border-gray-800'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold mb-1">
              <span>Weekly Total (Mon–Sun)</span>
              <Calendar className="w-3.5 h-3.5 text-[#EEC367]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              GHS {stats.weekTotal}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400 pt-1.5 border-t border-gray-800">
              <span>{stats.weekTrips} {stats.weekTrips === 1 ? 'ride' : 'rides'}</span>
              <span className="text-[#2ECC71]">100% Direct</span>
            </div>
          </div>

          {/* Payment Split Pill Banner */}
          <div className="col-span-2 p-3 bg-[#111333] rounded-2xl border border-gray-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-[#EEC367]" />
              <span className="text-gray-300">Channels:</span>
              <span className="text-[#EEC367] font-bold">
                MoMo: GHS {activeMetricTab === 'daily' ? stats.todayMoMo : stats.weekMoMo}
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-[#2ECC71] font-bold">
                Cash: GHS {activeMetricTab === 'daily' ? stats.todayCash : stats.weekCash}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">
              All-Time: GHS {stats.allTimeTotal}
            </span>
          </div>
        </div>

        {/* Right Column: Mini 7-Day Sparkline Bar Chart */}
        <div className="md:col-span-5 bg-[#111333] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Last 7 Days Activity
            </span>
            <span className="text-[10px] text-[#EEC367] font-semibold">
              {stats.totalCompletedTrips} Total Trips
            </span>
          </div>

          {/* Mini SVG Bars */}
          <div className="flex items-end justify-between gap-1.5 h-20 pt-2 px-1">
            {stats.last7Days.map((dp, idx) => {
              const heightPercent = stats.maxSpark > 0 ? Math.max((dp.amount / stats.maxSpark) * 100, dp.amount > 0 ? 15 : 6) : 6;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full flex items-end justify-center h-12">
                    <div
                      className={`w-full max-w-[18px] rounded-t-md transition-all duration-300 ${
                        dp.isToday
                          ? 'bg-[#2ECC71]'
                          : dp.amount > 0
                          ? 'bg-[#EEC367]/80 group-hover:bg-[#EEC367]'
                          : 'bg-gray-800/60'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${dp.day}: GHS ${dp.amount}`}
                    />
                  </div>
                  <span className={`text-[9px] font-semibold ${dp.isToday ? 'text-[#2ECC71] font-bold' : 'text-gray-400'}`}>
                    {dp.day.slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400">
            <span className="flex items-center gap-1 text-[#2ECC71]">
              <Sparkles className="w-3 h-3" />
              <span>Direct Settled</span>
            </span>
            <span>Rating: <strong className="text-white">{driverRating.toFixed(1)} ★</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

