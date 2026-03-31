import React from 'react';
import './ConsentForm.css';

const ConsentForm = ({ onConsent, onDecline }) => {
  return (
    <div className="consent-container">
      <h1><b><u>Welcome to the "Swipe and Type" Study</u></b></h1>
      <h2>but first, we need your consent to proceed...</h2>
      <hr />
      <div className="legal well">
        <p>
         
        </p>
        <p>
          This will take approximately 45 minutes<br />
          <br />
          You will be compensated a base pay of $15.<br /> 
          Additional monetary compensation (up to a total compensation of $20) is determined by total points earned.
          <br />
          <br />
          Please understand that we <em>reserve the right to not compensate entries</em> that fail to follow instructions.
        </p>
        <div className="consent-form">
          <iframe 
            frameBorder="1" 
            src="https://drive.google.com/file/d/1_jkO8vZMrpOrZMgEhpZuFgGcBjGE72Yg/preview"
            title="Consent Form"
          />
        </div>
      </div>

      <h4>If you agree and consent to these terms, please click "I Agree" to continue.</h4>
      <div className="button-container">
        <button 
          className="btn btn-danger"
          onClick={onDecline}
        >
          I do NOT consent
        </button>
        <button 
          className="btn btn-primary"
          onClick={onConsent}
        >
          I Agree
        </button>
      </div>
    </div>
  );
};

export default ConsentForm; 