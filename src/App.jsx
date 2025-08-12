import React, { useState, useEffect } from 'react';
import ConsentForm from './components/ConsentForm';
import SurveyForm from './components/SurveyForm';
import Instructions from './components/Instructions';
import Game from './components/Game';
import PracticeMode from './components/PracticeMode';
import { initializeParticipant } from './firebase/dataCollection';
import './App.css';

function App() {
  const [step, setStep] = useState('consent');
  const [participantData, setParticipantData] = useState(null);
  const [participantId, setParticipantId] = useState(null);
  const [instructionPage, setInstructionPage] = useState(0);

  // Request fullscreen mode function
  const requestFullscreen = async () => {
    try {
      // Check if fullscreen is supported
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen();
      } else {
        // Fallback: try to maximize window (limited browser support)
        window.moveTo(0, 0);
        window.resizeTo(screen.width, screen.height);
      }
    } catch (error) {
      console.warn('Could not enter fullscreen mode:', error);
      // Fallback: try to maximize window
      try {
        window.moveTo(0, 0);
        window.resizeTo(screen.width, screen.height);
      } catch (fallbackError) {
        console.warn('Could not maximize window:', fallbackError);
      }
    }
  };

  const handleConsent = async () => {
    // Enter fullscreen when user consents to participate
    await requestFullscreen();
    setStep('survey');
  };

  const handleSurveySubmit = async (data) => {
    setParticipantData(data);
    
    try {
      // Initialize participant data collection
      const id = await initializeParticipant(data);
      setParticipantId(id);
      console.log('Participant initialized with ID:', id);
    } catch (error) {
      console.error('Failed to initialize participant data collection:', error);
      // Continue with experiment even if data collection fails
    }
    
    setInstructionPage(0); // Start from page 1
    setStep('instructions');
  };

  const handleInstructionsStart = () => {
    setStep('game');
  };

  const handlePracticeStart = () => {
    setStep('practice');
  };

  const handlePracticeComplete = () => {
    setInstructionPage(3); // Set to page 4 (index 3)
    setStep('instructions');
  };

  const handleGameComplete = (results) => {
    setStep('complete');
  };

  return (
    <div className="app">
      {step === 'consent' && (
        <ConsentForm 
          onConsent={handleConsent}
          onDecline={() => setStep('decline')}
        />
      )}
      
      {step === 'survey' && (
        <SurveyForm onSubmit={handleSurveySubmit} />
      )}
      
      {step === 'instructions' && (
        <Instructions 
          onStart={handleInstructionsStart}
          onPractice={handlePracticeStart}
          currentPage={instructionPage}
          setCurrentPage={setInstructionPage}
        />
      )}

      {step === 'practice' && (
        <PracticeMode onPracticeComplete={handlePracticeComplete} />
      )}
      
      {step === 'game' && (
        <Game 
          participantData={participantData} 
          participantId={participantId}
          onGameComplete={handleGameComplete}
        />
      )}

      {step === 'complete' && (
        <div className="complete-message">
          <h1>Study Complete!</h1>
          <p>Thank you for participating in our research study.</p>
        </div>
      )}

      {step === 'decline' && (
        <div className="decline-message">
          <h1>Thank you for your time</h1>
          <p>You have chosen not to participate in this study.</p>
        </div>
      )}
    </div>
  );
}

export default App; 