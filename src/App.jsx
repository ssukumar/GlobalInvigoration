import React, { useState, useEffect } from 'react';
import ConsentForm from './components/ConsentForm';
import SurveyForm from './components/SurveyForm';
import Instructions from './components/Instructions';
import Game from './components/Game2';
import PracticeMode from './components/PracticeMode';
import DataExporter from './components/DataExporter';
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
      {/* Floating export button - only visible on consent page */}
      {step === 'consent' && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999
        }}>
          <button
            onClick={() => setStep('export')}
            style={{
              padding: '10px 15px',
              backgroundColor: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
            title="Export Firebase data to CSV"
          >
            📊 Export Data
          </button>
        </div>
      )}

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

      {step === 'export' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0 }}>Export Firebase Data</h2>
              <button
                onClick={() => setStep('consent')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✕ Close
              </button>
            </div>
            <DataExporter />
          </div>
        </div>
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