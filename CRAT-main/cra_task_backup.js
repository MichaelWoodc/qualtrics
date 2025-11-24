// Initialize jsPsych
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

        showDownloadScreen();
    }
});

// ===========================================================
// SAVE DATA TO YOUR SERVER (Using fetch, no jQuery required)
// ===========================================================

// Get participant ID from Qualtrics (PROLIFIC_PID, workerId, etc.)
const urlParams = new URLSearchParams(window.location.search);
const sbj_id = urlParams.get("workerId") 
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
async function save_data_json() {
    const body = new URLSearchParams({
        data_dir: data_dir,
        file_name: file_json,
        exp_data: jsPsych.data.get().json()
    });
    const response = await fetch(save_url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
    });
    if (!response.ok) throw new Error(`Failed to save JSON: ${response.statusText}`);
}

// Save CSV
async function save_data_csv() {
    const body = new URLSearchParams({
        data_dir: data_dir,
        file_name: file_csv,
        exp_data: jsPsych.data.get().csv()
    });
    const response = await fetch(save_url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
    });
    if (!response.ok) throw new Error(`Failed to save CSV: ${response.statusText}`);
}

// -----------------------------------------------------------
// (Rest of your experiment code remains mostly unchanged)
// -----------------------------------------------------------

// Function to load JSON data
async function loadProblems() {
    try {
        const response = await fetch('cra_problems.json');
        if (!response.ok) throw new Error('Failed to load problems file');
        const data = await response.json();
        return {
            practice: data.problems.slice(0, 2),
            test: data.problems.slice(2)
        };
    } catch (error) {
        console.error('Error loading problems:', error);
        return {
            practice: [{ "words": ["coin", "quick", "spoon"], "solutions": ["silver", "silver dollar"], "regex": ["silver( dollar)?", "silverdollar"] }],
            test: [{ "words": ["age", "mile", "sand"], "solutions": ["stone"], "regex": ["stone"] }]
        };
    }
}

