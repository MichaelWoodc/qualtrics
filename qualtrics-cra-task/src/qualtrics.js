// This file integrates the CRA task with Qualtrics.
// It includes functions to load the CRA task and handle Qualtrics API interactions.

function loadCRATask() {
    const script = document.createElement('script');
    script.src = 'src/cra_task.js';
    script.onload = function() {
        // Start the CRA task once the script is loaded
        runExperiment();
    };
    document.head.appendChild(script);
}

// Qualtrics-specific function to embed the CRA task
Qualtrics.SurveyEngine.addOnload(function() {
    loadCRATask();
});