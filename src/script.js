"use strict";
const labels = defaults.labels;
class Clock {
    constructor(params, buzzer, label) {
        this.time = -1;
        this.fullTime = -1;
        this.timeOnPreviousStop = -1;
        this.recentStartTimestamp = -1;
        this.running = false;
        this.live = false;
        this.ended = false;
        this.label = label;
        this.params = params;
        this.buzzer = buzzer;
        this.init();
    }
    isLive() {
        return this.live;
    }
    isRunning() {
        return this.running;
    }
    hasEnded() {
        return this.ended;
    }
    init() {
        this.live = false;
        this.running = false;
        this.ended = false;
        this.fullTime = this.params.minutes * 60000 + this.params.seconds * 1000;
        if (this.params.countdown) {
            this.time = this.params.minutes * 60000 + this.params.seconds * 1000;
        }
        else {
            this.time = 0;
        }
        this.timeOnPreviousStop = this.time;
        this.label.hide();
        this.render();
    }
    stop() {
        this.timeOnPreviousStop = this.time;
        this.running = false;
    }
    start() {
        this.recentStartTimestamp = performance.now();
        this.running = true;
    }
    end() {
        this.buzzer.pause();
        this.buzzer.currentTime = 0;
        this.buzzer.play();
        this.running = false;
        this.ended = true;
    }
    reachesLimit(stamp) {
        if (!this.running) {
            return false;
        }
        const elapsed = stamp - this.recentStartTimestamp;
        let reachesLimit = false;
        if (this.params.countdown) {
            this.time = this.timeOnPreviousStop - elapsed;
            if (this.time < 0) {
                this.time = 0;
                this.end();
                reachesLimit = true;
            }
        }
        else {
            this.time = this.timeOnPreviousStop + elapsed;
            if (this.time >= this.fullTime) {
                this.time = this.fullTime;
                this.end();
                reachesLimit = true;
            }
        }
        this.render();
        return reachesLimit;
    }
    toggleState(live, slide) {
        this.live = live;
        if (slide) {
            this.live ? this.label.slideDown() : this.label.slideUp();
        }
        else {
            this.live ? this.label.show() : this.label.hide();
        }
        this.render();
    }
    render() {
        this.label.html(this.getString());
    }
    getString() {
        const minutes = Math.floor(this.time / 60000);
        const seconds = Math.floor((this.time - minutes * 60000) / 1000);
        let str = this.params.subsecond > 0 ? "&nbsp;<span class='" + labels.css.timeseparator + "'>&nbsp;</span>" : "";
        if (this.params.alwaysLeadZero || this.params.minutes > 0) {
            str += minutes + "<span class='" + labels.css.timeseparator + "'>:</span>";
        }
        str += pad0(seconds, 2);
        if (this.params.countdown && minutes == 0 && seconds < this.params.subsecond) {
            const milli = this.time - minutes * 60000 - seconds * 1000;
            str += "<span class='" + labels.css.timeseparator + "'>.</span>" + Math.floor(milli / 100) + "";
        }
        else if (this.params.subsecond > 0) {
            str += "<span class='" + labels.css.timeseparator + "'>&nbsp;</span>&nbsp;";
        }
        return str;
    }
}
class Timer {
    constructor() {
        this.sponsors = new Sponsors();
        this.periodNr = 1;
        this.sysTime = -1;
        const bf = defaults.buzzerFiles[settings.match.buzzer];
        const buzzer = bf == "" ? new Audio() : new Audio(bf);
        this.period = new Clock(settings.timer.period, buzzer, labels.match.periodClock);
        this.pause = new Clock(settings.timer.pause, buzzer, labels.match.pauseClock);
        this.actred = new Clock(settings.timer.active, new Audio(), labels.boxes.red.wres.time);
        this.actblu = new Clock(settings.timer.active, new Audio(), labels.boxes.blu.wres.time);
        this.lastPeriod = settings.match.lastPeriod;
        this.periodSuffix = settings.lang.periodSuffix;
        this.reset();
    }
    reset() {
        this.period.init();
        this.period.toggleState(true, false);
        this.periodNr = 1;
        labels.match.periodInfo.html(this.periodNr + this.periodSuffix);
        this.pause.init();
        this.actred.init();
        this.actblu.init();
    }
    toggle() {
        if (this.pause.isLive()) {
            if (!this.pause.isRunning()) {
                this.pause.start();
                this.animate();
            }
            else {
                this.pause.stop();
            }
        }
        else if (this.startablePeriod()) {
            this.period.start();
            this.startActiveTime(this.actred);
            this.startActiveTime(this.actblu);
            this.animate();
        }
        else {
            this.period.stop();
            this.stopActiveTime(this.actred);
            this.stopActiveTime(this.actblu);
        }
    }
    toggleActiveTime(red) {
        if (red) {
            this.toggleActive(this.actred);
        }
        else {
            this.toggleActive(this.actblu);
        }
    }
    anyClockRunning() {
        return this.period.isRunning() || this.pause.isRunning();
    }
    startablePeriod() {
        if (this.period.hasEnded() && this.periodNr == this.lastPeriod) {
            return false;
        }
        if (this.pause.isRunning() || this.period.isRunning() || this.pause.isLive()) {
            return false;
        }
        return true;
    }
    toggleActive(clock) {
        if (!this.period.isRunning() && !this.period.hasEnded()) {
            if (!clock.isLive()) {
                clock.init();
                clock.toggleState(true, true);
            }
            else {
                clock.toggleState(false, true);
            }
        }
    }
    startActiveTime(clock) {
        if (clock.isLive()) {
            if (!clock.hasEnded()) {
                clock.start();
            }
        }
    }
    stopActiveTime(clock) {
        if (clock.isLive()) {
            clock.stop();
        }
    }
    animate() {
        this.sysTime = performance.now();
        requestAnimationFrame(this.step.bind(this));
    }
    animationStoppable() {
        if (this.period.isRunning() && this.pause.isRunning()) {
            console.error("Both pause and period are running");
        }
        return !this.period.isRunning() && !this.pause.isRunning();
    }
    step(timestamp) {
        if (this.animationStoppable()) {
            return;
        }
        this.calculate(timestamp);
        this.animate();
    }
    calculate(timestamp) {
        if (this.period.reachesLimit(timestamp)) {
            this.actred.end();
            this.actred.toggleState(false, false);
            this.actblu.end();
            this.actblu.toggleState(false, false);
            if (this.periodNr != this.lastPeriod) {
                labels.match.periodInfo.html("&nbsp;");
                this.pause.toggleState(true, false);
                this.pause.start();
            }
            else {
                this.pause.init();
            }
        }
        if (this.pause.reachesLimit(timestamp)) {
            this.pause.toggleState(false, false);
            this.periodNr++;
            this.period.init();
            this.period.toggleState(true, false);
            labels.match.periodInfo.html(this.periodNr + this.periodSuffix);
        }
        this.actred.reachesLimit(timestamp);
        this.actblu.reachesLimit(timestamp);
        this.sponsors.update(timestamp);
    }
}
class Names {
    constructor() {
        this.o = 1;
        this.c = 0;
        this.mm = [0, 0, 9, 1, 8, 2, 7, 3, 6, 4, 5];
        labels.boxes.red.team.name.html(settings.match.red);
        labels.boxes.blu.team.name.html(settings.match.blu);
        if (!settings.match.showTeams) {
            labels.boxes.red.team.box.hide();
            labels.boxes.blu.team.box.hide();
        }
        else {
            labels.boxes.red.team.box.show();
            labels.boxes.blu.team.box.show();
        }
        if (!settings.match.showWeigth) {
            labels.match.weight.hide();
            labels.match.style.hide();
        }
        else {
            labels.match.weight.show();
            labels.match.style.show();
        }
        this.render();
    }
    move(delta) {
        if (this.o + delta > 0 && this.o + delta <= settings.fights.length) {
            this.o += delta;
            if (settings.match.mmSet) {
                this.c = this.mm[this.o];
            }
            else {
                this.c = this.o - 1;
            }
            this.render();
        }
    }
    reset() {
        this.c = 0;
        this.render();
    }
    render() {
        const currentFight = settings.fights[this.c];
        const redWresName = currentFight.red != "" ? currentFight.red : "&nbsp;";
        const bluWresName = currentFight.blu != "" ? currentFight.blu : "&nbsp;";
        labels.boxes.red.wres.name.html(redWresName);
        labels.boxes.blu.wres.name.html(bluWresName);
        labels.match.style.html(currentFight.greco ? settings.lang.greco : settings.lang.nonGreco);
        labels.match.weight.html(currentFight.weight + (currentFight.weight.length > 0 ? settings.lang.weightSuffix : ""));
    }
}
class Scores {
    constructor() {
        this.red = {
            team: new Score(0, 99),
            wres: new Score(0, 99),
            warn: -1
        };
        this.blu = {
            team: new Score(0, 99),
            wres: new Score(0, 99),
            warn: -1
        };
        labels.boxes.red.team.score.html(this.red.team.set(0).toString());
        labels.boxes.blu.team.score.html(this.blu.team.set(0).toString());
        this.reset();
    }
    reset() {
        labels.boxes.red.wres.score.html(this.red.wres.set(0).toString());
        labels.boxes.blu.wres.score.html(this.blu.wres.set(0).toString());
        this.red.warn = -1;
        this.blu.warn = -1;
        for (const w of labels.boxes.red.wres.warn) {
            w.removeClass(labels.css.showWarning);
        }
        for (const w of labels.boxes.blu.wres.warn) {
            w.removeClass(labels.css.showWarning);
        }
    }
    deltaRedWres(d) {
        labels.boxes.red.wres.score.html(this.red.wres.delta(d).toString());
    }
    deltaBluWres(d) {
        labels.boxes.blu.wres.score.html(this.blu.wres.delta(d).toString());
    }
    deltaRedTeam(d) {
        labels.boxes.red.team.score.html(this.red.team.delta(d).toString());
    }
    deltaBluTeam(d) {
        labels.boxes.blu.team.score.html(this.blu.team.delta(d).toString());
    }
    deltaRedWarn(d) {
        const w = this.red.warn;
        const lbl = labels.boxes.red.wres.warn;
        if (d == 1) {
            if (w < 2) {
                this.red.warn += d;
                lbl[this.red.warn].toggleClass(labels.css.showWarning);
            }
        }
        else if (d == -1) {
            if (w > -1) {
                lbl[w].toggleClass(labels.css.showWarning);
                this.red.warn += d;
            }
        }
    }
    deltaBluWarn(d) {
        const w = this.blu.warn;
        const lbl = labels.boxes.blu.wres.warn;
        if (d == 1) {
            if (w < 2) {
                this.blu.warn += d;
                lbl[this.blu.warn].toggleClass(labels.css.showWarning);
            }
        }
        else if (d == -1) {
            if (w > -1) {
                lbl[w].toggleClass(labels.css.showWarning);
                this.blu.warn += d;
            }
        }
    }
}
class Score {
    constructor(min, max) {
        this.value = 0;
        this.min = min;
        this.max = max;
    }
    delta(d) {
        if (this.value + d >= this.min && this.value + d <= this.max) {
            this.value += d;
        }
        return this.value;
    }
    set(v) {
        this.value = v;
        return this.value;
    }
}
class Sponsors {
    constructor() {
        this.dir = "";
        this.current = 1;
        this.prevTime = performance.now();
        if (settings.match.sponsors.show) {
            labels.sponsor.show();
            this.dir = settings.match.theme ? settings.match.sponsors.directoryLight : settings.match.sponsors.directoryDark;
            this.setImg();
        }
        else {
            labels.sponsor.hide();
        }
    }
    update(timestamp) {
        if ((timestamp - this.prevTime) > settings.match.sponsors.interval * 1000) {
            this.prevTime = timestamp;
            this.setImg();
        }
    }
    setImg() {
        const src = this.dir + pad0(this.current, 2) + ".png";
        labels.sponsor.attr("src", src);
        this.current += 1;
        if (this.current >= settings.match.sponsors.quantity) {
            this.current = 1;
        }
    }
}
class Overview {
    constructor() {
        this.isOpen = false;
    }
    toggle() {
        if (this.isOpen) {
            this.close();
        }
        else if (!board.isClockRunning()) {
            this.open();
        }
    }
    open() {
        keys.switch("overview");
        this.render();
        labels.overview.layer.show();
        this.isOpen = true;
    }
    close() {
        keys.switch("board");
        labels.overview.layer.hide();
        this.isOpen = false;
    }
    render() {
        const redTeamScore = labels.boxes.red.team.score.html();
        const bluTeamScore = labels.boxes.blu.team.score.html();
        if ((redTeamScore > 0 || bluTeamScore > 0) && settings.match.showTeams) {
            labels.overview.red.html(redTeamScore);
            labels.overview.blu.html(bluTeamScore);
            labels.overview.boxes.show();
        }
        else {
            labels.overview.boxes.hide();
        }
        let hasFights = false;
        for (const fight of settings.fights) {
            if (fight.red != "" || fight.blu != "") {
                hasFights = true;
                break;
            }
        }
        if (hasFights && settings.match.showWeigth) {
            labels.overview.logo.hide();
            labels.overview.table.show();
            labels.overview.table.empty();
            const thead = '<tr>' +
                '<th>' + settings.match.red + '</th>' +
                '<th colspan="2"></th>' +
                '<th>' + settings.match.blu + '</th>' +
                '</tr>';
            labels.overview.table.append(thead);
            for (const fight of settings.fights) {
                const tr = "<tr>" +
                    "<td>" + fight.red + "</td>" +
                    "<td>" + fight.weight + "</td>" +
                    "<td>" + (fight.greco ? settings.lang.grecoShort : settings.lang.nonGrecoShort) + "</td>" +
                    "<td>" + fight.blu + "</td></tr>";
                labels.overview.table.append(tr);
            }
        }
        else {
            labels.overview.table.hide();
            labels.overview.logo.show();
        }
    }
}
function pad0(value, count) {
    let result = value.toString();
    for (; result.length < count; --count)
        result = '0' + result;
    return result;
}
class Keys {
    constructor() {
        this.listener = new window.keypress.Listener();
        this.load();
    }
    switch(mode) {
        if (mode == "board") {
            this.load();
        }
        else if (mode == "overview") {
            this.listener.reset();
            this.listener.simple_combo(settings.keymap.toggleOverview, function () { ow.toggle(); });
            this.listener.simple_combo("esc", function () { ow.toggle(); });
        }
        else if (mode == "matchConfig") {
            this.listener.reset();
            this.listener.simple_combo("enter", function () { matchConfig.submit(); });
            this.listener.simple_combo("esc", function () { matchConfig.close(); });
        }
        else if (mode == "keysConfig") {
            this.listener.reset();
        }
    }
    load() {
        this.listener.reset();
        this.listener.simple_combo(settings.keymap.toggle, function () { board.toggle(); });
        this.listener.simple_combo(settings.keymap.prev, function () { board.prev(); });
        this.listener.simple_combo(settings.keymap.next, function () { board.next(); });
        this.listener.simple_combo(settings.keymap.reset, function () { board.reset(); });
        this.listener.simple_combo(settings.keymap.activeRed, function () { board.activeRed(); });
        this.listener.simple_combo(settings.keymap.activeBlu, function () { board.activeBlu(); });
        this.listener.simple_combo(settings.keymap.incrRedWres, function () { board.incrRedWres(); });
        this.listener.simple_combo(settings.keymap.incrRedTeam, function () { board.incrRedTeam(); });
        this.listener.simple_combo(settings.keymap.incrBluWres, function () { board.incrBluWres(); });
        this.listener.simple_combo(settings.keymap.incrBluTeam, function () { board.incrBluTeam(); });
        this.listener.simple_combo(settings.keymap.decrRedWres, function () { board.decrRedWres(); });
        this.listener.simple_combo(settings.keymap.decrRedTeam, function () { board.decrRedTeam(); });
        this.listener.simple_combo(settings.keymap.decrBluWres, function () { board.decrBluWres(); });
        this.listener.simple_combo(settings.keymap.decrBluTeam, function () { board.decrBluTeam(); });
        this.listener.simple_combo(settings.keymap.incrWarnRed, function () { board.incrWarnRed(); });
        this.listener.simple_combo(settings.keymap.incrWarnBlu, function () { board.incrWarnBlu(); });
        this.listener.simple_combo(settings.keymap.decrWarnRed, function () { board.decrWarnRed(); });
        this.listener.simple_combo(settings.keymap.decrWarnBlu, function () { board.decrWarnBlu(); });
        this.listener.simple_combo(settings.keymap.openMatchConfig, function () { matchConfig.open(); });
        this.listener.simple_combo(settings.keymap.toggleOverview, function () { ow.toggle(); });
    }
}
class MatchConfig {
    constructor() {
        this.audios = {};
        this.form = {
            timer: {
                period: {
                    minutes: document.querySelector("#input-period-minutes"),
                    seconds: document.querySelector("#input-period-seconds"),
                }
            },
            name: {
                red: document.querySelector("#input-name-red"),
                blu: document.querySelector("#input-name-blu"),
            },
            countdown: document.querySelector("#input-countdown"),
            subsecond: document.querySelector("#input-subsecond"),
            showTeams: document.querySelector("#input-showTeams"),
            mmSet: document.querySelector("#input-mmSet"),
            showWeigth: document.querySelector("#input-showWeigth"),
            showSponsors: document.querySelector("#input-showSponsors"),
            buzzers: document.querySelector("#input-buzzers"),
            theme: document.querySelector("#input-theme"),
            wrestlersAboveTeams: document.querySelector("#input-wrestlersAboveTeams"),
            fights: $("#fights")
        };
        this.fightRow = '<tr class="fightRow">';
        this.fightRow += '<td class="weight"><input type="text" name="weight" /></td>';
        this.fightRow += '<td class="greco"><input type="checkbox" name="greco" /></td>';
        this.fightRow += '<td><input type="text" name="red" /></td>';
        this.fightRow += '<td><input type="text" name="blu" /></td>';
        this.fightRow += '</tr>';
        this.fillValues(settings);
        labels.loadsave.fileInput.addEventListener("change", this.readSingleFile, false);
        for (const key in defaults.buzzerFiles) {
            const bf = defaults.buzzerFiles[key];
            this.audios[key] = bf != "" ? new Audio(bf) : new Audio();
        }
    }
    open() {
        if (!board.isClockRunning() && !fscreen.is()) {
            keys.switch("matchConfig");
            this.toggleInputs();
            labels.config.keys.hide();
            labels.config.match.show();
            this.fillValues(settings);
        }
    }
    submit() {
        if (this.apply()) {
            this.close();
        }
    }
    close() {
        keys.switch("board");
        labels.config.match.hide();
    }
    fillValues(localSettings) {
        labels.config.selectDefaultWeights.val(0);
        labels.config.selectDefaultKeymapping.val(0);
        $(".fightRow").remove();
        for (const f of localSettings.fights) {
            this.form.fights.append(this.fightRow);
        }
        this.form.timer.period.minutes.value = localSettings.timer.period.minutes;
        this.form.timer.period.seconds.value = localSettings.timer.period.seconds;
        this.form.countdown.checked = localSettings.timer.period.countdown;
        this.form.subsecond.checked = localSettings.timer.period.subsecond || localSettings.timer.pause.subsecond;
        this.form.name.red.value = localSettings.match.red;
        this.form.name.blu.value = localSettings.match.blu;
        this.form.mmSet.checked = localSettings.match.mmSet;
        this.form.showWeigth.checked = localSettings.match.showWeigth;
        this.form.showTeams.checked = localSettings.match.showTeams;
        this.form.showSponsors.checked = localSettings.match.sponsors.show;
        this.form.theme.checked = !localSettings.match.theme;
        this.form.wrestlersAboveTeams.checked = localSettings.match.wrestlersAboveTeams;
        while (this.form.buzzers.firstChild) {
            this.form.buzzers.removeChild(this.form.buzzers.firstChild);
        }
        let i = 0;
        for (const key in defaults.buzzerFiles) {
            const opt = document.createElement("option");
            opt.text = key;
            opt.value = key;
            opt.onclick = function () { matchConfig.audios[key].play(); };
            this.form.buzzers.options.add(opt);
            if (localSettings.match.buzzer == key) {
                this.form.buzzers.selectedIndex = i;
            }
            i++;
        }
        $("#fights :input").each(function (index) {
            const el = this;
            const f = $(this).closest("tr").index() - 2;
            if (f >= 0) {
                if (el.name == labels.html.inputname.weight) {
                    el.value = localSettings.fights[f].weight;
                }
                else if (el.name == labels.html.inputname.greco) {
                    el.checked = localSettings.fights[f].greco;
                }
                else if (el.name == labels.html.inputname.red) {
                    el.value = localSettings.fights[f].red;
                }
                else if (el.name == labels.html.inputname.blu) {
                    el.value = localSettings.fights[f].blu;
                }
            }
        });
        this.toggleInputs();
    }
    apply() {
        let valid = false;
        const minutes = parseInt(this.form.timer.period.minutes.value);
        const seconds = parseInt(this.form.timer.period.seconds.value);
        const countdown = this.form.countdown.checked;
        const subsecond = this.form.subsecond.checked;
        if ((minutes >= 0 && seconds > 0 || minutes > 0 && seconds >= 0)
            && seconds < 60
            && minutes < 60) {
            settings.timer.period.minutes = minutes;
            settings.timer.period.seconds = seconds;
            settings.timer.period.subsecond = subsecond ? defaults.settings.timer.period.subsecond : 0;
            settings.timer.period.countdown = countdown;
            settings.timer.pause.countdown = countdown;
            valid = true;
            this.form.timer.period.minutes.classList.remove(labels.css.invalid);
            this.form.timer.period.seconds.classList.remove(labels.css.invalid);
        }
        else {
            this.form.timer.period.minutes.classList.add(labels.css.invalid);
            this.form.timer.period.seconds.classList.add(labels.css.invalid);
        }
        settings.match.red = this.form.name.red.value;
        settings.match.blu = this.form.name.blu.value;
        settings.match.mmSet = this.form.mmSet.checked;
        settings.match.showWeigth = this.form.showWeigth.checked;
        settings.match.showTeams = this.form.showTeams.checked;
        settings.match.sponsors.show = this.form.showSponsors.checked;
        settings.match.theme = !this.form.theme.checked;
        settings.match.wrestlersAboveTeams = this.form.wrestlersAboveTeams.checked;
        settings.match.buzzer = this.form.buzzers.options.item(this.form.buzzers.selectedIndex).value;
        $("#fights :input").each(function (index) {
            const el = this;
            const f = $(this).closest("tr").index() - 2;
            if (f >= 0) {
                if (settings.fights[f] == undefined) {
                    settings.fights.push({ red: "", blu: "", greco: false, weight: "" });
                }
                if (el.name == labels.html.inputname.weight) {
                    settings.fights[f].weight = el.value;
                }
                else if (el.name == labels.html.inputname.greco) {
                    settings.fights[f].greco = el.checked;
                }
                else if (el.name == labels.html.inputname.red) {
                    settings.fights[f].red = el.value;
                }
                else if (el.name == labels.html.inputname.blu) {
                    settings.fights[f].blu = el.value;
                }
            }
        });
        if (valid) {
            board.load();
            keys.load();
            this.fillValues(settings);
        }
        return valid;
    }
    toggleInputs() {
        const t = !this.form.showTeams.checked;
        this.form.name.red.disabled = t;
        this.form.name.blu.disabled = t;
        const b = !this.form.showWeigth.checked;
        const weightInputs = $(":input[name=weight]");
        for (let k = 0, m = weightInputs.length; k < m; k++) {
            weightInputs[k].disabled = b;
        }
        const grecoInputs = $(":input[name=greco]");
        for (let k = 0, m = grecoInputs.length; k < m; k++) {
            grecoInputs[k].disabled = b;
        }
        this.form.subsecond.disabled = !this.form.countdown.checked;
    }
    clearNames() {
        $(":input[name=red], input[name=blu]").val("");
    }
    loadDefaults() {
        const val = labels.config.selectDefaultWeights.val();
        if (val != undefined && val > 0) {
            const hin = val == 1;
            const df = defaults.settings.fights;
            const weightInputs = $(":input[name=weight]");
            for (let k = 0, m = df.length; k < m; k++) {
                weightInputs[k].value = df[k].weight;
            }
            const grecoInputs = $(":input[name=greco]");
            for (let k = 0, m = df.length; k < m; k++) {
                const g = hin ? df[k].greco : !df[k].greco;
                grecoInputs[k].checked = g;
            }
        }
    }
    addFight() {
        $("#fights").append(this.fightRow);
    }
    removeFight() {
        $(".fightRow").last().remove();
    }
    saveToFile() {
        this.apply();
        const a = labels.loadsave.dummyAnchor;
        const json = JSON.stringify(settings);
        const ref = "data:application/json;charset=utf-8," + encodeURIComponent(json);
        a.href = ref;
        a.target = "_blank";
        a.download = labels.loadsave.saveFileName;
        a.click();
    }
    loadFromFile() {
        labels.loadsave.fileInput.click();
    }
    readSingleFile(e) {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            const result = reader.result;
            const loadedSettings = JSON.parse(result);
            matchConfig.fillValues(loadedSettings);
        };
        reader.readAsText(file);
    }
}
class KeysConfig {
    open() {
        keys.switch("keysConfig");
        labels.config.match.hide();
        labels.config.keys.show();
        this.fillValues(settings.keymap);
    }
    submit() {
        if (this.apply()) {
            this.close();
        }
    }
    close() {
        keys.switch("matchConfig");
        labels.config.match.show();
        labels.config.keys.hide();
    }
    fillValues(map) {
        labels.config.keymappingform.children().remove("*");
        const info = defaults.keymaps["info"];
        const m = 10;
        let i = 0;
        for (const key in info) {
            i++;
            const wrap = document.createElement("div");
            const input = document.createElement("input");
            const text = document.createElement("span");
            text.innerText = info[key];
            input.name = key;
            input.value = map[key];
            input.tabIndex = -1;
            input.onkeydown = function (event) {
                input.value = "";
            };
            input.onkeyup = function (event) {
                input.value = window.keypress._keycode_dictionary[event.keyCode];
            };
            if (i <= m) {
                wrap.className = "col";
            }
            wrap.appendChild(text);
            wrap.appendChild(input);
            labels.config.keymappingform.append(wrap);
        }
    }
    apply() {
        const inputs = labels.config.keymappingform.children().children().filter(":input");
        const values = new Array();
        let valid = true;
        for (const input of inputs) {
            let i = input;
            if (values.indexOf(i.value) > -1) {
                input.classList.add(labels.css.invalid);
                inputs[values.indexOf(i.value)].classList.add(labels.css.invalid);
                valid = false;
            }
            values.push(i.value);
        }
        if (valid) {
            for (const input of inputs) {
                let i = input;
                settings.keymap[i.name] = i.value;
            }
        }
        return valid;
    }
    loadDefaults() {
        const val = labels.config.selectDefaultKeymapping.val();
        if (val != undefined && val != "0") {
            this.fillValues(defaults.keymaps[val]);
        }
    }
}
class Board {
    constructor() {
        this.names = new Names();
        this.scores = new Scores();
        this.timer = new Timer();
        this.setTheme();
        this.loadTitleBar();
    }
    load() {
        this.defineLabels();
        this.names = new Names();
        this.scores = new Scores();
        this.timer = new Timer();
        this.setTheme();
        this.loadTitleBar();
    }
    defineLabels() {
        $(".active").hide();
        $(".scoreside").removeClass(labels.css.showWarning);
        if (settings.match.wrestlersAboveTeams) {
            labels.boxes = defaults.boxes.wrestlersAboveTeams;
        }
        else {
            labels.boxes = defaults.boxes.wrestlersBelowTeams;
        }
    }
    loadTitleBar() {
        labels.titlebar.fullscreenButton.html(settings.lang.fullscreenOn);
        labels.titlebar.div.mouseenter(function () {
            clearTimeout($(this).data('timeoutId'));
            $(this).find("ul").slideDown();
        }).mouseleave(function () {
            const someElement = $(this), timeoutId = setTimeout(function () {
                someElement.find("ul").slideUp();
            }, 2000);
            someElement.data("timeoutId", timeoutId);
        });
        labels.titlebar.div.trigger("mouseenter");
        labels.titlebar.div.trigger("mouseleave");
    }
    updateTitleBar() {
        if (fscreen.is()) {
            labels.titlebar.fullscreenButton.html(settings.lang.fullscreenOff);
            labels.titlebar.settingsButton.hide();
        }
        else {
            labels.titlebar.fullscreenButton.html(settings.lang.fullscreenOn);
            labels.titlebar.settingsButton.show();
        }
    }
    toggleFullscreen() {
        if (fscreen.is()) {
            fscreen.exitFullscreen(labels.board);
        }
        else {
            fscreen.requestFullscreen(labels.board);
        }
    }
    setTheme() {
        if (!settings.match.theme) {
            const link = '<link rel="stylesheet" type="text/css" href="' + labels.css.darkTheme + '">';
            $("head").append(link);
        }
        else {
            $('link[href*="' + labels.css.darkTheme + '"]').remove();
        }
    }
    isClockRunning() {
        return this.timer.anyClockRunning();
    }
    next() {
        if (!this.timer.anyClockRunning()) {
            this.names.move(1);
            this.reset();
        }
    }
    prev() {
        if (!this.timer.anyClockRunning()) {
            this.names.move(-1);
            this.reset();
        }
    }
    reset() {
        if (!this.timer.anyClockRunning()) {
            this.scores.reset();
            this.timer.reset();
        }
    }
    toggle() {
        this.timer.toggle();
    }
    activeRed() {
        this.timer.toggleActiveTime(true);
    }
    activeBlu() {
        this.timer.toggleActiveTime(false);
    }
    incrRedWres() { this.scores.deltaRedWres(1); }
    incrRedTeam() { this.scores.deltaRedTeam(1); }
    incrBluWres() { this.scores.deltaBluWres(1); }
    incrBluTeam() { this.scores.deltaBluTeam(1); }
    decrRedWres() { this.scores.deltaRedWres(-1); }
    decrRedTeam() { this.scores.deltaRedTeam(-1); }
    decrBluWres() { this.scores.deltaBluWres(-1); }
    decrBluTeam() { this.scores.deltaBluTeam(-1); }
    incrWarnRed() {
        this.scores.deltaRedWarn(1);
    }
    decrWarnRed() {
        this.scores.deltaRedWarn(-1);
    }
    incrWarnBlu() {
        this.scores.deltaBluWarn(1);
    }
    decrWarnBlu() {
        this.scores.deltaBluWarn(-1);
    }
}
const settings = clone(defaults.settings);
const keys = new Keys();
const board = new Board();
const ow = new Overview();
const keysConfig = new KeysConfig();
const matchConfig = new MatchConfig();
if (fscreen.fullscreenEnabled) {
    fscreen.addEventListener("fullscreenchange", function () {
        board.updateTitleBar();
    }, false);
}
