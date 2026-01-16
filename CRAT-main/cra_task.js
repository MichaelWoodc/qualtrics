/****************************************************
 * GLOBAL SETTINGS
 ****************************************************/
const PROGRESS_BAR_WIDTH = "30vw";   // <--- your requested width
const PROGRESS_BAR_HEIGHT = "20px";  // fixed height

/****************************************************
 * PROGRESS BAR HTML
 ****************************************************/
const progressBarHTML = `
    <div style="
        width: ${PROGRESS_BAR_WIDTH};
        height: ${PROGRESS_BAR_HEIGHT};
        border: 2px solid white;
        border-radius: 2px;
        margin-top: 20px;
        display: flex;
        justify-content: flex-start;   /* left-align inner bar */
        align-items: center;
        overflow: hidden;              /* clean clipping */
    ">
        <div id="progress-bar" style="
            width: 100%;
            height: 100%;
            background-color: white;
            border-radius: 2px;
            transition: width 0.1s linear;
            transform-origin: left center;  /* shrink from left */
        "></div>
    </div>
`;

/****************************************************
 * PROGRESS BAR UPDATE (SAFE)
 ****************************************************/
function updateProgressBar(timeLeft, totalTime) {
    const bar = document.getElementById("progress-bar");
    if (!bar) return;
    const pct = (timeLeft / totalTime) * 100;
    bar.style.width = pct + "%";
}

/****************************************************
 * INITIALIZE JSPsych
 ****************************************************/
const jsPsych = initJsPsych({
    display_element: "jspsych-target",
    on_finish: async function() {
        jsPsych.data.get().addToLast({ participant: sbj_id });
        try {
            await save_data_json();
            await save_data_csv();
        } catch (e) {
            console.error("Save error:", e);
        }
        if (window.parent && window.parent !== window) {
            window.parent.postMessage("CRAT_FINISHED", "*");
        }
    }
});

/****************************************************
 * PARTICIPANT ID + SAVE ENDPOINT
 ****************************************************/
const urlParams = new URLSearchParams(window.location.search);
const sbj_id =
    urlParams.get("sbj_id") ||
    urlParams.get("workerId") ||
    urlParams.get("PROLIFIC_PID") ||
    "anon_" + Math.floor(Math.random() * 100000);

const save_url = "https://michaelwoodcock.duckdns.org/exp_data/save_data.php";
const data_dir = "CRAT_task";
const file_json = `${sbj_id}.json`;
const file_csv = `${sbj_id}.csv`;

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

/****************************************************
 * LOAD PROBLEMS
 ****************************************************/
async function loadProblems() {
    try {
        const response = await fetch("cra_problems.json");
        if (!response.ok) throw new Error("Failed to load problems");
        const data = await response.json();
        return data.problems;
    } catch (e) {
        console.error("Error loading problems:", e);
        return [
            { words: ["age", "mile", "sand"], solutions: ["stone"], regex: ["stone"] },
            { words: ["apple", "family", "house"], solutions: ["tree"], regex: ["tree"] }
        ];
    }
}

/****************************************************
 * FIXATION
 ****************************************************/
const fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div class="fixation">+</div>`,
    choices: "NO_KEYS",
    trial_duration: 800
};

/****************************************************
 * CREATE CRA TRIAL
 ****************************************************/
function createCRATrial(problem, index, total) {
    let showAnswer = false;
    let firstKey = "";

    const trial = {
        timeline: [
            fixation,
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: () => `
                    <div class="cra-container">
                        <div class="cra-words">${problem.words.join("<br>")}</div>
                        ${progressBarHTML}
                    </div>
                `,
                choices: "ALL_KEYS",
                trial_duration: 15000,
                data: {
                    words: problem.words,
                    solutions: problem.solutions,
                    regex: problem.regex,
                    phase: "test",
                    problem_number: index + 1
                },
                on_start: function() {
                    showAnswer = false;
                    let timeLeft = 15;
                    this.timer = setInterval(() => {
                        timeLeft -= 0.1;
                        updateProgressBar(timeLeft, 15);
                        if (timeLeft <= 0) clearInterval(this.timer);
                    }, 100);
                },
                on_finish: function(data) {
                    clearInterval(this.timer);

                    if (data.response !== null) {
                        showAnswer = true;

                        let keyChar = "";
                        try {
                            keyChar = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(data.response) || "";
                        } catch {
                            keyChar = String(data.response) || "";
                        }

                        if (keyChar.length === 1 && keyChar.match(/^[\w\d\p{P}]$/u)) {
                            firstKey = keyChar;
                        }
                    }

                    data.solved = showAnswer;
                    data.timed_out = !showAnswer;
                }
            }
        ]
    };

    const answerScreen = {
        type: jsPsychSurveyText,
        questions: [{
            prompt: `<div style="height: 0px;"></div>`,  // placeholder, no bar here
            name: "Q0",
            placeholder: ""
        }],
        trial_duration: 7000,
        data: { phase: "test", problem_number: index + 1 },

        on_load: function() {
            const input = document.querySelector("input[type='text']");
            if (input) {
                if (firstKey) {
                    input.value = firstKey;
                    input.setSelectionRange(input.value.length, input.value.length);
                }
                input.focus();
            }

            // ⬇️ ADD THE PROGRESS BAR UNDER THE INPUT
            const barWrapper = document.createElement("div");
            barWrapper.innerHTML = progressBarHTML;
            input.insertAdjacentElement("afterend", barWrapper);
        },

        on_start: function(trial) {
            let timeLeft = 7;
            this.timer = setInterval(() => {
                timeLeft -= 0.1;
                updateProgressBar(timeLeft, 7);
                if (timeLeft <= 0 && !this.timeout) {
                    this.timeout = true;
                    const input = document.querySelector("input[type='text']");
                    trial.data.current_input = input ? input.value.trim() : "";
                    jsPsych.finishTrial();
                }
            }, 100);

            const prev = jsPsych.data.get().last(1).values()[0];
            trial.data.words = prev.words;
            trial.data.solutions = prev.solutions;
            trial.data.regex = prev.regex;
        },

        on_finish: function(data) {
            clearInterval(this.timer);

            const regex = data.regex;
            let responseText = "";

            if (this.timeout) {
                responseText = (data.current_input || "").trim();
                data.response = { Q0: responseText };
            } else {
                responseText = (data.response?.Q0 || "").trim();
            }

            data.timed_out = this.timeout === true;
            data.correct = regex.some(r => new RegExp(`^${r}$`, "i").test(responseText));
            data.solved = responseText.length > 0;
        }
    };


    return {
        timeline: [
            { timeline: trial.timeline },
            { timeline: [answerScreen], conditional_function: () => showAnswer }
        ]
    };
}

/****************************************************
 * RUN EXPERIMENT
 ****************************************************/
async function runExperiment() {
    const problems = await loadProblems();
    const timeline = [];

    problems.forEach((p, i) => {
        timeline.push(createCRATrial(p, i, problems.length));
    });

    jsPsych.run(timeline);
}

runExperiment();
c