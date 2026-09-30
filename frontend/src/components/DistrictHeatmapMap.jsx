import React, { useState } from 'react';
import {
  MapPin, Flame, Layers, ZoomIn, ZoomOut, RotateCcw,
  AlertTriangle, ShieldCheck, HeartPulse, Activity, Wind, Thermometer,
  Send, Megaphone, Info, ChevronRight, Navigation
} from 'lucide-react';

/**
 * Topographical SVG Coordinate Mapping for Chamoli District:
 * Lat Range: ~30.00 to ~30.80 N
 * Lng Range: ~79.10 to ~79.70 E
 * Projected into an SVG canvas (viewBox 0 0 1000 720)
 */
function projectCoords(lat, lng) {
  const minLat = 29.98, maxLat = 30.82;
  const minLng = 79.10, maxLng = 79.72;
  const x = ((lng - minLng) / (maxLng - minLng)) * 820 + 90;
  const y = 720 - (((lat - minLat) / (maxLat - minLat)) * 580 + 70);
  return { x: Math.round(x), y: Math.round(y) };
}

export default function DistrictHeatmapMap({
  sectors = [],
  selectedDisease = 'ALL',
  onSelectSector,
  onQuickDispatch,
  onQuickBroadcast,
}) {
  const [viewMode, setViewMode] = useState('heat'); // 'heat' | 'pins' | 'topo'
  const [hoveredSector, setHoveredSector] = useState(null);
  const [activeSector, setActiveSector] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const handleSectorClick = (sector) => {
    setActiveSector(sector);
    if (onSelectSector) onSelectSector(sector);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CRITICAL': return { hex: '#EF4444', ring: 'ring-rose-500', bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' };
      case 'WARNING': return { hex: '#F97316', ring: 'ring-orange-500', bg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' };
      case 'ELEVATED': return { hex: '#F59E0B', ring: 'ring-amber-500', bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' };
      default: return { hex: '#10B981', ring: 'ring-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
    }
  };

  return (
    <div className="relative w-full bg-slate-950 text-white rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* ── Map Header Toolbar ─────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold font-serif tracking-wider uppercase text-slate-200">
              Chamoli Epidemiological Surveillance Grid
            </span>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
            {sectors.length} Sectors Active
          </span>
        </div>

        {/* View Mode Controls */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-1">
          <button
            onClick={() => setViewMode('heat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'heat'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-300" />
            <span>Heatmap</span>
          </button>
          <button
            onClick={() => setViewMode('pins')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'pins'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Cluster Pins</span>
          </button>
          <button
            onClick={() => setViewMode('topo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'topo'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Topography</span>
          </button>
        </div>
      </div>

      {/* ── Zoom & Navigation Controls ──────────────────────────────────── */}
      <div className="absolute top-20 right-4 z-20 flex flex-col gap-1.5">
        <button
          onClick={() => setZoomLevel(z => Math.min(1.8, +(z + 0.2).toFixed(1)))}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 shadow-lg transition-all cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel(z => Math.max(0.8, +(z - 0.2).toFixed(1)))}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 shadow-lg transition-all cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 shadow-lg transition-all cursor-pointer"
          title="Reset map view"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Interactive SVG Map Canvas ──────────────────────────────────── */}
      <div className="relative w-full h-[520px] sm:h-[580px] overflow-hidden cursor-grab active:cursor-grabbing">
        <svg
          viewBox="0 0 1000 720"
          className="w-full h-full transition-transform duration-300 ease-out select-none"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: '50% 50%',
          }}
        >
          <defs>
            {/* Mountain Gradient Filter */}
            <linearGradient id="topoSlope" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B132B" />
              <stop offset="50%" stopColor="#1C2541" />
              <stop offset="100%" stopColor="#0B132B" />
            </linearGradient>

            {/* Radiant Heat Gauges with Gaussian Blur */}
            <filter id="heatBlurSoft" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="35" result="blur" />
            </filter>
            <filter id="heatBlurIntense" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="55" result="blur" />
            </filter>

            {/* Radial Gradient for Outbreak Hotspots */}
            <radialGradient id="gradCritical" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#DC2626" stopOpacity="0.65" />
              <stop offset="70%" stopColor="#F97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="gradWarning" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.55" />
              <stop offset="75%" stopColor="#EAB308" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="gradElevated" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EAB308" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="gradNormal" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#059669" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background District Base */}
          <rect width="1000" height="720" fill="#030712" />

          {/* Topographical Contour Shading Layers */}
          <g opacity="0.45" stroke="#1E293B" strokeWidth="1" fill="none">
            {/* Chamoli District Valley Contours */}
            <path d="M 120 180 Q 280 120 460 160 T 820 130 T 910 240 Q 860 380 780 490 T 520 620 T 260 600 T 110 440 Z" fill="#0B132B" stroke="#334155" strokeWidth="1.5" />
            <path d="M 190 230 Q 320 190 490 210 T 780 200 T 830 330 Q 770 440 680 520 T 430 580 T 230 490 Z" fill="#0F172A" />
            <path d="M 270 290 Q 380 260 520 270 T 720 280 T 740 400 Q 660 480 520 500 T 310 420 Z" fill="#131D36" />
            
            {/* Topographical elevation rings */}
            <circle cx="500" cy="350" r="280" strokeDasharray="4 6" opacity="0.25" />
            <circle cx="500" cy="350" r="180" strokeDasharray="4 6" opacity="0.25" />
            <circle cx="500" cy="350" r="90" strokeDasharray="3 4" opacity="0.25" />
          </g>

          {/* River Drainage Basin Network (Alaknanda, Pindar, Nandakini) */}
          <g strokeLinecap="round" strokeLinejoin="round">
            {/* Alaknanda River */}
            <path
              d="M 640 90 Q 610 180 580 260 T 530 350 T 460 430 T 360 490 T 240 540"
              stroke="#0284C7"
              strokeWidth="3.5"
              fill="none"
              opacity="0.8"
            />
            {/* Pindar River Tributary */}
            <path
              d="M 740 620 Q 640 580 510 540 T 360 490"
              stroke="#0284C7"
              strokeWidth="2.5"
              fill="none"
              opacity="0.7"
            />
            {/* Mandakini / Nandakini tributary */}
            <path
              d="M 620 420 Q 520 430 460 430"
              stroke="#38BDF8"
              strokeWidth="2"
              fill="none"
              opacity="0.6"
            />
          </g>

          {/* River Labels */}
          <text x="650" y="140" fill="#38BDF8" fontSize="10" fontFamily="sans-serif" opacity="0.7" fontStyle="italic">
            Alaknanda River (अलकनंदा)
          </text>
          <text x="590" y="580" fill="#38BDF8" fontSize="9" fontFamily="sans-serif" opacity="0.7" fontStyle="italic">
            Pindar River (पिंडर नदी)
          </text>

          {/* Major Mountain Peaks Reference Markers */}
          <g opacity="0.5" fill="#94A3B8" fontSize="9" fontFamily="sans-serif">
            <text x="780" y="210">▲ Nanda Devi (7,816m)</text>
            <text x="700" y="320">▲ Trishul Peak (7,120m)</text>
            <text x="560" y="110">▲ Nilkantha (6,596m)</text>
          </g>

          {/* Highway 7 Transit Artery */}
          <path
            d="M 220 560 Q 340 500 450 435 T 520 350 T 570 260 T 630 110"
            stroke="#64748B"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            fill="none"
            opacity="0.5"
          />

          {/* ── Heatmap Density Glow Layers ──────────────────────────────── */}
          {viewMode === 'heat' && (
            <g id="heatmap-glow-layer">
              {sectors.map((s) => {
                const pt = projectCoords(s.lat, s.lng);
                const r = Math.max(55, Math.min(130, Math.round(s.active_cases * 1.8 + s.intensity * 60)));
                const gradId = s.status === 'CRITICAL' ? 'gradCritical'
                  : s.status === 'WARNING' ? 'gradWarning'
                  : s.status === 'ELEVATED' ? 'gradElevated'
                  : 'gradNormal';
                const filterId = s.status === 'CRITICAL' ? 'url(#heatBlurIntense)' : 'url(#heatBlurSoft)';

                return (
                  <g key={`heat-${s.name}`}>
                    {/* Outer Heat Halo */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={r}
                      fill={`url(#${gradId})`}
                      filter={filterId}
                      opacity={0.85}
                    />

                    {/* Animated Outbreak Ripple for Critical & Warning Hotspots */}
                    {(s.status === 'CRITICAL' || s.status === 'WARNING') && (
                      <>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={r * 0.45}
                          fill="none"
                          stroke={s.status === 'CRITICAL' ? '#EF4444' : '#F97316'}
                          strokeWidth="2"
                          opacity="0.7"
                        >
                          <animate
                            attributeName="r"
                            from={r * 0.2}
                            to={r * 0.85}
                            dur={s.status === 'CRITICAL' ? '2.2s' : '3.2s'}
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            from="0.8"
                            to="0"
                            dur={s.status === 'CRITICAL' ? '2.2s' : '3.2s'}
                            repeatCount="indefinite"
                          />
                        </circle>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={r * 0.2}
                          fill="none"
                          stroke={s.status === 'CRITICAL' ? '#EF4444' : '#F97316'}
                          strokeWidth="1.5"
                          opacity="0.9"
                        >
                          <animate
                            attributeName="r"
                            from={r * 0.1}
                            to={r * 0.6}
                            dur={s.status === 'CRITICAL' ? '2.2s' : '3.2s'}
                            begin="1.1s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            from="0.9"
                            to="0"
                            dur={s.status === 'CRITICAL' ? '2.2s' : '3.2s'}
                            begin="1.1s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* ── Interactive Sector Nodes & Pins ─────────────────────────── */}
          <g id="sector-pins-layer">
            {sectors.map((s) => {
              const pt = projectCoords(s.lat, s.lng);
              const isHovered = hoveredSector?.name === s.name;
              const isActive = activeSector?.name === s.name;
              const colorInfo = getStatusColor(s.status);

              return (
                <g
                  key={`pin-${s.name}`}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  className="cursor-pointer transition-transform duration-200"
                  onMouseEnter={() => setHoveredSector(s)}
                  onMouseLeave={() => setHoveredSector(null)}
                  onClick={() => handleSectorClick(s)}
                >
                  {/* Selection Ring */}
                  {isActive && (
                    <circle
                      r="22"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      className="animate-spin"
                    />
                  )}

                  {/* Outer Sector Pill Background */}
                  <circle
                    r={isHovered ? 17 : 13}
                    fill="#0F172A"
                    stroke={colorInfo.hex}
                    strokeWidth={isHovered ? 3 : 2}
                    className="drop-shadow-md transition-all"
                  />

                  {/* Inner Status Core */}
                  <circle
                    r={isHovered ? 8 : 6}
                    fill={colorInfo.hex}
                  />

                  {/* Case Count Label (above pin) */}
                  <g transform="translate(0, -18)">
                    <rect
                      x="-26"
                      y="-16"
                      width="52"
                      height="18"
                      rx="9"
                      fill="#020617"
                      stroke={colorInfo.hex}
                      strokeWidth="1.2"
                      opacity="0.92"
                    />
                    <text
                      x="0"
                      y="-4"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="9.5"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      {s.active_cases} c
                    </text>
                  </g>

                  {/* Sector Name Banner */}
                  <text
                    x="0"
                    y="24"
                    textAnchor="middle"
                    fill={isHovered || isActive ? '#FFFFFF' : '#CBD5E1'}
                    fontSize={isHovered || isActive ? '11' : '9.5'}
                    fontFamily="sans-serif"
                    fontWeight={isHovered || isActive ? 'bold' : 'normal'}
                    className="drop-shadow-sm pointer-events-none"
                  >
                    {s.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Hover Tooltip Overlay ────────────────────────────────────── */}
        {hoveredSector && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700 shadow-2xl w-64 animate-fadeIn text-xs"
            style={{
              left: '50%',
              top: '24px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-serif font-bold text-white text-sm">{hoveredSector.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(hoveredSector.status).bg} text-white uppercase`}>
                {hoveredSector.status}
              </span>
            </div>

            <div className="mt-2 space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Dominant Condition:</span>
                <span className="font-bold text-white truncate max-w-[130px]">{hoveredSector.dominant_disease_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Cases:</span>
                <span className="font-bold text-white">{hoveredSector.active_cases}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">7-Day Trajectory:</span>
                <span className={`font-bold ${hoveredSector.trend_7d > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {hoveredSector.trend_label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Local PHC:</span>
                <span className="text-slate-200 truncate max-w-[140px]">{hoveredSector.phc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ASHA Field Force:</span>
                <span className="text-amber-300 font-semibold">{hoveredSector.asha_count} Workers</span>
              </div>
            </div>
            <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 text-center">
              Click sector to inspect & dispatch response team
            </div>
          </div>
        )}
      </div>

      {/* ── Active Sector Inspection Sheet ────────────────────────────── */}
      {activeSector && (
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 animate-slideUp">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(activeSector.status).bg}`} />
                <h4 className="font-serif font-bold text-base sm:text-lg text-white">
                  {activeSector.name} • {activeSector.dominant_disease_hi}
                </h4>
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${getStatusColor(activeSector.status).bg} text-white`}>
                  {activeSector.status} RISK
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Primary Facility: <strong className="text-slate-200">{activeSector.phc}</strong> • Population: ~{activeSector.population?.toLocaleString()} • Terrain: {activeSector.terrain}
              </p>
            </div>

            {/* Quick Action Buttons for District Administration */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <button
                onClick={() => onQuickDispatch && onQuickDispatch(activeSector)}
                className="touch-target flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-xs transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Deploy ASHA Field Unit</span>
              </button>

              <button
                onClick={() => onQuickBroadcast && onQuickBroadcast(activeSector)}
                className="touch-target flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gold-warm text-slate-950 hover:bg-gold-warm/90 font-bold text-xs px-4 py-2.5 rounded-2xl shadow-xs transition-all cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Issue Sector Advisory</span>
              </button>

              <button
                onClick={() => setActiveSector(null)}
                className="touch-target text-xs text-slate-400 hover:text-white px-3 py-2 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Tier Counts Bar */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800 text-xs">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-rose-400 uppercase font-extrabold block">Red Emergency</span>
              <span className="font-bold text-sm text-rose-300">{activeSector.tier_counts?.red || 0} Cases</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-amber-400 uppercase font-extrabold block">Yellow Moderate</span>
              <span className="font-bold text-sm text-amber-300">{activeSector.tier_counts?.yellow || 0} Cases</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-emerald-400 uppercase font-extrabold block">Green Mild</span>
              <span className="font-bold text-sm text-emerald-300">{activeSector.tier_counts?.green || 0} Cases</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center hidden sm:block">
              <span className="text-[10px] text-slate-400 uppercase font-extrabold block">7-Day Trajectory</span>
              <span className={`font-bold text-sm ${activeSector.trend_7d > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeSector.trend_label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Interactive Map Legend ─────────────────────────────────────── */}
      <div className="p-3.5 bg-slate-950/80 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">Outbreak Risk Scale:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[11px] text-slate-300">Critical (&gt;50% surge / clusters)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-[11px] text-slate-300">Warning (High Incidence)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[11px] text-slate-300">Elevated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-slate-300">Normal / Baseline</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <Navigation className="w-3 h-3 text-sky-400" />
          <span>Alaknanda & Pindar Basins • IT Gopeshwar GIS Grid</span>
        </div>
      </div>
    </div>
  );
}