// Function to show download screen with SPSS-compatible CSV
function showDownloadScreen() {
    const data = jsPsych.data.get().values();
    const csvData = convertToSPSS(data);
    const blob = new Blob([csvData], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    
    document.getElementById('jspsych-target').innerHTML = `
        <div class="jspsych-content" style="text-align: center;">
            <h1>Experiment Complete</h1>
            <p>Thank you for participating!</p>
            <p>Your SPSS-compatible data is ready to download.</p>
            <a id="download-btn" href="${url}" download="cra_task_data.csv" 
               style="display: inline-block; padding: 15px 30px; background-color: #4CAF50; 
               color: white; text-decoration: none; border-radius: 5px; font-size: 18px; margin: 20px 0;">
               Download Data (CSV for SPSS)
            </a>
        </div>
    `;
}

// Function to convert to SPSS-compatible CSV
function convertToSPSS(data) {
    const flattened = [];
    
    data.forEach(trial => {
        if (trial.phase) {
            const row = {
                phase: trial.phase,
                problem_number: trial.problem_number,
                words: trial.words ? trial.words.join('|') : '',
                solutions: trial.solutions ? trial.solutions.join('|') : '',
                solved: trial.solved ? 1 : 0,
                rt: trial.rt || '',
                timed_out: trial.timed_out ? 1 : 0,
                response: trial.response?.Q0 || '',
                correct: trial.correct ? 1 : 0
            };
            
            flattened.push(row);
        }
    });
    
    const headers = Object.keys(flattened[0]);
    let csv = headers.join(',') + '\n';
    
    flattened.forEach(row => {
        csv += headers.map(header => {
            let value = row[header] !== undefined ? row[header] : '';
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',') + '\n';
    });
    
    return csv;
}

// Custom progress bar HTML
const progressBarHTML = `
    <div class="progress-container" style="width: 100%; height: 20px; background-color: #f1f1f1; border-radius: 10px; margin: 20px 0;">
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

// Instructions
const instructions = {
    type: jsPsychInstructions,
    pages: [
        `<div class="jspsych-content">
            <h2>Welcome to the CRA Task</h2>
            <p>In this task, you will be presented with a set of three words. Your goal is to generate a fourth
word that forms a common compound word or phrase with each of the three stimulus words.</p>
<br>

<p>Here's how it works:</p>
<ul>
<li>You will first see a fixation cross (+) at the top center of the screen. Please briefly focus
your eyes on it.</li>
<li>Immediately after, three stimulus words will appear on the screen for 15 seconds (e.g.,
pine, crab, sauce).</li>
<li>During this time, try to think of a word that connects to all three (e.g., apple → pineapple,
crabapple, applesauce).</li>
<li>When you are ready, press the spacebar or click the "I got it" button to enter your
response.</li>
<li>You will have 7 seconds to type your answer.</li>
<li>If you do not type anything within the 7-second response window, the program will
automatically advance to the next item.</li>
</ul>
<br>
<p>
You will begin with three practice trials to help you become familiar with the format. After the
practice, the actual test will begin.<br> <br>
When you are ready, click NEXT to continue.
</p>

        </div>`,
        
        `<div class="jspsych-content">
            <h2>Task Procedure</h2>
            <ol>
                <li>Briefly fixate on the cross (+) that appears at the center of the screen.</li>
                <li>Three stimulus words will appear (e.g., pine, crab, sauce) for 15 seconds.</li>
                <li>When ready, press the spacebar or click "I got it" to type your solution word.</li>
                <li>You will have 7 seconds to type your response (e.g., apple).</li>
                <li>Press Enter or click "Continue" to move to the next item.</li>
                <li>If no response is entered, the task will automatically proceed after the 7-second input
window.</li>
            </ol>
<p>Click Next to begin the practice trials</p>
        </div>`,
    ],
    button_label_next: "Next",
    button_label_previous: "Back",
    show_clickable_nav: true,
    on_load: function() {
        updateProgressBar(15, 15);
    }
};

// Fixation cross
const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div class="fixation"> <br> + <br><br><br><br><br></div>',
    choices: "NO_KEYS",
    trial_duration: 800
};

// Function to create CRA trial
// Function to create CRA trial
function createCRATrial(problem, isPractice, problemIndex, totalProblems) {
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
                    phase: isPractice ? 'practice' : 'test',
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
            phase: isPractice ? 'practice' : 'test',
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

            if (this.timeout) {
                data.timed_out = true;
                data.response = { Q0: "" };
                data.correct = false;
                return;
            }

            const responseText = (data.response?.Q0 ?? "").trim();
            const regexPatterns = jsPsych.data.get().last(1).values()[0].regex;
            data.correct = regexPatterns.some(pattern => new RegExp(`^${pattern}$`, 'i').test(responseText));
            data.timed_out = false;
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



// Break screen
const breakScreen = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="jspsych-content">
        <h2>Practice Trials Complete</h2>
        <p>You have completed the practice trials.</p>
        <p>Click Continue when you're ready to proceed.</p>
    </div>`,
    choices: ['Continue']
};

// Main experiment function
async function runExperiment() {
    try {
        // Load problems from JSON file
        const craProblems = await loadProblems();
        
        // Create timeline
        const timeline = [instructions];

        // Add practice trials if they exist
        if (craProblems.practice && craProblems.practice.length > 0) {
            craProblems.practice.forEach((problem, index) => {
                timeline.push(createCRATrial(problem, true, index, craProblems.practice.length));
            });
            timeline.push(breakScreen);
        }

        // Add test trials
        if (craProblems.test && craProblems.test.length > 0) {
            craProblems.test.forEach((problem, index) => {
                timeline.push(createCRATrial(problem, false, index, craProblems.test.length));
            });
        }

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
    }
}

// Start the experiment
runExperiment();