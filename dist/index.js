/*
This current experiment is a classic visuomotor rotation reaching experiment, but can easily be adapted into variations of different reaching experiments depending on the target file.
Currently supported experiments include:
- VMR
- Clamp
- Target-jump experiments
Remember to update necessary fields before starting the game. All fields that require change will be marked by a "**TODO**" comment.
*/

// Set to 'true' if you wish to only test the front-end (will not access databases)
// **TODO** Make sure this is set to false before deploying!
const noSave = true;


var fileName;

/* TEMPORARY USE OF ORIGINAL CODE TO TEST THINGS OUT */
try {
    let app = firebase.app();
} catch (e) {
    console.error(e);
}

// Setting up firebase variables
const firestore = firebase.firestore(); // (a.k.a.) db
const firebasestorage = firebase.storage();
const subjectcollection = firestore.collection("Subjects");
const trialcollection = firestore.collection("Trials");

// Function to switch between HTML pages
function show(shown, hidden) {
    document.getElementById(shown).style.display = 'block';
    document.getElementById(hidden).style.display = 'none';
    return false;
}

// Function to save the dpi
function saveDPI() {
    if (noSave) {
        show('container-instructions2', 'container-dpi')
        return false;
    }
    var values = $("#dpiform").serializeArray();
    var dpi = values[0].value;
    dpi = +dpi;
    if (!dpi) {
        alert("Please input a valid number!");
        return;
    }
    subject.dpi = dpi;
    show('container-instructions2', 'container-dpi')
    return false;
}

// Close window (function no longer in use for this version)
function onexit() {
    window.close();
}

// Function used to enter full screen mode
function openFullScreen() {
    elem = document.getElementById('container-info');
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
        console.log("enter1")
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
        console.log("enter2")
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
        console.log("enter3")
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
        console.log("enter4")
    }
}

// Function used to exit full screen mode
function closeFullScreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

// Object used track subject data (uploaded to database)
var subject = {
    id: null,
    age: null,
    sex: null,
    handedness: null,
    mousetype: null,
    returner: null,
    currTrial: 0,
    tgt_file: null,
    ethnicity: null,
    race: null,
    comments: null,
    distractions: [],
    distracto: null,
    dpi: null
}

// Object used to track reaching data (updated every reach and uploaded to database)
var subjTrials = {
    id: null,
    experimentID: null,
    trialNum: [],
    currentDate: [],
    target_angle: [],
    trial_type: [],
    rotation: [],
    hand_fb_angle: [],
    rt: [],
    mt: [],
    search_time: [],
    reach_feedback: [],
    group_type: null
}

// Function used to check if all questions were filled in info form, if so, starts the experiment 
function checkInfo() {
    var actualCode = "rice"; // **TODO: Update depending on the "code" set in index.html
    var values = $("#infoform").serializeArray();
    subject.id = values[0].value;
    subject.age = values[1].value;
    subject.sex = values[2].value;
    subject.handedness = values[3].value;
    subject.mousetype = values[4].value;
    subject.returner = values[5].value;
    var code = values[6].value;
    subject.ethnicity = values[7].value;
    subject.race = values[8].value;
    if (noSave) {
        show('container-exp', 'container-info');
        openFullScreen();
        startGame();
        return;
    }
    console.log(subject.id);
    console.log(subject.handedness);
    console.log(values)
    if (!subject.id || !subject.age || !subject.sex || !subject.handedness || !subject.mousetype) {
        alert("Please fill out your basic information!");
        return;
    } else if (actualCode.localeCompare(code) != 0) {
        alert("Make sure to find the code from the last page before proceeding!")
        return;
    } else {
        show('container-exp', 'container-info');
        createSubject(subjectcollection, subject);
        openFullScreen();
        startGame();
    }
}

// Function used to create/update subject data in the database
function createSubject(collection, subject) {
    if (noSave) {
        return null;
    }
    return collection.doc(subject.id).set(subject)
        .then(function() {
            console.log(subject);
            return true;
        })
        .catch(function(err) {
            console.error(err);
            throw err;
        });
}

