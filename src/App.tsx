/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { ComicUI } from './components/ComicUI';
import { SceneMode } from './engine/world';
import { sound } from './engine/audio';
import { Language, translations } from './engine/i18n';

export default function App() {
  const [gameState, setGameState] = useState<'TITLE' | 'PLAYING' | 'PAUSED'>('TITLE');
  const [scene, setScene] = useState<SceneMode>('DESERT');
  const [language, setLanguage] = useState<Language>('fa'); // Persian default with English switchable
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [boilIntensity, setBoilIntensity] = useState<number>(1.4);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [currentQuote, setCurrentQuote] = useState<string>(
    translations.fa.quotes[0]
  );

  const [duelInfo, setDuelInfo] = useState({
    state: 'IDLE',
    message: '',
    reactionMs: 0,
    bestMs: 0,
    streak: 0,
  });

  const handleStartGame = useCallback(() => {
    setGameState('PLAYING');
    sound.playWesternChord();
  }, []);

  const handlePauseGame = useCallback(() => {
    setGameState('PAUSED');
  }, []);

  const handleResumeGame = useCallback(() => {
    setGameState('PLAYING');
  }, []);

  const handleToggleSound = useCallback(() => {
    const isNowEnabled = sound.toggleMute();
    setSoundEnabled(isNowEnabled);
  }, []);

  const handleToggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const nextLang = prev === 'fa' ? 'en' : 'fa';
      setCurrentQuote(translations[nextLang].quotes[0]);
      return nextLang;
    });
  }, []);

  // Global key bindings for Pause (Esc), Start (Enter/Space), Mute (M), and Language Toggle (L)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'TITLE') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        } else if (e.code === 'KeyL') {
          handleToggleLanguage();
        }
        return;
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'));
      } else if (e.code === 'KeyM') {
        handleToggleSound();
      } else if (e.code === 'KeyL') {
        handleToggleLanguage();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gameState, handleStartGame, handleToggleLanguage, handleToggleSound]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-900 select-none flex items-center justify-center font-display">
      {/* 60 FPS HTML5 Canvas Game Renderer */}
      <GameCanvas
        scene={scene}
        onSceneChange={setScene}
        language={language}
        onDuelUpdate={setDuelInfo}
        onQuoteUpdate={setCurrentQuote}
        boilIntensity={boilIntensity}
        showSkeletonDebug={showDebug}
        isPaused={gameState !== 'PLAYING'}
        soundEnabled={soundEnabled}
      />

      {/* Comic UI Overlay */}
      <ComicUI
        gameState={gameState}
        onStartGame={handleStartGame}
        onResumeGame={handleResumeGame}
        onPauseGame={handlePauseGame}
        scene={scene}
        onSelectScene={setScene}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        duelInfo={duelInfo}
        currentQuote={currentQuote}
        boilIntensity={boilIntensity}
        onBoilChange={setBoilIntensity}
        showDebug={showDebug}
        onToggleDebug={() => setShowDebug(!showDebug)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />
    </div>
  );
}
