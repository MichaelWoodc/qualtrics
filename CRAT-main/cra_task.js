// Initialize jsPsych
const jsPsych = initJsPsych({
    display_element: 'jspsych-target',
    on_finish: async function() {
        // Add subject before saving
        jsPsych.data.get().addToLast({ participant: sbj_id });

        try {
            await save_data_json();
            await save_data_csv();
            console.log("Data saved");
        } catch (err) {
            console.error("Save error:", err);
        }
        
        // Send completion message to Qualtrics parent window
        if (window.parent && window.parent !== window) {
            window.parent.postMessage("CRAT_FINISHED", "*");
            console.log("Sent CRAT_FINISHED message to Qualtrics");
        }
    }
});

// ===========================================================
// SAVE DATA TO YOURSERVER
// ===========================================================

// Get participant ID from URL parameters (passed from Qualtrics)
const urlParams = new URLSearchParams(window.location.search);
const sbj_id = urlParams.get("sbj_id") 
    || urlParams.get("workerId") 
    || urlParams.get("PROLIFIC_PID") 
    || "anon_" + Math.floor(Math.random() * 100000);

// Your PHP endpoint
const save_url = "https://michaelwoodcock.duckdns.org/exp_data/save_data.php";

// Server directory where files go (e.g. /exp_data/CRAT_task/)
const data_dir = "CRAT_task";

// Final filenames
const file_json = `${sbj_id}.json`;
const file_csv = `${sbj_id}.csv`;

// Save JSON
function save_data_json() {
    return jQuery.ajax({
        type: "POST",
        url: save_url,
        data: {
            data_dir: data_dir,
            file_name: file_json,
            exp_data: jsPsych.data.get().json()
        }
    });
}

// Save CSV
function save_data_csv() {
    return jQuery.ajax({
        type: "POST",
        url: save_url,
        data: {
            data_dir: data_dir,
            file_name: file_csv,
            exp_data: jsPsych.data.get().csv()
        }
    });
}

// Function to load JSON data
async function loadProblems() {
    try {
        const response = await fetch('cra_problems.json');
        if (!response.ok) {
            throw new Error('Failed to load problems file');
        }
        const data = await response.json();
        
        // Return all problems as test (no practice)
        return data.problems;
        
    } catch (error) {
        console.error('Error loading problems:', error);
        // Return some default test problems if file fails to load
        return [
            {
                "words": ["age", "mile", "sand"],
                "solutions": ["stone"],
                "regex": ["stone"]
            },
            {
                "words": ["apple", "family", "house"],
                "solutions": ["tree"],
                "regex": ["tree"]
            }
        ];
    }
}

// Custom progress bar HTML
const progressBarHTML = `
    <div class="progress-container" style="width: 100%; height: 20px; border-radius: 10px; margin: 20px 0;">
        <div id="progress-bar" class="progress-bar" style="height: 100%; width: 100%; background-color: #4CAF50; border-radius: 10px; transition: width 0.1s linear;"></div>
    </div>
    <div id="time-remaining" style="text-align: center; font-size: 16px; margin-bottom: 20px;">15.0s remaining</div>
`;

// Function to update progress bar
function updateProgressBar(timeLeft, totalTime) {
    const progressBar = document.getElementById('progress-bar');
    const timeRemaining = document.getElementById('time-remaining');
    if (progressBar && timeRemaining) {
        const percentage = (timeLeft / totalTime) * 100;
        progressBar.style.width = `${percentage}%`;
        progressBar.style.backgroundColor = percentage > 50 ? '#4CAF50' : percentage > 20 ? '#FFC107' : '#F44336';
        timeRemaining.textContent = `${timeLeft.toFixed(1)}s remaining`;
    }
}

// Fixation cross
const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div class="fixation"> <br> + <br><br><br><br><br></div>',
    choices: "NO_KEYS",
    trial_duration: 800
};