// Function used to upload reach data in the database
function recordTrialSubj(collection, subjTrials) {
    if (noSave) {
        return null;
    }
    return collection.doc(subjTrials.id).set(subjTrials)
        .then(function() {
            return true;
        })
        .catch(function(err) {
            console.error(err);
            throw err;
        });
}

// Variables used throughout the experiment
var svgContainer;
var screen_height;
var screen_width;
var elem;
var experiment_ID;
var subject_ID;
var target_dist;
var trial_type;
var start_x;
var start_y;
var start_radius;
var start_color;
var target_x;
var target_y;
var target_radius;
var target_color;
var hand_x;
var hand_y;
var hand_fb_x;
var hand_fb_y;
var r;
var cursor_x;
var cursor_y;
var cursor_radius;
var cursor_color;
var messages;
var line_size;
var message_size;
var counter; // current reach count (starts at 1)
var target_file_data;
var rotation;
var target_angle;
var online_fb;
var endpt_fb;
var clamped_fb;
var between_blocks;
var trial; // trial count (starts at 0)
var num_trials;
var search_tolerance;
var hand_angle;
var hand_fb_angle;
var rt;
var mt;
var search_time;
var feedback_time;
var feedback_time_slow;
var if_slow;
var hold_time;
var hold_timer;
var fb_timer;
var begin;
var timing;
var SEARCHING;
var HOLDING;
var SHOW_TARGETS;
var MOVING;
var FEEDBACK;
var BETWEEN_BLOCKS;
var game_phase = BETWEEN_BLOCKS;
var reach_feedback;
var bb_counter;
var target_invisible;
var cursor_show;

// Variables to track screen size
var prev_height;
var prev_width;

// Function that sets up the game 
// All game functions are defined within this main function, treat as "main"
function gameSetup(data) {
    /*********************
     * Browser Settings  *
     *********************/

    // Initializations to make the screen full size and black background
    $('html').css('height', '98%');
    $('html').css('width', '100%');
    $('html').css('background-color', 'black')
    $('body').css('background-color', 'black')
    $('body').css('height', '98%');
    $('body').css('width', '100%');

    // Hide the mouse from view 
    $('html').css('cursor', 'none');
    $('body').css('cursor', 'none');

    // SVG container from D3.js to hold drawn items
    svgContainer = d3.select("body").append("svg")
        .attr("width", "100%")
        .attr("height", "100%").attr('fill', 'black')
        .attr('id', 'stage')
        .attr('background-color', 'black');

    // Getting the screen resolution
    screen_height = window.screen.availHeight;
    screen_width = window.screen.availWidth;
    prev_height = screen_height;
    prev_width = screen_width;

    // Experiment parameters
    experiment_ID = "click_speed_study"; // Updated for your study
    subject_ID = Math.floor(Math.random() * 10000000000);

    /***************************
     * Game State Variables    *
     ***************************/
    
    // Game state
    let gameState = {
        score: 0,
        coinClicks: 0,
        lastClickTime: 0,
        lastClickPosition: { x: 0, y: 0 },
        coinVisible: false,
        coinPosition: { x: 0, y: 0 },
        lastCircleClicked: null
    };

    // Circle properties
    const circleRadius = Math.round(screen_height * 0.05); // 5% of screen height
    const circleDistance = Math.round(screen_height * 0.2); // 20% of screen height between circles
    
    // Calculate circle positions
    const circle1Position = {
        x: screen_width / 2 - circleDistance,
        y: screen_height / 2
    };
    
    const circle2Position = {
        x: screen_width / 2 + circleDistance,
        y: screen_height / 2
    };

    // Create the two circles
    svgContainer.append('circle')
        .attr('cx', circle1Position.x)
        .attr('cy', circle1Position.y)
        .attr('r', circleRadius)
        .attr('fill', 'blue')
        .attr('id', 'circle1')
        .attr('class', 'game-circle');

    svgContainer.append('circle')
        .attr('cx', circle2Position.x)
        .attr('cy', circle2Position.y)
        .attr('r', circleRadius)
        .attr('fill', 'blue')
        .attr('id', 'circle2')
        .attr('class', 'game-circle');

    // Create coin (initially hidden)
    svgContainer.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', circleRadius * 0.8)
        .attr('fill', 'gold')
        .attr('id', 'coin')
        .attr('display', 'none');

    // Create score display
    svgContainer.append('text')
        .attr('x', 20)
        .attr('y', 40)
        .attr('fill', 'white')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '24px')
        .attr('id', 'score-display')
        .text('Score: 0');

    // Create timer display
    svgContainer.append('text')
        .attr('x', screen_width - 150)
        .attr('y', 40)
        .attr('fill', 'white')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '24px')
        .attr('id', 'timer-display')
        .text('Time: 0s');

    // Store game state in window object for access by other functions
    window.gameState = gameState;
    window.circleRadius = circleRadius;
    window.circle1Position = circle1Position;
    window.circle2Position = circle2Position;

    // Initialize click tracking for data collection
    window.clickData = {
        timestamps: [],
        positions: [],
        speeds: [],
        distances: []
    };

    // Start the game loop
    startGameLoop();
}

