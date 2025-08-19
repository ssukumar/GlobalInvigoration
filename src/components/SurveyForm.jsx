import React, { useState } from 'react';
import './SurveyForm.css';

function SurveyForm({onSubmit}) {

  const [formData, setFormData] = useState({
    workerId: '',
    name: '',
    age: '',
    gender: '',
    handedness: '',
    mouseDpi: '',
    repeat: '',
    ethnicity: '',
    race: '',
  })

  const handleInputChange = (event) => {
    const { name, value} = event.target;
    setFormData(prevFormData => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      // Do not write to Firebase here. Let App.jsx call initializeParticipant.
      onSubmit(formData);
    } catch (error) {
      console.error('Error handling form submission:', error);
    }
  };

  return (
    <div className="survey-container">
      <h1>Participant Information</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Worker ID: </label>
          <input type="text" required name="workerId" value={formData.workerId} onChange={handleInputChange} />
        </div>
        <div>
          <label>Name: </label>
          <input type="text" required name="name" value={formData.name} onChange={handleInputChange} />
        </div>
        <div>
          <label>Age: </label>
          <input type="number" required name="age" value={formData.age} onChange={handleInputChange} />
        </div>
        <div>
          <label>Gender: </label>
          <select required name="gender" value={formData.gender} onChange={handleInputChange}>
            <option value="">Select an option</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label>Handedness: </label>
          <select required name="handedness" value={formData.handedness} onChange={handleInputChange}>
            <option value="">Select an option</option>
            <option value="right">Right Handed</option>
            <option value="left">Left Handed</option>
          </select>
        </div>
        <div>
          <label>Mouse DPI (optional): </label>
          <input type="number" name="mouseDpi" value={formData.mouseDpi} onChange={handleInputChange} placeholder="e.g., 800, 1200, 1600" />
        </div>
        <div>
          <label>Have you done our experiments before? </label>
            <select required name="repeat" value={formData.repeat} onChange={handleInputChange}>
              <option value="">Select an option</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="idk">I don't remember</option>
            </select>
        </div>

        <h2>Optional Information</h2>
        <div>
          <label>Ethnicity: </label>
          <select name="ethnicity" value={formData.ethnicity} onChange={handleInputChange}>
            <option value="">Select an option</option>
            <option value="hispanic">Hispanic/Latinx</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
        <label>Race: </label>
        <select name="race" value={formData.race} onChange={handleInputChange}>
            <option value="">Select an option</option>
            <option value="white">White</option>
            <option value="black">Black</option>
            <option value="asian">Asian</option>
            <option value="native">Native American</option>
            <option value="other">Other</option>
          </select>
        </div>
        <button type="submit" className="submit-button">
          Submit
        </button>
      </form>
    
    </div>
  );
};

export default SurveyForm; 