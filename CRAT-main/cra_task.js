// ==============================
// Initialize jsPsych
// ==============================
const jsPsych = initJsPsych({
  display_element: 'jspsych-target',
  on_finish: async function() {
    // Add participant ID before saving
    jsPsych.data.get().addToLast({ participant: sbj_id });

    try {
      await save_data_json();
      await save_data_csv();
      console.log("Data saved");
    } catch (err) {
      console.error("Save error:", err);
    }

    // Automatically signal Qualtrics to continue to next question
    if (window.parent && window.parent.Qualtrics && typeof window.parent.Qualtrics.SurveyEngine === 'object') {
      const qThis = window.parent.document.querySelector('#NextButton');
      if (qThis) {
        window.parent.Qualtrics.SurveyEngine.clickNextButton();
      }
    }
  }
});

// ==============================
// Server Save Configuration
// ==============================
const urlParams = new URLSearchParams(window.location.search);
const sbj_id =
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

// ==============================
// Progress Bar
// ==============================
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
    progressBar.style.backgroundColor =
      percentage > 50 ? '#4CAF50' : percentage > 20 ? '#FFC107' : '#F44336';
    timeRemaining.textContent = `${timeLeft.toFixed(1)}s remaining`;
  }
}

// ==============================
// Instructions
// ==============================
const instructions = {
  type: jsPsychInstructions,
  pages: [
    `<div class="jspsych-content"><h2>Welcome to the CRA Task</h2><p>You will see three words and need to find a fourth word that forms a common phrase or compound word with each.</p></div>`,
    `<div class="jspsych-content"><h2>Task Procedure</h2><ol><li>Fixate on the cross (+).</li><li>Three words will appear for 15s.</li><li>Press spacebar or click "I got it" to type your solution.</li><li>You have 7 seconds to enter your response.</li></ol></div>`
  ],
  button_label_next: "Next",
  show_clickable_nav: true,
  on_load: function() { updateProgressBar(15, 15); }
};

// ==============================
// Fixation
// ==============================
const fixation = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: '<div class="fixation"><br> + <br><br><br><br><br></div>',
  choices: "NO_KEYS",
  trial_duration: 800
};

// ==============================
// CRA Trial Function
// ==============================
function createCRATrial(problem, isPractice, problemIndex, totalProblems) {
  let showAnswerScreen = false;
  let firstKey = "";

  const trial = {
    timeline: [
      fixation,
      {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function() {
          return `<div class="cra-container">
            <div class="problem-counter">Problem ${problemIndex + 1} of ${totalProblems}</div>
            <div class="cra-words">${problem.words.join("<br>")}</div>
            ${progressBarHTML}</div>`;
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
        on_start: function() {
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
          if (data.response) {
            showAnswerScreen = true;
            firstKey = String(data.response).slice(0, 1);
          }
          data.solved = showAnswerScreen;
          data.rt = data.rt || 15000;
          data.timed_out = !showAnswerScreen;
          data.correct = false;
        }
      }
    ]
  };

  const answerScreen = {
    type: jsPsychSurveyText,
    questions: [
      { prompt: `Please enter your solution:<br>${progressBarHTML}`, placeholder: "Type answer...", name: "Q0" }
    ],
    trial_duration: 7000,
    data: { phase: isPractice ? 'practice' : 'test', problem_number: problemIndex + 1 },
    on_load: function() {
      const input = document.querySelector('input[type="text"]');
      if (input && firstKey) {
        input.value = firstKey;
        input.setSelectionRange(input.value.length, input.value.length);
        input.focus();
      }
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

// ==============================
// Break Screen
// ==============================
const breakScreen = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `<div class="jspsych-content"><h2>Practice Trials Complete</h2><p>Click Continue when ready.</p></div>`,
  choices: ['Continue']
};

// ==============================
// Run Experiment
// ==============================
async function runExperiment() {
  try {
    const craProblems = await loadProblems();
    const timeline = [instructions];

    if (craProblems.practice?.length) {
      craProblems.practice.forEach((p, i) =>
        timeline.push(createCRATrial(p, true, i, craProblems.practice.length))
      );
      timeline.push(breakScreen);
    }
    if (craProblems.test?.length) {
      craProblems.test.forEach((p, i) =>
        timeline.push(createCRATrial(p, false, i, craProblems.test.length))
      );
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