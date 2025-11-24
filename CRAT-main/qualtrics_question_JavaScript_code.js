Qualtrics.SurveyEngine.addOnload(function () {

    var qthis = this;

    /* ------------------------------------------------------------------
       1. Hide Qualtrics layout + Next button
    ------------------------------------------------------------------ */
    qthis.hideNextButton();

    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.documentElement.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";

    var header = document.getElementById("Header");
    var footer = document.getElementById("Footer");
    var nav = document.getElementById("NextButton");
    if (header) header.style.display = "none";
    if (footer) footer.style.display = "none";
    if (nav) nav.style.display = "none";

    var qc = this.getQuestionContainer();
    qc.style.margin = "0";
    qc.style.padding = "0";
    qc.style.width = "100%";
    qc.style.height = "100%";

    /* ------------------------------------------------------------------
       2. Build full-screen iframe that loads your CRAT experiment
          AND passes Qualtrics participant ID into the iframe
    ------------------------------------------------------------------ */

    var sbj_id = "${e://Field/workerId}" || "anon_" + Math.floor(Math.random() * 100000);

    var iframe = document.createElement("iframe");
    iframe.src = "https://michaelwoodc.github.io/qualtrics/CRAT-main/index.html?sbj_id=" + sbj_id;
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.zIndex = "9999";

    document.body.appendChild(iframe);

    /* ------------------------------------------------------------------
       3. Listen for “experiment finished” message from inside iframe
          Your internal code will call:  window.parent.postMessage("CRAT_FINISHED","*")
    ------------------------------------------------------------------ */

    window.addEventListener("message", function(e){
        if (e.data === "CRAT_FINISHED") {
            console.log("CRAT experiment reports completion");
            qthis.clickNextButton();
        }
    });
});

Qualtrics.SurveyEngine.addOnReady(function () {
    console.log("CRA Task now running fullscreen.");
});

Qualtrics.SurveyEngine.addOnUnload(function () {
    console.log("Leaving CRA Task question.");
});