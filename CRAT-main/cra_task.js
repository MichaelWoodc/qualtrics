// Initialize jsPsych
const jsPsych = initJsPsych({
    display_element: 'jspsych-target',
    on_finish: async function() {

        // Add participant ID before saving
        jsPsych.data.get().addToLast({ participant: sbj_id });

        try {
            // Save JSON and CSV to server only
            await save_data_json();
            await save_data_csv();
            console.log("Data saved to server");
        } catch (err) {
            console.error("Save error:", err);
        }

        // Optionally, post a message to Qualtrics to advance
        if (window.parent) {
            window.parent.postMessage("CRAT_FINISHED", "*");
        }
    }
});

// ===========================================================
// SAVE DATA TO SERVER
// ===========================================================

// Get participant ID from URL params
const urlParams = new URLSearchParams(window.location.search);
const sbj_id = urlParams.get("workerId") 
    || urlParams.get("PROLIFIC_PID") 
    || "anon_" + Math.floor(Math.random() * 100000);

// PHP endpoint
const save_url = "https://michaelwoodcock.duckdns.org/exp_data/save_data.php";
const data_dir = "CRAT_task";

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

// Load problems
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
            practice: [{
                "words": ["coin", "quick", "spoon"],
                "solutions": ["silver", "silver dollar"],
                "regex": ["silver( dollar)?", "silverdollar"]
            }],
            test: [{
                "words": ["age", "mile", "sand"],
                "solutions": ["stone"],
                "regex": ["stone"]
            }]
        };
    }
}

// Custom progress bar
const progressBarHTML = `
<div class="progress-container" style="width: 100%; height: 20px; background-color: #f1f1f1; border-radius: 10px; margin: 20px 0;">
    <div id="progress-bar" class="progress-bar" style="height: 100%; width: 100%; background-color: #4CAF50; border-radius: 10px; transition: width 0.1s linear;"></div>
</div>
<div id="time-remaining" style="text-align: center; font-size: 16px; margin-bottom: 20px;">15.0s remaining</div>
`;

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

// [Keep your instructions, fixation, and CRA trial creation code as before]
// ... same as your previous trial creation code ...

// Main experiment function
async function runExperiment() {
    try {
        const craProblems = await loadProblems();
        const timeline = [instructions];

        if (craProblems.practice && craProblems.practice.length > 0) {
            craProblems.practice.forEach((problem, index) => {
                timeline.push(createCRATrial(problem, true, index, craProblems.practice.length));
            });
            timeline.push(breakScreen);
        }

        if (craProblems.test && craProblems.test.length > 0) {
            craProblems.test.forEach((problem, index) => {
                timeline.push(createCRATrial(problem, false, index, craProblems.test.length));
            });
        }

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
