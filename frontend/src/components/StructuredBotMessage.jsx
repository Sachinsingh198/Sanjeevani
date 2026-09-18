import React from 'react';
import {
  Stethoscope,
  Leaf,
  AlertTriangle,
  Clock,
  Sparkles,
  PhoneCall,
  ShieldAlert,
} from 'lucide-react';

/**
 * Parses inline formatting like **bold** and *italic* and highlights phone numbers (104, 108)
 */
function renderInlineText(text) {
  if (!text) return null;

  // Pattern matches **bold**, *italic*, and emergency numbers 104/108
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|\b(104|108)\b)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined) {
      // **bold**
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-[#1E2A43] dark:text-[#F4F6F0]">
          {match[2]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      // *italic*
      parts.push(
        <em key={`i-${match.index}`} className="italic">
          {match[3]}
        </em>
      );
    } else if (match[4] !== undefined) {
      // 104 or 108 phone numbers
      const num = match[4];
      parts.push(
        <a
          key={`tel-${match.index}`}
          href={`tel:${num}`}
          className="inline-flex items-center gap-1 font-bold text-[#5A7855] dark:text-[#8ED14C] hover:underline underline-offset-2 px-1 py-0.5 rounded bg-[#5A7855]/10 dark:bg-[#5A7855]/20 text-[11px] sm:text-xs"
          title={`Call ${num}`}
        >
          <PhoneCall className="w-2.5 h-2.5 inline" />
          {num}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Splits run-together bullet points (e.g. ":- bullet 1 - bullet 2") into clean individual strings
 */
function extractBulletPoints(rawItems) {
  const result = [];
  rawItems.forEach((item) => {
    if (typeof item !== 'string') return;
    let clean = item.trim().replace(/^[:\-\s]+/, '');
    if (!clean) return;
    const subParts = clean.split(/\s+[-•]\s+/);
    subParts.forEach((sp) => {
      const trimmed = sp.trim().replace(/^[:\-\s]+/, '');
      if (trimmed) result.push(trimmed);
    });
  });
  return result.length > 0 ? result : (rawItems.filter(Boolean));
}

/**
 * Normalizes section keys to categorize standard medical/bot blocks
 */
function identifySectionType(keyText) {
  const lower = keyText.toLowerCase().trim();

  // Condition / Complaint
  if (lower.includes('takleef') || lower.includes('condition') || lower.includes('lakshan') || lower.includes('तकलीफ')) {
    return 'condition';
  }
  // Clinical Diagnosis / Assessment
  if (
    lower.includes('jaanch') ||
    lower.includes('diagnosis') ||
    lower.includes('assessment') ||
    lower.includes('aanklan') ||
    lower.includes('आंकलन') ||
    lower.includes('जांच')
  ) {
    return 'diagnosis';
  }
  // Remedy name
  if (lower.includes('nuskha') || lower.includes('remedy') || lower.includes('नुस्खा') || lower.includes('upchaar')) {
    return 'remedy';
  }
  // Preparation / method
  if (
    lower.includes('kaise banayein') ||
    lower.includes('banawa') ||
    lower.includes('how to prepare') ||
    lower.includes('बणावा') ||
    lower.includes('tarika') ||
    lower.includes('vidhi')
  ) {
    return 'preparation';
  }
  // Dosage / timing
  if (
    lower.includes('kab') ||
    lower.includes('when to take') ||
    lower.includes('khuraak') ||
    lower.includes('लीणा') ||
    lower.includes('dosage')
  ) {
    return 'dosage';
  }
  // Ayurvedic benefit
  if (lower.includes('ayurvedic') || lower.includes('labh') || lower.includes('laabh') || lower.includes('लाभ')) {
    return 'benefit';
  }
  // Precautions
  if (
    lower.includes('dhyan') ||
    lower.includes('precaution') ||
    lower.includes('savdhani') ||
    lower.includes('ध्यान') ||
    lower.includes('caution') ||
    lower.includes('warning')
  ) {
    return 'precaution';
  }

  return 'generic';
}

/**
 * Parses raw bot text into structured blocks
 */
function parseMessageBlocks(rawText) {
  if (!rawText) return [];

  const lines = rawText.split('\n');
  const blocks = [];
  let currentSection = null;
  let currentList = null;

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  const flushSection = () => {
    if (currentSection) {
      blocks.push(currentSection);
      currentSection = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      // Empty line closes active lists
      flushList();
      continue;
    }

    // 1. Check for emergency header or callout
    if (
      line.startsWith('EMERGENCY WARNING:') ||
      line.startsWith('TATKAAL SAVDHANI') ||
      line.includes('Critical life-threatening')
    ) {
      flushList();
      flushSection();
      blocks.push({
        type: 'emergency',
        text: line.replace(/^EMERGENCY WARNING:\s*/i, '').trim(),
      });
      continue;
    }

    // 2. Check for key-value sections like **Label:** Value or **Label:**
    const sectionMatch = line.match(/^\*\*([^*:]+):\*\*\s*(.*)$/);
    if (sectionMatch) {
      flushList();
      flushSection();

      const label = sectionMatch[1].trim();
      const inlineContent = sectionMatch[2].trim();
      const secType = identifySectionType(label);

      currentSection = {
        type: 'section',
        secType,
        label,
        content: inlineContent ? [inlineContent] : [],
      };
      continue;
    }

    // 3. If we are inside an open section and this line continues it
    if (currentSection) {
      // If line is a numbered item or bullet under preparation/steps
      const stepMatch = line.match(/^(\d+)[\.\)]\s*(.+)$/);
      if (stepMatch) {
        currentSection.content.push({
          type: 'step',
          num: stepMatch[1],
          text: stepMatch[2],
        });
        continue;
      }

      // Check if line is a new section or referral footer
      if (line.startsWith('2 din') || line.includes('104') || line.includes('PHC')) {
        flushSection();
        blocks.push({
          type: 'referral',
          text: line,
        });
        continue;
      }

      // Plain continuation in section
      currentSection.content.push(line);
      continue;
    }

    // 4. Referral / Helpline footer line
    if (
      (line.includes('104') && (line.includes('PHC') || line.includes('call') || line.includes('sampark'))) ||
      line.includes('108 emergency ambulance') ||
      line.startsWith('2 din ma') ||
      line.startsWith('2 din mein')
    ) {
      flushList();
      blocks.push({
        type: 'referral',
        text: line,
      });
      continue;
    }

    // 5. Numbered list item: 1. or 1)
    const numMatch = line.match(/^(\d+)[\.\)]\s*(.+)$/);
    if (numMatch) {
      if (!currentList || currentList.listType !== 'ordered') {
        flushList();
        currentList = { type: 'list', listType: 'ordered', items: [] };
      }
      currentList.items.push({ num: numMatch[1], text: numMatch[2] });
      continue;
    }

    // 6. Bullet item: - or * or •
    const bulletMatch = line.match(/^[-*•]\s*(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.listType !== 'unordered') {
        flushList();
        currentList = { type: 'list', listType: 'unordered', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // 7. Markdown headings: ### or ##
    const headingMatch = line.match(/^(#{1,4})\s*(.+)$/);
    if (headingMatch) {
      flushList();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      continue;
    }

    // 8. Regular paragraph line
    flushList();
    blocks.push({
      type: 'paragraph',
      text: line,
    });
  }

  flushList();
  flushSection();

  return blocks;
}

export default function StructuredBotMessage({ text, tier }) {
  if (!text) return null;

  const blocks = parseMessageBlocks(text);

  return (
    <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
      {blocks.map((block, idx) => {
        // --- 1. EMERGENCY WARNING BLOCK ---
        if (block.type === 'emergency') {
          return (
            <div
              key={idx}
              className="p-3 sm:p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-red-800 dark:text-red-200 shadow-xs"
            >
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <div className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-red-700 dark:text-red-300">
                  Tatkaal Savdhani (Emergency Alert)
                </div>
                <div className="text-xs sm:text-sm font-medium">{renderInlineText(block.text)}</div>
              </div>
            </div>
          );
        }

        // --- 2. STRUCTURED CLINICAL SECTIONS ---
        if (block.type === 'section') {
          const { secType, label, content } = block;

          // (a) Reported Condition / Takleef
          if (secType === 'condition') {
            const bodyText = content.filter((c) => typeof c === 'string').join(' ');
            return (
              <div
                key={idx}
                className="p-2.5 sm:p-3 rounded-xl bg-[#F4F6F0] dark:bg-[#131D2A] border border-[#5A7855]/15 dark:border-gray-700/60"
              >
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5A7855]" />
                  {label}
                </div>
                <p className="text-xs sm:text-sm font-medium text-[#1E2A43] dark:text-[#E2E8F0]">
                  {renderInlineText(bodyText)}
                </p>
              </div>
            );
          }

          // (b) Clinical Diagnosis / Sambhavit Jaanch
          if (secType === 'diagnosis') {
            const bodyText = content.filter((c) => typeof c === 'string').join(' ');
            return (
              <div
                key={idx}
                className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-[#5A7855]/10 via-[#5A7855]/5 to-transparent border border-[#5A7855]/30 dark:border-[#5A7855]/40 shadow-xs"
              >
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#5A7855] dark:text-[#8ED14C] mb-1">
                  <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#1E2A43] dark:text-[#F4F6F0] leading-snug">
                  {renderInlineText(bodyText)}
                </p>
              </div>
            );
          }

          // (c) Remedy / Nuskha
          if (secType === 'remedy') {
            const bodyText = content.filter((c) => typeof c === 'string').join(' ');
            return (
              <div
                key={idx}
                className="p-2.5 sm:p-3 rounded-xl bg-[#D4A359]/10 dark:bg-[#D4A359]/15 border border-[#D4A359]/30 flex items-start gap-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-[#D4A359] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Leaf className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#8C5E24] dark:text-[#D4A359]">
                    {label}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#1E2A43] dark:text-[#F4F6F0]">
                    {renderInlineText(bodyText)}
                  </div>
                </div>
              </div>
            );
          }

          // (d) Preparation / Kaise Banayein (Steps)
          if (secType === 'preparation') {
            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white dark:bg-[#15202E] border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-2"
              >
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#1E2A43] dark:text-[#F4F6F0]">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4A359]" />
                  <span>{label}</span>
                </div>
                <div className="space-y-1.5 pl-1">
                  {content.map((item, ci) => {
                    if (typeof item === 'object' && item.type === 'step') {
                      return (
                        <div key={ci} className="flex items-start gap-2 text-xs sm:text-sm">
                          <span className="w-5 h-5 rounded-full bg-[#5A7855]/15 dark:bg-[#5A7855]/30 text-[#5A7855] dark:text-[#8ED14C] text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                            {item.num}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 flex-1">{renderInlineText(item.text)}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={ci} className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        {renderInlineText(item)}
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          }

          // (e) Dosage / Kab Tak Lein
          if (secType === 'dosage') {
            const rawItems = content.filter((c) => typeof c === 'string');
            const items = extractBulletPoints(rawItems);
            return (
              <div
                key={idx}
                className="p-2.5 sm:p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 text-sky-900 dark:text-sky-200 space-y-1.5"
              >
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-sky-800 dark:text-sky-300">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                  <span>{label}</span>
                </div>
                <div className="space-y-1 pl-1">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                      {items.length > 1 && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5" />}
                      <span className="leading-relaxed text-sky-950 dark:text-sky-100">{renderInlineText(it)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // (f) Ayurvedic Benefit / Labh
          if (secType === 'benefit') {
            const bodyText = content.filter((c) => typeof c === 'string').join(' ');
            return (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm"
              >
                <strong className="font-semibold text-[#5A7855] dark:text-[#8ED14C] mr-1">🌿 {label}:</strong>
                <span>{renderInlineText(bodyText)}</span>
              </div>
            );
          }

          // (g) Precautions / Dhyan Rakhein
          if (secType === 'precaution') {
            const rawItems = content.filter((c) => typeof c === 'string');
            const items = extractBulletPoints(rawItems);
            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm space-y-2"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    {label}
                  </div>
                </div>
                <div className="space-y-1.5 pl-1">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0 mt-1.5" />
                      <span className="leading-relaxed text-amber-950 dark:text-amber-100">{renderInlineText(it)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // (h) Generic Section Fallback
          return (
            <div key={idx} className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
              <div className="text-xs font-bold text-[#1E2A43] dark:text-[#F4F6F0]">{label}</div>
              <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                {content.map((c, ci) => (
                  <p key={ci}>{typeof c === 'string' ? renderInlineText(c) : c.text}</p>
                ))}
              </div>
            </div>
          );
        }

        // --- 3. LIST BLOCKS (ORDERED / UNORDERED) ---
        if (block.type === 'list') {
          if (block.listType === 'ordered') {
            return (
              <div key={idx} className="space-y-1.5 my-1">
                {block.items.map((item, li) => (
                  <div key={li} className="flex items-start gap-2 text-xs sm:text-sm">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#5A7855]/15 dark:bg-[#5A7855]/30 text-[#5A7855] dark:text-[#8ED14C] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {item.num}
                    </span>
                    <span className="text-gray-800 dark:text-gray-200 flex-1 leading-snug">
                      {renderInlineText(item.text)}
                    </span>
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div key={idx} className="space-y-1 my-1 pl-1">
              {block.items.map((item, li) => (
                <div key={li} className="flex items-start gap-2 text-xs sm:text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5A7855] dark:bg-[#8ED14C] shrink-0 mt-2" />
                  <span className="text-gray-800 dark:text-gray-200 flex-1 leading-relaxed">
                    {renderInlineText(item)}
                  </span>
                </div>
              ))}
            </div>
          );
        }

        // --- 4. REFERRAL & EMERGENCY HELPLINE FOOTER ---
        if (block.type === 'referral') {
          return (
            <div
              key={idx}
              className="mt-2 p-3 rounded-xl bg-[#5A7855]/10 dark:bg-[#5A7855]/15 border border-[#5A7855]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
            >
              <div className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 flex items-start sm:items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#5A7855] dark:text-[#8ED14C] shrink-0 mt-0.5 sm:mt-0" />
                <span>{renderInlineText(block.text)}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <a
                  href="tel:104"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#5A7855] hover:bg-[#496345] text-white text-[10px] sm:text-xs font-bold transition-all shadow-xs"
                  title="Call 104 Tele-Health Helpline"
                >
                  <PhoneCall className="w-3 h-3" />
                  104 (Health)
                </a>
                <a
                  href="tel:108"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#B85042] hover:bg-[#9c4337] text-white text-[10px] sm:text-xs font-bold transition-all shadow-xs"
                  title="Call 108 Emergency Ambulance"
                >
                  <PhoneCall className="w-3 h-3" />
                  108 (Ambulance)
                </a>
              </div>
            </div>
          );
        }

        // --- 5. HEADINGS ---
        if (block.type === 'heading') {
          return (
            <h4
              key={idx}
              className="font-bold text-sm sm:text-base text-[#1E2A43] dark:text-[#F4F6F0] pt-1 border-b border-gray-100 dark:border-gray-800 pb-1"
            >
              {renderInlineText(block.text)}
            </h4>
          );
        }

        // --- 6. REGULAR PARAGRAPH ---
        return (
          <p key={idx} className="leading-relaxed text-gray-800 dark:text-gray-200">
            {renderInlineText(block.text)}
          </p>
        );
      })}
    </div>
  );
}
