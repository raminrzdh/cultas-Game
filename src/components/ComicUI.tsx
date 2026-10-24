/**
 * ComicUI Component
 * Full-viewport Game Shell overlay matching Calpurnio's El Bueno de Cuttlas comic aesthetic:
 * Title Screen, Perimeter Minimal HUD, Duel Status Banner, Existential Quote Banner,
 * Rig Inspector & Settings, Sound Toggle, Language Switcher (EN / FA), and Pause Screen.
 */

import React, { useState } from 'react';
import { SceneMode } from '../engine/world';
import { Language, translations } from '../engine/i18n';
import { Volume2, VolumeX, Pause, Play, Sliders, HelpCircle, Languages } from 'lucide-react';

interface ComicUIProps {
  gameState: 'TITLE' | 'PLAYING' | 'PAUSED';
  onStartGame: () => void;
  onResumeGame: () => void;
  onPauseGame: () => void;
  scene: SceneMode;
  onSelectScene: (scene: SceneMode) => void;
  language: Language;
  onToggleLanguage: () => void;
  duelInfo: {
    state: string;
    message: string;
    reactionMs: number;
    bestMs: number;
    streak: number;
  };
  currentQuote: string;
  boilIntensity: number;
  onBoilChange: (val: number) => void;
  showDebug: boolean;
  onToggleDebug: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const ComicUI: React.FC<ComicUIProps> = ({
  gameState,
  onStartGame,
  onResumeGame,
  onPauseGame,
  scene,
  onSelectScene,
  language,
  onToggleLanguage,
  duelInfo,
  currentQuote,
  boilIntensity,
  onBoilChange,
  showDebug,
  onToggleDebug,
  soundEnabled,
  onToggleSound,
}) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [titleArtMode, setTitleArtMode] = useState<'EQUESTRIAN' | 'CLASSIC'>('EQUESTRIAN');

  const t = translations[language];
  const isRtl = language === 'fa';
  const fontClass = isRtl ? 'font-persian' : 'font-comic';

  // Title Screen Modal
  if (gameState === 'TITLE') {
    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`absolute inset-0 z-50 flex items-center justify-center bg-[#F5C78E]/95 p-4 select-none ${fontClass}`}
      >
        <div className="relative max-w-2xl w-full bg-white border-[6px] border-black rounded-2xl p-6 md:p-10 shadow-[12px_12px_0px_#000000] text-center flex flex-col items-center">
          
          {/* Language Switcher Badge at Top of Title Screen */}
          <button
            onClick={onToggleLanguage}
            className="absolute top-4 right-4 md:top-6 md:right-6 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border-2 border-black rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#000000] transition-colors"
          >
            <Languages className="w-4 h-4 text-black" />
            <span>{language === 'fa' ? 'English (EN)' : 'فارسی (FA)'}</span>
          </button>

