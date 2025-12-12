import React from 'react';
import './ConsentForm.css';

const ConsentForm = ({ onConsent, onDecline }) => {
  return (
    <div className="consent-container">
      <h1><b><u>Welcome</u></b></h1>
      <h2>but first, we need your consent to proceed...</h2>
      <hr />
      <div className="legal well">
        <p>
          We would like to invite you to take part in the following study named "Swipe and Type Study"
        </p>
        <p>
          This will take approximately 50 minutes, and you will be compensated $20 upon completion.
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