// Function used to start running the game
// **TODO** Update the 'fileName' to path to targetfile
function startGame() {
    fileName = "tgt_files/testShort.json";
    subject.tgt_file = fileName;
    subjTrials.group_type = "null"; // **TODO** update group_type to manage the groups
    $.getJSON(fileName, function(json) {
        target_file_data = json;
        gameSetup(target_file_data);
    });
}

// Helper function to end the game regardless good or bad
function helpEnd() {
    closeFullScreen();
    $('html').css('cursor', 'auto');
    $('body').css('cursor', 'auto');
    $('body').css('background-color', 'white');
    $('html').css('background-color', 'white');

    d3.select('#start').attr('display', 'none');
    d3.select('#target').attr('display', 'none');
    d3.select('#cursor').attr('display', 'none');
    d3.select('#message-line-1').attr('display', 'none');
    d3.select('#message-line-2').attr('display', 'none');
    d3.select('#message-line-3').attr('display', 'none');
    d3.select('#message-line-4').attr('display', 'none');
    d3.select('#too_slow_message').attr('display', 'none');
    d3.select('#search_too_slow').attr('display', 'none');
    d3.select('#countdown').attr('display', 'none');
    d3.select('#trialcount').attr('display', 'none');

    recordTrialSubj(trialcollection, subjTrials);
}
// Function that allows for the premature end of a game
function badGame() {
    helpEnd();
    show('container-failed', 'container-exp');
}

// Function that ends the game appropriately after the experiment has been completed
function endGame() {
    helpEnd();
    show('container-not-an-ad', 'container-exp');

}

// Function used to save the feedback from the final HTML page
function saveFeedback() {
    var values = $("#feedbackForm").serializeArray();
    if (values[0].value != "") {
        subject.comments = values[0].value;
    }
    values = $("#distractionForm").serializeArray();
    var i;
    for (i = 0; i < values.length; i++) {
        subject.distractions.push(values[i].value);
        if (values[i].value == "other") {
            subject.distracto = values[i + 1].value;
            break;
        }
    }

    createSubject(subjectcollection, subject);
    show('final-page', 'container-not-an-ad');
}

document.addEventListener('DOMContentLoaded', function() {
    // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
    // // The Firebase SDK is initialized and available here!
    //
    // firebase.auth().onAuthStateChanged(user => { });
    // firebase.database().ref('/path/to/ref').on('value', snapshot => { });
    // firebase.messaging().requestPermission().then(() => { });
    // firebase.storage().ref('/path/to/ref').getDownloadURL().then(() => { });
    //
    // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥��🔥🔥🔥🔥🔥🔥


});