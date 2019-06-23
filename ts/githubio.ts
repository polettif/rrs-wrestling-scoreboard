/// <reference path="defaults.ts"/>

// change settings for example on github.io
if(window.location.href == "https://polettif.github.io/rrs-wrestling-scoreboard/") {
    defaults.settings.match.theme = true;
    defaults.settings.match.mmSet = false;
    defaults.settings.match.sponsors.interval = 12;
    defaults.settings.fights = [
        {
            red: "Max Muster",
            blu: "Felix Beispiel",
            weight: "61",
            greco: true
        },
        {
            red: "Eduardo Enz",
            blu: "Newton Nordby",
            weight: "65",
            greco: false
        },
        {
            red: "Fabian Freyberg",
            blu: "Jean-Jacque Joux",
            weight: "70",
            greco: false
        },
        {
            red: "Ramon Risch",
            blu: "Anton Augsberg",
            weight: "74",
            greco: true
        }
    ];
}