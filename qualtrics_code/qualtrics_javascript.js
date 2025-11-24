Qualtrics.SurveyEngine.addOnload(function() {
    // Wipe out Qualtrics layout
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.documentElement.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden"; // prevent scrollbars

    // Hide Qualtrics chrome
    var header = document.getElementById("Header");
    var footer = document.getElementById("Footer");
    var nav = document.getElementById("NextButton");
    if (header) header.style.display = "none";
    if (footer) footer.style.display = "none";
    if (nav) nav.style.display = "none";

    // Force question container full screen
    var qc = this.getQuestionContainer();
    qc.style.margin = "0";
    qc.style.padding = "0";
    qc.style.width = "100%";
    qc.style.height = "100%";

    // Create full‑screen iframe
    var iframe = document.createElement("iframe");
    iframe.src = "https://michaelwoodc.github.io/qualtrics/CRAT-main/index.html";
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.zIndex = "9999";

    document.body.appendChild(iframe);
});

Qualtrics.SurveyEngine.addOnReady(function() {
    console.log("CRA Task now running fullscreen.");
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    console.log("Leaving CRA Task question.");
});