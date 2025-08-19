import React, { useState } from 'react';
import './Instructions.css';

const Instructions = ({ onStart, onPractice, currentPage = 0, setCurrentPage }) => {
  // Use props for page state if provided, otherwise use local state
  const [localPage, setLocalPage] = useState(0);
  const activePage = currentPage !== undefined ? currentPage : localPage;
  const setActivePage = setCurrentPage || setLocalPage;

  const pages = [
    {
      title: "Game Overview",
      content: (
        <div className="instructions-content">
          <h2>Welcome to the Global Invigoration Study!</h2>
          <p>
            You will play a game with <strong>two tasks</strong>. 
            Your goal is to earn as many points as possible by following the on-screen instructions.
          </p>
          <div className="phase-overview">
            <div className="phase-item">
              <h3>Task 1: Movement Task</h3>
              <p>Move your cursor between bars at a steady pace</p>
            </div>
            <div className="phase-item">
              <h3>Task 2: Reward Collection</h3>
              <p>Press the keys in the sequence to collect your reward</p>
            </div>
          </div>
          <p>Let's learn about each task in detail...</p>
        </div>
      )
    },
    {
      title: "Task 1: Movement Task",
      content: (
        <div className="instructions-content">
          <h2>Movement Task Details</h2>
          <div className="phase-visual">
            <div className="visual-description">
              <h3>What you'll see:</h3>
              <ul>
                <li><strong>Blue bars</strong> on the left and right sides of the screen</li>
                <li>Your <strong>score</strong> will be displayed in the top right corner</li>
              </ul>
            </div>
          </div>
          <h3>What to do:</h3>
          <ul>
            <li><strong>Move your cursor</strong> back and forth between the bars at a steady pace</li>
            <li>The bars will turn <strong>green</strong> when you hover over them</li>
            <li>Keep moving at a steady pace - don't stay on one side too long!</li>
            <li>If you move too slowly, you'll see a <strong>"Move Faster!"</strong> warning</li>
          </ul>
        </div>
      )
    },
    {
      title: "Task 2: Reward Collection",
      content: (
        <div className="instructions-content">
          <h2>Reward Collection Details</h2>
          <div className="phase-visual">
            <div className="visual-description">
              <h3>What happens:</h3>
              <ul>
                <li>After an unknown amount of time, the <strong>bars disappear</strong></li>
                <li>After some time, you may be given the option to collect a reward</li>
                <li>You will need to collect your reward</li>
              </ul>
            </div>
          </div>
          <h3>What to do:</h3>
          <ul>
            <li>Follow the <strong>key sequence</strong> displayed on screen to collect the reward</li>
            <li>Press the keys <strong>A, S, D, F</strong> in the exact order shown</li>
            <li>Watch as your progress is displayed with the sequence</li>
            <li>Complete the entire sequence to receive your reward</li>
          </ul>
        </div>
      )
    },
    {
      title: "Ready to Start?",
      content: (
        <div className="instructions-content">
          <h2>You're Ready to Start!</h2>
          <p>
            You now know everything you need to participate in the study. 
            Remember: move between the bars, then collect the reward by following the key sequence.
          </p>
          
          <div className="final-reminder">
            <h3>Quick Reminder:</h3>
            <ol>
              <li><strong>Task 1:</strong> Move cursor between blue bars</li>
              <li><strong>Task 2:</strong> Follow the key sequence to collect the reward</li>
            </ol>
          </div>
        </div>
      )
    }
  ];

  const nextPage = () => {
    if (activePage < pages.length - 1) {
      setActivePage(activePage + 1);
    }
  };

  const prevPage = () => {
    if (activePage > 0) {
      setActivePage(activePage - 1);
    }
  };

  const isLastPage = activePage === pages.length - 1;
  const isFirstPage = activePage === 0;

  return (
    <div className="instructions-container">
      <div className="instructions">
        <h1>{pages[activePage].title}</h1>
        
        <div className="page-indicator">
          Page {activePage + 1} of {pages.length}
        </div>

        {pages[activePage].content}

        <div className="navigation-container">
          {!isLastPage && (
            <div className="page-navigation">
              <button 
                onClick={prevPage} 
                className="nav-button prev-button"
                disabled={isFirstPage}
              >
                ← Previous
              </button>
              <button 
                onClick={nextPage} 
                className="nav-button next-button"
              >
                Next →
              </button>
            </div>
          )}

          {isLastPage && (
            <div className="button-container">
              <button onClick={prevPage} className="nav-button prev-button">
                ← Previous
              </button>
              <button onClick={onPractice} className="practice-button">
                Practice
              </button>
              <button onClick={onStart} className="start-button">
                Start Game 
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Instructions;
