import React, { useState } from 'react';
import './Instructions.css';

const Instructions = ({ onStart, onPractice, currentPage = 0, setCurrentPage }) => {
  // Use props for page state if provided, otherwise use local state
  const [localPage, setLocalPage] = useState(0);
  const activePage = currentPage !== undefined ? currentPage : localPage;
  const setActivePage = setCurrentPage || setLocalPage;

  const pages = [
    {
      title: "Welcome to the Swipe-and-Type Study!",
      content: (
        <div className="instructions-content">
          <h2>Game Overview </h2>
          <p>
            In this game you will help a character move forward by taking alternating left and right steps.
            To make a step you will swipe your cursor left and right between two bars on the sides of the screen.
            Occasionally you will be given an opportunity to collect a reward by typing a short key sequence.
          </p>
          {/* <div className="phase-overview">
            <div className="phase-item">
              <h3>Movement Task</h3>
              <p>Swipe left and right between the two bars to take steps and move forward.</p>
            </div>
            <div className="phase-item">
              <h3>Reward Collection</h3>
              <p>When a reward appears, type the shown key sequence exactly to collect it.</p>
            </div>
          </div> */}
          {/* <p>Read on for a short story and exact instructions so you know what to do.</p> */}
        </div>
      )
    },
    {
      title: "Swiping to Move Forward",
      content: (
        <div className="instructions-content">
          <h2>Help the explorer take steps to move forward</h2>
          <p>
            Imagine you are guiding an explorer walking on a road. Each time the explorer takes a left step and a right step,
            they move one step forward. To make a left step, swipe your cursor to the left bar; to make a right step, swipe to the right bar.
            Make sure to alternate these swipes makes the explorer advance. 
          </p>
          <h3>How your swipes map to steps</h3>
          <ul>
            <li>Swipe to the <strong>left bar</strong> to take a left step.</li>
            <li>Swipe to the <strong>right bar</strong> to take a right step.</li>
            <li>Left then right (or right then left) counts as forward movement.</li>
          </ul>
          <h3>Remember</h3>
          <ul>
            <li>Keep moving back and forth at a steady pace; do not stop or stay on one side for too long.</li>
            <li>If you slow down too much, a <strong>Move Faster!</strong> warning will appear.</li>
            <li>You have to swipe all the way to the bar to register a step; the bar will disappear once reached.</li>
          </ul>
          {/* <div className="screenshot-placeholder" role="img" aria-label="Instruction screenshot placeholder">
            <img src="/images/instruction-movement.svg" alt="Movement example" className="instruction-screenshot" />
          </div> */}
          <div className="screenshot-placeholder" role="img" aria-label="Movement video">
            <video className="instruction-screenshot" controls width="100%">
              <source src="/videos/movement-demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )
    },
    {
      title: "Opportunities to Collect Rewards",
      content: (
        <div className="instructions-content">
          <h2>When Rewards Appear</h2>
          <p>
            Once you have started moving, after a delay, a small cue and a countdown will tell you
            a reward is coming. You will be cued regarding the value of the reward once it's imminent. 
            When the reward is ready to be collected, a short key sequence will be shown.
          </p>
          <h3>How to collect a reward</h3>
          <ol>
            <li>Watch the screen for the key sequence (letters will appear like: <strong>A S D F</strong>).</li>
            <li>Type the keys in the exact order shown, using the keys <strong>A, S, D, F</strong>.</li>
            <li>If you complete the full sequence correctly, you receive the reward (points)</li>
          </ol>
          <p>
            The reward counts toward your score. Practice keeping a steady movement so you can be ready when a reward appears.
          </p>
          {/* <div className="screenshot-placeholder" role="img" aria-label="Reward screenshot placeholder">
            <img src="/images/reward-screenshot.svg" alt="Reward example" className="instruction-screenshot" />
          </div> */}
          <div className="screenshot-placeholder" role="img" aria-label="Reward video">
            <video className="instruction-screenshot" controls width="100%">
              <source src="/videos/reward-demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )
    },
    {
      title: "Ready to Begin?",
      content: (
        <div className="instructions-content">
          <h2>In summary...</h2>
          <p>
            Swipe left and right between the bars to take alternating steps and move the explorer forward.
            When a reward appears, type the displayed key sequence exactly to collect it.
          </p>
          <div className="final-reminder">
            <h3>Quick Checklist</h3>
            <ol>
              <li>Keep swiping between the left and right bars at a steady pace.</li>
              <li>When a reward cue appears, type the shown key sequence (A, S, D, F) in order.</li>
              <li>Complete the practice round if available to get comfortable with movement and typing.</li>
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