          {/* Calpurnio Cuttlas Hero Artwork */}
          <div className="mb-4 mt-2 flex flex-col items-center">
            <div className="relative p-2 bg-[#FFFDF7] border-4 border-black rounded-2xl shadow-[5px_5px_0px_#000000] overflow-hidden flex items-center justify-center">
              {titleArtMode === 'EQUESTRIAN' ? (
                <img
                  src="/assets/aistudio/image_87b93356.png"
                  alt="El Bueno de Cuttlas a caballo"
                  className="w-36 h-36 md:w-44 md:h-44 object-contain"
                />
              ) : (
                <svg
                  viewBox="0 0 160 215"
                  className="w-36 h-36 md:w-44 md:h-44 stroke-black fill-white"
                  style={{ strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' }}
                >
                  {/* Subtle Drop Shadow */}
                  <g transform="translate(4, 4)" opacity="0.16">
                    <ellipse cx="80" cy="24" rx="14" ry="17" fill="black" stroke="black" />
                    <line x1="42" y1="38" x2="118" y2="38" stroke="black" />
                    <ellipse cx="80" cy="56" rx="13" ry="18" fill="black" stroke="black" />
                    <ellipse cx="80" cy="108" rx="14" ry="34" fill="black" stroke="black" />
                    <polygon points="66,120 54,122 56,138 64,136" fill="black" stroke="black" />
                    <polygon points="94,120 106,122 104,138 96,136" fill="black" stroke="black" />
                    <polyline points="72,82 50,108 48,136" fill="none" stroke="black" />
                    <polyline points="88,82 110,108 112,136" fill="none" stroke="black" />
                    <polyline points="74,138 66,172 64,204 48,204" fill="none" stroke="black" />
                    <polyline points="86,138 94,172 96,204 112,204" fill="none" stroke="black" />
                  </g>

                  {/* Hat Crown & Brim */}
                  <ellipse cx="80" cy="24" rx="14" ry="17" fill="white" stroke="black" />
                  <line x1="42" y1="38" x2="118" y2="38" stroke="black" />

                  {/* Head */}
                  <ellipse cx="80" cy="56" rx="13" ry="18" fill="white" stroke="black" />

                  {/* Torso */}
                  <ellipse cx="80" cy="108" rx="14" ry="34" fill="white" stroke="black" />

                  {/* Dual Holsters */}
                  <polygon points="66,120 54,122 56,138 64,136" fill="white" stroke="black" />
                  <polygon points="94,120 106,122 104,138 96,136" fill="white" stroke="black" />

                  {/* Left Arm: Shoulder -> Elbow -> Hand + 3 Fingers */}
                  <polyline points="72,82 50,108 48,136" fill="none" stroke="black" />
                  <line x1="48" y1="136" x2="38" y2="146" stroke="black" />
                  <line x1="48" y1="136" x2="46" y2="150" stroke="black" />
                  <line x1="48" y1="136" x2="54" y2="148" stroke="black" />

                  {/* Right Arm: Shoulder -> Elbow -> Hand + 3 Fingers */}
                  <polyline points="88,82 110,108 112,136" fill="none" stroke="black" />
                  <line x1="112" y1="136" x2="122" y2="146" stroke="black" />
                  <line x1="112" y1="136" x2="114" y2="150" stroke="black" />
                  <line x1="112" y1="136" x2="106" y2="148" stroke="black" />

                  {/* Left Leg: Hip -> Knee -> Ankle -> Foot */}
                  <polyline points="74,138 66,172 64,204 48,204" fill="none" stroke="black" />

                  {/* Right Leg: Hip -> Knee -> Ankle -> Foot */}
                  <polyline points="86,138 94,172 96,204 112,204" fill="none" stroke="black" />
                </svg>
              )}
            </div>

            {/* Toggle Artwork button */}
            <div className="flex items-center gap-1.5 mt-2 bg-stone-100 p-0.5 rounded-lg border border-black text-[11px] font-bold">
              <button
                onClick={() => setTitleArtMode('EQUESTRIAN')}
                className={`px-2.5 py-0.5 rounded transition-all ${
                  titleArtMode === 'EQUESTRIAN' ? 'bg-black text-white' : 'text-stone-700 hover:text-black'
                }`}
              >
                {language === 'fa' ? 'اسب‌سوار (تصویر اصلی)' : 'Horse Rider (Original)'}
              </button>
              <button
                onClick={() => setTitleArtMode('CLASSIC')}
                className={`px-2.5 py-0.5 rounded transition-all ${
                  titleArtMode === 'CLASSIC' ? 'bg-black text-white' : 'text-stone-700 hover:text-black'
                }`}
              >
                {language === 'fa' ? 'کوتلاس ایستاده' : 'Standing Cuttlas'}
              </button>
            </div>
          </div>

          <h1 className="font-black text-3xl md:text-5xl text-black tracking-tight mb-2">
            {t.title}
          </h1>
          <p className="text-base md:text-lg text-stone-700 font-bold mb-5">
            {t.subtitle}
          </p>

          <p className="text-sm md:text-base text-stone-800 font-medium max-w-lg mb-8 leading-relaxed">
            {t.description}
          </p>

          {/* Primary Start CTA */}
          <button
            onClick={onStartGame}
            className="w-full sm:w-auto px-10 py-4 bg-black text-white text-lg font-black rounded-xl border-4 border-black hover:bg-white hover:text-black transition-colors duration-150 shadow-[6px_6px_0px_#78350f] active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            {t.startCta}
          </button>

          {/* Control hint line */}
          <div className="mt-8 text-xs font-mono text-stone-600 tracking-wide border-t-2 border-stone-300 pt-4 w-full">
            {t.controlHint}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`pointer-events-none absolute inset-0 z-40 flex flex-col justify-between p-3 md:p-6 select-none ${fontClass}`}
    >
      {/* --- TOP BAR HUD --- */}
      <div className="pointer-events-auto flex items-center justify-between gap-3 w-full">
        {/* Left: Brand title & Scene Selector */}
        <div className="flex items-center gap-2.5">
          <div className="bg-white border-3 md:border-4 border-black px-3 py-1.5 rounded-lg shadow-[3px_3px_0px_#000000] flex items-center gap-2">
            <span className="font-black text-sm md:text-base text-black tracking-tight whitespace-nowrap">
              {t.brand}
            </span>
          </div>

          {/* Scene Selector Tabs */}
          <div className="hidden sm:flex items-center gap-1.5 bg-black/85 p-1 rounded-xl border-2 border-black backdrop-blur-sm">
            <button
              onClick={() => onSelectScene('DESERT')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                scene === 'DESERT'
                  ? 'bg-[#F5C78E] text-black shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {t.scenes.desert}
            </button>
            <button
              onClick={() => onSelectScene('DUEL')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                scene === 'DUEL'
                  ? 'bg-[#B5C642] text-black shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {t.scenes.duel}
            </button>
            <button
              onClick={() => onSelectScene('ALIEN')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                scene === 'ALIEN'
                  ? 'bg-[#1C4568] text-white shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {t.scenes.alien}
            </button>
            <button
              onClick={() => onSelectScene('MABEL')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                scene === 'MABEL'
                  ? 'bg-[#DE8598] text-black shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {t.scenes.mabel}
            </button>
          </div>
        </div>

        {/* Right: Controls & Options */}
        <div className="flex items-center gap-2">
          {/* Language Switcher Toggle */}
          <button
            onClick={onToggleLanguage}
            title={language === 'fa' ? 'Switch to English' : 'تغییر به فارسی'}
            className="h-10 px-3 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_#000000] flex items-center gap-1 hover:bg-stone-100 transition-colors font-bold text-xs text-black"
          >
            <Languages className="w-4 h-4 text-black" />
            <span className="uppercase">{language === 'fa' ? 'EN' : 'فارسی'}</span>
          </button>

          {/* Rig / Line Boil Inspector Toggle */}
          <button
            onClick={() => setShowInspector(!showInspector)}
            title={t.inspector.title}
            className="w-10 h-10 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_#000000] flex items-center justify-center hover:bg-stone-100 transition-colors"
          >
            <Sliders className="w-5 h-5 text-black" />
          </button>

          {/* Help Modal Toggle */}
          <button
            onClick={() => setShowHelpModal(true)}
            title={t.help.title}
            className="w-10 h-10 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_#000000] flex items-center justify-center hover:bg-stone-100 transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-black" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? t.pause.mute : t.pause.unmute}
            className="w-10 h-10 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_#000000] flex items-center justify-center hover:bg-stone-100 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-black" />
            ) : (
              <VolumeX className="w-5 h-5 text-stone-500" />
            )}
          </button>

          {/* Pause Button */}
          <button
            onClick={gameState === 'PAUSED' ? onResumeGame : onPauseGame}
            title={gameState === 'PAUSED' ? t.pause.resume : t.pause.title}
            className="w-10 h-10 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_#000000] flex items-center justify-center hover:bg-stone-100 transition-colors"
          >
            {gameState === 'PAUSED' ? (
              <Play className="w-5 h-5 text-black" />
            ) : (
              <Pause className="w-5 h-5 text-black" />
            )}
          </button>
        </div>
      </div>

      {/* --- DUEL BANNER (Visible during Western Duel) --- */}
      {scene === 'DUEL' && (
        <div className="pointer-events-auto mx-auto max-w-md w-full">
          <div className="bg-white border-4 border-black rounded-xl p-3 shadow-[6px_6px_0px_#000000] text-center">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-stone-700 mb-1 border-b-2 border-stone-200 pb-1">
              <span>
                {t.duel.streak}: <span className="font-bold text-black tabular-nums">{duelInfo.streak}</span>
              </span>
              <span>
                {t.duel.bestReaction}:{' '}
                <span className="font-bold text-black tabular-nums">
                  {duelInfo.bestMs ? `${duelInfo.bestMs} ms` : '--'}
                </span>
              </span>
            </div>

            <div
              className={`font-black text-xl md:text-2xl tracking-tight transition-transform ${
                duelInfo.state === 'DRAW_READY'
                  ? 'text-red-600 scale-110 animate-bounce'
                  : 'text-black'
              }`}
            >
              {duelInfo.message || t.duel.ready}
            </div>

            {duelInfo.reactionMs > 0 && duelInfo.state === 'PLAYER_WON' && (
              <div className="text-xs font-mono font-bold text-emerald-700 mt-1">
                {t.duel.drawTime(duelInfo.reactionMs)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- INSPECTOR / ENGINE SETTINGS DRAWER --- */}
      {showInspector && (
        <div
          className={`pointer-events-auto absolute top-20 ${
            isRtl ? 'left-4 md:left-6' : 'right-4 md:right-6'
          } w-80 bg-white border-4 border-black rounded-xl p-5 shadow-[8px_8px_0px_#000000]`}
        >
          <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
            <h3 className="font-black text-lg text-black">{t.inspector.title}</h3>
            <button
              onClick={() => setShowInspector(false)}
              className="text-stone-500 hover:text-black font-mono font-bold text-sm"
            >
              ✕
            </button>
          </div>

          {/* Language selection */}
          <div className="mb-4">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span>{t.inspector.language}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => language !== 'fa' && onToggleLanguage()}
                className={`py-1.5 px-3 rounded-lg border-2 border-black font-bold text-xs transition-colors ${
                  language === 'fa' ? 'bg-black text-white' : 'bg-stone-100 text-stone-800'
                }`}
              >
                فارسی (Persian)
              </button>
              <button
                onClick={() => language !== 'en' && onToggleLanguage()}
                className={`py-1.5 px-3 rounded-lg border-2 border-black font-bold text-xs transition-colors ${
                  language === 'en' ? 'bg-black text-white' : 'bg-stone-100 text-stone-800'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Line Boil Slider */}
          <div className="mb-4">
            <div className="flex justify-between text-xs font-mono font-bold mb-1">
              <span>{t.inspector.lineBoil}</span>
              <span className="tabular-nums">{boilIntensity.toFixed(1)} px</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.2"
              step="0.2"
              value={boilIntensity}
              onChange={(e) => onBoilChange(parseFloat(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
          </div>

          {/* Debug Skeleton Bones */}
          <div className="flex items-center justify-between text-xs font-bold mb-4">
            <span>{t.inspector.debugSkeleton}</span>
            <button
              onClick={onToggleDebug}
              className={`px-3 py-1 rounded border-2 border-black font-bold ${
                showDebug ? 'bg-black text-white' : 'bg-stone-100 text-stone-800'
              }`}
            >
              {showDebug ? t.inspector.active : t.inspector.inactive}
            </button>
          </div>

          <p className="text-[11px] text-stone-600 border-t border-stone-200 pt-2 leading-relaxed">
            {t.inspector.engineInfo}
          </p>
        </div>
      )}

      {/* --- BOTTOM BAR: PHILOSOPHICAL EXISTENTIAL QUOTE & CONTROLS --- */}
      <div className="pointer-events-auto flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        {/* Existential Quote */}
        <div className="bg-white border-3 md:border-4 border-black px-4 py-2 rounded-xl shadow-[4px_4px_0px_#000000] max-w-xl w-full sm:w-auto">
          <p className="text-xs md:text-sm text-stone-900 italic font-medium leading-tight">
            "{currentQuote}"
          </p>
        </div>

        {/* Quick action shortcuts for touch/mouse */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { code: 'KeyR' });
              window.dispatchEvent(event);
            }}
            className="px-3 py-1.5 bg-amber-100 text-stone-900 border-3 border-black rounded-lg font-black text-xs shadow-[3px_3px_0px_#000000] hover:bg-amber-200 active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            {t.actions.horse}
          </button>
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { code: 'KeyH' });
              window.dispatchEvent(event);
            }}
            className="px-3 py-1.5 bg-white border-3 border-black rounded-lg font-black text-xs shadow-[3px_3px_0px_#000000] hover:bg-stone-100 active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            {t.actions.hatTip}
          </button>
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { code: 'KeyQ' });
              window.dispatchEvent(event);
            }}
            className="px-3 py-1.5 bg-white border-3 border-black rounded-lg font-black text-xs shadow-[3px_3px_0px_#000000] hover:bg-stone-100 active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            {t.actions.duelStance}
          </button>
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { code: 'KeyJ' });
              window.dispatchEvent(event);
            }}
            className="px-3 py-1.5 bg-black text-white border-3 border-black rounded-lg font-black text-xs shadow-[3px_3px_0px_#44403c] hover:bg-stone-800 active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            {t.actions.shoot}
          </button>
        </div>
      </div>

      {/* --- HELP / CONTROLS MODAL --- */}
      {showHelpModal && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-w-lg w-full bg-white border-[6px] border-black rounded-2xl p-6 md:p-8 shadow-[12px_12px_0px_#000000]">
            <div className="flex items-center justify-between mb-4 border-b-3 border-black pb-3">
              <h2 className="font-black text-2xl text-black">{t.help.title}</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center hover:bg-stone-100 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-sm text-stone-900 mb-6">
              <div className="flex justify-between border-b border-stone-200 pb-1">
                <span className="font-bold">{t.help.move}</span>
                <span>{t.help.moveDesc}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1">
                <span className="font-bold">{t.help.run}</span>
                <span>{t.help.runDesc}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1">
                <span className="font-bold">{t.help.jump}</span>
                <span>{t.help.jumpDesc}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1">
                <span className="font-bold">{t.help.horse}</span>
                <span>{t.help.horseDesc}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1">
                <span className="font-bold">{t.help.hatTip}</span>
                <span>{t.help.hatTipDesc}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1">
                <span className="font-bold">{t.help.duel}</span>
                <span>{t.help.duelDesc}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1">
                <span className="font-bold">{t.help.shoot}</span>
                <span>{t.help.shootDesc}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1">
                <span className="font-bold">{t.help.scenes}</span>
                <span>{t.help.scenesDesc}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1">
                <span className="font-bold">{t.help.lang}</span>
                <span>{t.help.langDesc}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">{t.help.sound}</span>
                <span>{t.help.soundDesc}</span>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-3 bg-black text-white font-black text-base rounded-xl border-3 border-black hover:bg-stone-800 transition-colors"
            >
              {t.help.close}
            </button>
          </div>
        </div>
      )}

      {/* --- PAUSE MODAL --- */}
      {gameState === 'PAUSED' && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-w-sm w-full bg-white border-[6px] border-black rounded-2xl p-6 text-center shadow-[10px_10px_0px_#000000]">
            <h2 className="font-black text-3xl text-black mb-3">{t.pause.title}</h2>
            <p className="text-stone-700 text-sm mb-6 leading-relaxed">
              {t.pause.quote}
            </p>
            <div className="space-y-3">
              <button
                onClick={onResumeGame}
                className="w-full py-3 bg-black text-white font-black rounded-xl border-3 border-black hover:bg-stone-800 transition-colors"
              >
                {t.pause.resume}
              </button>
              <button
                onClick={onToggleSound}
                className="w-full py-2.5 bg-stone-100 text-black font-bold rounded-xl border-2 border-black hover:bg-stone-200 transition-colors"
              >
                {soundEnabled ? t.pause.mute : t.pause.unmute}
              </button>
              <button
                onClick={onToggleLanguage}
                className="w-full py-2.5 bg-stone-100 text-black font-bold rounded-xl border-2 border-black hover:bg-stone-200 transition-colors"
              >
                {language === 'fa' ? 'Switch to English' : 'تغییر به زبان فارسی'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