// Function to create CRA trial
function createCRATrial(problem, problemIndex, totalProblems) {
    let showAnswerScreen = false;
    let firstKey = ""; // store the first key pressed

    // Word presentation trial
    const trial = {
        timeline: [
            { ...fixation },
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: function() {
                    return `
                        <div class="cra-container">
                            <div class="problem-counter">Problem ${problemIndex + 1} of ${totalProblems}</div>
                            <div class="cra-words" id="cra-words">${problem.words.join("<br>")}</div>
                            ${progressBarHTML}
                        </div>
                    `;
                },
                choices: "ALL_KEYS",
                trial_duration: 15000,
                data: {
                    words: problem.words,
                    solutions: problem.solutions,
                    regex: problem.regex,
                    phase: 'test',
                    problem_number: problemIndex + 1
                },
                on_start: function(trial) {
                    showAnswerScreen = false;
                    let timeLeft = 15.0;
                    this.timerInterval = setInterval(() => {
                        timeLeft -= 0.1;
                        updateProgressBar(timeLeft, 15);
                        if (timeLeft <= 0) clearInterval(this.timerInterval);
                    }, 100);
                },
                on_finish: function(data) {
                    clearInterval(this.timerInterval);

                    if (data.response !== null && data.response !== undefined) {
                        showAnswerScreen = true;

                        // Convert to character if possible
                        let keyChar = "";
                        try {
                            if (jsPsych?.pluginAPI?.convertKeyCodeToKeyCharacter) {
                                keyChar = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(data.response) || "";
                            } else {
                                keyChar = String(data.response) || "";
                            }
                        } catch (e) {
                            keyChar = String(data.response) || "";
                        }

                        // Only keep printable single characters (letters, numbers, punctuation)
                        if (keyChar.length === 1 && keyChar.match(/^[\w\d\p{P}]$/u)) {
                            firstKey = keyChar;
                        } else {
                            firstKey = ""; // ignore non-text keys like Shift, Enter
                        }

                        console.log("First key captured:", keyChar, "Stored:", firstKey);
                    }

                    data.solved = showAnswerScreen;
                    data.rt = data.rt || 15000;
                    data.timed_out = !showAnswerScreen;
                    data.correct = false;
                }
            }
        ]
    };

    // Answer input screen
    const answerScreen = {
        type: jsPsychSurveyText,
        questions: [{
            prompt: function() {
                return `
                    <div style="text-align: center;">
                        <p>Please enter your solution:</p>
                        ${progressBarHTML}
                    </div>
                `;
            },
            placeholder: "Type your answer...",
            name: "Q0"
        }],
        trial_duration: 7000,
        data: {
            phase: 'test',
            problem_number: problemIndex + 1
        },
        on_load: function() {
            const input = document.querySelector('input[type="text"]');
            if (input) {
                if (firstKey) {
                    input.value = firstKey;
                    input.setSelectionRange(input.value.length, input.value.length);
                }
                input.focus();
            }
            console.log("Prefilled input value:", firstKey);
        },
        on_start: function(trial) {
            let timeLeft = 7.0;
            this.timerInterval = setInterval(() => {
                timeLeft -= 0.1;
                updateProgressBar(timeLeft, 7);
                if (timeLeft <= 0 && !this.timeout) {
                    this.timeout = true;
                    
                    // CAPTURE INPUT VALUE BEFORE TIMEOUT
                    const input = document.querySelector('input[type="text"]');
                    const currentInput = input ? input.value.trim() : "";
                    trial.data.current_input = currentInput; // Store what was in the box
                    
                    jsPsych.finishTrial();
                }
            }, 100);

            const prev = jsPsych.data.get().last(1).values()[0];
            trial.data.words = prev.words;
            trial.data.solutions = prev.solutions;
            trial.data.regex = prev.regex;
        },
        on_finish: function(data) {
            clearInterval(this.timerInterval);

            const regexPatterns = jsPsych.data.get().last(1).values()[0].regex;
            let responseText;

            if (this.timeout) {
                data.timed_out = true;
                // Use captured input instead of empty string
                responseText = (data.current_input || "").trim();
                data.response = { Q0: responseText };
            } else {
                data.timed_out = false;
                responseText = (data.response?.Q0 ?? "").trim();
            }

            // Grade both timeout and non-timeout answers the same way
            data.correct = regexPatterns.some(pattern =>
                new RegExp(`^${pattern}$`, 'i').test(responseText)
            );

            // Mark whether participant actually typed something
            data.solved = responseText.length > 0;
        }

    };

    return {
        timeline: [
            { timeline: trial.timeline },
            { timeline: [answerScreen], conditional_function: () => showAnswerScreen }
        ]
    };
}

// Main experiment function
async function runExperiment() {
    try {
        // Load problems from JSON file
        const problems = await loadProblems();
        
        // Create timeline - no start screen, just the trials
        const timeline = [];

        // Add all problems as test trials
        problems.forEach((problem, index) => {
            timeline.push(createCRATrial(problem, index, problems.length));
        });

        // Start the experiment
        jsPsych.run(timeline);
        
    } catch (error) {
        console.error('Experiment failed to start:', error);
        document.getElementById('jspsych-target').innerHTML = `
            <div class="jspsych-content" style="color: red;">
                <h1>Error Loading Experiment</h1>
                <p>${error.message}</p>
                <p>Please try refreshing the page.</p>
            </div>
        `;
        
        // Even on error, send completion message to Qualtrics
        if (window.parent && window.parent !== window) {
            window.parent.postMessage("CRAT_FINISHED", "*");
        }
    }
}

// Start the experiment
runExperiment();