/// <reference path="./lib/jquery.d.ts" />
/// <reference path="./lib/keypress.d.ts" />
/// <reference path="./lib/local.d.ts" />
/// <reference path="./interfaces.d.ts" />


// DISPLAY ELEMENTS AND VALUES
const labels = defaults.labels;

/*
TIME
*/
class Clock {
	private params: TimerParams;
	private label: JQuery<HTMLElement>;
	private buzzer: HTMLAudioElement;

	private time: number = -1;
	private fullTime: number = -1;
	private timeOnPreviousStop: number = -1;
	private recentStartTimestamp: number = -1;

	private running: boolean = false;
	private live: boolean = false;
	private ended: boolean = false;

	constructor(params: TimerParams, buzzer: HTMLAudioElement, label: JQuery<HTMLElement>) {
		this.label = label;
		this.params = params;
		this.buzzer = buzzer;

		this.init();
	}

	/*
	state getters
	*/
	isLive(): boolean {
		return this.live;
	}

	isRunning(): boolean {
		return this.running;
	}

	hasEnded(): boolean {
		return this.ended;
	}

	/*
	life cycle
	*/
	init() {
		this.live = false;
		this.running = false;
		this.ended = false;
		this.fullTime = this.params.minutes*60000 + this.params.seconds * 1000;
		if (this.params.countdown) {
			this.time = this.params.minutes*60000 + this.params.seconds * 1000;
		} else {
			this.time = 0;
		}
		this.timeOnPreviousStop = this.time;
		this.label.hide();
		this.render();
	}

	stop(): void {
		this.timeOnPreviousStop = this.time;
		this.running = false;
	}

	start(): void {
		this.recentStartTimestamp = performance.now();
		this.running = true;
	}

	end(): void {
		this.buzzer.pause();
		this.buzzer.currentTime = 0;
		this.buzzer.play();

		this.running = false;
		this.ended = true;
	}

	/*
	Updates the clock. Returns true if the clock has reached its limit
	*/
	reachesLimit(stamp: number) {
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
		} else {
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

	toggleState(live: boolean, slide: boolean) {
		this.live = live;
		if (slide) {
			this.live ? this.label.slideDown() : this.label.slideUp();
		} else {
			this.live ? this.label.show() : this.label.hide();
		}
		this.render();
	}

	// update associated label
	private render() {
		this.label.html(this.getString());
	}

	// Formats the given times array depending on parameters. Returns a string
	private getString(): string {
		const minutes = Math.floor(this.time/60000);
		const seconds = Math.floor((this.time - minutes*60000) / 1000);

		let str = this.params.subsecond > 0 ? "&nbsp;<span class='" + labels.css.timeseparator + "'>&nbsp;</span>" : "";
		// minutes
		if (this.params.alwaysLeadZero || this.params.minutes > 0) {
			str += minutes + "<span class='" + labels.css.timeseparator + "'>:</span>";
		}
		// seconds
		str += pad0(seconds, 2);
		// subsecond
		if (this.params.countdown && minutes == 0 && seconds < this.params.subsecond) {
			const milli = this.time - minutes*60000 - seconds*1000;
			str += "<span class='" + labels.css.timeseparator + "'>.</span>" + Math.floor(milli / 100) + "";
		} else if (this.params.subsecond > 0) {
			str += "<span class='" + labels.css.timeseparator + "'>&nbsp;</span>&nbsp;";
		}
		return str;
	}
}

class Timer {
	private period: Clock;
	private pause: Clock;
	private actred: Clock;
	private actblu: Clock;
	private sponsors: Sponsors = new Sponsors();

	private periodNr: number = 1;
	private lastPeriod: number;
	private sysTime: number = -1;


	private periodSuffix: string;

	constructor() {
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

	/*
	public
	*/

	public reset() {
		this.period.init();
		this.period.toggleState(true, false);
		this.periodNr = 1;
		labels.match.periodInfo.html(this.periodNr + this.periodSuffix);

		this.pause.init();
		this.actred.init();
		this.actblu.init();
	}

	public toggle() {
		// running pause has priority
		if(this.pause.isLive()) {
			if(!this.pause.isRunning()) {
				this.pause.start();
				this.animate();
			} else {
				this.pause.stop();
			}

		// period is underway, start period and active clock
		} else if (this.startablePeriod()) {
			this.period.start();
			this.startActiveTime(this.actred);
			this.startActiveTime(this.actblu);
			this.animate();
		} else { // stop period and active clocks
			this.period.stop();
			this.stopActiveTime(this.actred);
			this.stopActiveTime(this.actblu);
		}
	}

	public toggleActiveTime(red: boolean) {
		if (red) {
			this.toggleActive(this.actred);
		} else {
			this.toggleActive(this.actblu);
		}
	}

	public anyClockRunning(): boolean {
		return this.period.isRunning() || this.pause.isRunning();
	}
	/*
	*/

	private startablePeriod(): boolean {
		if (this.period.hasEnded() && this.periodNr == this.lastPeriod) {
			return false;
		}
		if (this.pause.isRunning() || this.period.isRunning() || this.pause.isLive()) {
			return false;
		}
		return true;
	}

	private toggleActive(clock: Clock) {
		if (!this.period.isRunning() && !this.period.hasEnded()) {
			if (!clock.isLive()) {
				clock.init();
				clock.toggleState(true, true);
			} else {
				clock.toggleState(false, true);
			}
		}
	}

	private startActiveTime(clock: Clock) {
		if (clock.isLive()) {
			if (!clock.hasEnded()) {
				clock.start();
			}
		}
	}

	private stopActiveTime(clock: Clock) {
		if (clock.isLive()) {
			clock.stop();
		}
	}

	/*
	 * ANIMATIONS AND CALCULATIONS
	 */

	private animate() {
		this.sysTime = performance.now();
		requestAnimationFrame(this.step.bind(this));
	}

	private animationStoppable() {
		if (this.period.isRunning() && this.pause.isRunning()) {
			console.error("Both pause and period are running");
		}
		return !this.period.isRunning() && !this.pause.isRunning();
	}

	// Function called by requestAnimationFrame()
	private step(timestamp: number) {
		if (this.animationStoppable()) {
			return;
		}
		this.calculate(timestamp);
		this.animate(); // recursive
	}

	// Calculates the timestamp difference and stops the animation if necessary
	private calculate(timestamp: number) {
		// PERIOD ENDS
		if (this.period.reachesLimit(timestamp)) {
			// end active times
			this.actred.end();
			this.actred.toggleState(false, false);
			this.actblu.end();
			this.actblu.toggleState(false, false);

			// start pause if necessary
			if (this.periodNr != this.lastPeriod) {
				labels.match.periodInfo.html("&nbsp;");
				this.pause.toggleState(true, false);
				this.pause.start();
			} else {
				// fight ended
				this.pause.init();
			}
		}

		// PAUSE ENDS
		if (this.pause.reachesLimit(timestamp)) {
			this.pause.toggleState(false, false);
			this.periodNr++;
			this.period.init();
			this.period.toggleState(true, false);
			labels.match.periodInfo.html(this.periodNr + this.periodSuffix);
		}

		// ACTIVE TIME ENDS
		this.actred.reachesLimit(timestamp);
		this.actblu.reachesLimit(timestamp);

		this.sponsors.update(timestamp);
	}
}

/***
NAMES & SCORES
***/

class Names {
	private o: number = 1;
	private c: number = 0;
	private mm = [0, 0, 9, 1, 8, 2, 7, 3, 6, 4, 5];

	constructor() {
		labels.boxes.red.team.name.html(settings.match.red);
		labels.boxes.blu.team.name.html(settings.match.blu);

		if (!settings.match.showTeams) {
			labels.boxes.red.team.box.hide();
			labels.boxes.blu.team.box.hide();
		} else {
			labels.boxes.red.team.box.show();
			labels.boxes.blu.team.box.show();
		}

		if (!settings.match.showWeigth) {
			labels.match.weight.hide();
			labels.match.style.hide();
		} else {
			labels.match.weight.show();
			labels.match.style.show();
		}

		this.render();
	}

	public move(delta: number) {
		if (this.o + delta > 0 && this.o + delta <= settings.fights.length) {
			this.o += delta;
			if (settings.match.mmSet) {
				this.c = this.mm[this.o];
			} else {
				this.c = this.o - 1;
			}
			this.render();
		}
	}

	reset() {
		this.c = 0;
		this.render();
	}

	private render() {
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
	private red = {
		team: new Score(0, 99),
		wres: new Score(0, 99),
		warn: -1
	};
	private blu = {
		team: new Score(0, 99),
		wres: new Score(0, 99),
		warn: -1
	}

	constructor() {
		labels.boxes.red.team.score.html(this.red.team.set(0).toString());
		labels.boxes.blu.team.score.html(this.blu.team.set(0).toString());
		this.reset();
	}

	/*
	public methods
	*/

	public reset() {
		labels.boxes.red.wres.score.html(this.red.wres.set(0).toString());
		labels.boxes.blu.wres.score.html(this.blu.wres.set(0).toString());
		this.red.warn = -1;
		this.blu.warn = -1;
		for (const w of labels.boxes.red.wres.warn) { w.removeClass(labels.css.showWarning); }
		for (const w of labels.boxes.blu.wres.warn) { w.removeClass(labels.css.showWarning); }
	}

	public deltaRedWres(d: number) {
		labels.boxes.red.wres.score.html(this.red.wres.delta(d).toString());
	}
	public deltaBluWres(d: number) {
		labels.boxes.blu.wres.score.html(this.blu.wres.delta(d).toString());
	}
	public deltaRedTeam(d: number) {
		labels.boxes.red.team.score.html(this.red.team.delta(d).toString());
	}
	public deltaBluTeam(d: number) {
		labels.boxes.blu.team.score.html(this.blu.team.delta(d).toString());
	}
	public deltaRedWarn(d: number) {
		const w = this.red.warn;
		const lbl: JQuery<HTMLElement>[] = labels.boxes.red.wres.warn;
		if (d == 1) {
			if (w < 2) {
				this.red.warn += d;
				lbl[this.red.warn].toggleClass(labels.css.showWarning);
			}
		} else if (d == -1) {
			if (w > -1) {
				lbl[w].toggleClass(labels.css.showWarning);
				this.red.warn += d;
			}
		}
	}
	public deltaBluWarn(d: number) {
		const w = this.blu.warn;
		const lbl: JQuery<HTMLElement>[] = labels.boxes.blu.wres.warn;
		if (d == 1) {
			if (w < 2) {
				this.blu.warn += d;
				lbl[this.blu.warn].toggleClass(labels.css.showWarning);
			}
		} else if (d == -1) {
			if (w > -1) {
				lbl[w].toggleClass(labels.css.showWarning);
				this.blu.warn += d;
			}
		}
	}
}

class Score {
	private value: number = 0;
	private min: number;
	private max: number;

	constructor(min: number, max: number) {
		this.min = min;
		this.max = max;
	}

	delta(d: number): number {
		if (this.value + d >= this.min && this.value + d <= this.max) {
			this.value += d;
		}
		return this.value;
	}

	set(v: number): number {
		this.value = v;
		return this.value;
	}
}

class Sponsors {
	private dir: string = "";
	private current: number = 1;
	private prevTime: number = performance.now();

	constructor() {
		if (settings.match.sponsors.show) {
			labels.sponsor.show();
			this.dir = settings.match.theme ? settings.match.sponsors.directoryLight : settings.match.sponsors.directoryDark;
			this.setImg();
		} else {
			labels.sponsor.hide();
		}
	}

	update(timestamp: number) {
		if((timestamp - this.prevTime) > settings.match.sponsors.interval * 1000) {
			this.prevTime = timestamp;
			this.setImg();
		}
	}

	private setImg() {
		const src = this.dir + pad0(this.current, 2) + ".png";
		labels.sponsor.attr("src", src);
		this.current += 1;
		if (this.current >= settings.match.sponsors.quantity) {
			this.current = 1;
		}
	}
}

class Overview {

	private isOpen: boolean = false;

	public toggle() {
		if (this.isOpen) {
			this.close();
		} else if(!board.isClockRunning()) {
			this.open();
			}
	}

	public open() {
		keys.switch("overview");
		this.render();
		labels.overview.layer.show();
		this.isOpen = true;
	}

	public close() {
		keys.switch("board");
		labels.overview.layer.hide();
		this.isOpen = false;
	}

	public render() {
		// scores are well encapsulated in board > scores
		const redTeamScore = labels.boxes.red.team.score.html();
		const bluTeamScore = labels.boxes.blu.team.score.html();

		// hide team scores
		if ((redTeamScore > 0 || bluTeamScore > 0) && settings.match.showTeams) {
			labels.overview.red.html(redTeamScore);
			labels.overview.blu.html(bluTeamScore);
			labels.overview.boxes.show();
		} else {
			labels.overview.boxes.hide();
		}

		let hasFights = false;
		for (const fight of settings.fights) {
			if (fight.red != "" || fight.blu != "") {
				hasFights = true;
				break;
			}
		}

		// show fight overview if fights are available
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
		} else {
			labels.overview.table.hide();
			labels.overview.logo.show();
		}
	}
}

function pad0(value: number, count: number) {
	let result = value.toString();
	for (; result.length < count; --count)
		result = '0' + result;
	return result;
}

class Keys {
	private listener: Keypress.Listener;

	constructor() {
		this.listener = new window.keypress.Listener();
		this.load();
	}

	switch(mode: string) {
		if (mode == "board") {
			this.load();
		} else if (mode == "overview") {
			this.listener.reset();
			this.listener.simple_combo(settings.keymap.toggleOverview, function() { ow.toggle(); });
			this.listener.simple_combo("esc", function() { ow.toggle(); });
		} else if (mode == "matchConfig") {
			this.listener.reset();
			this.listener.simple_combo("enter", function() { matchConfig.submit(); });
			this.listener.simple_combo("esc", function() { matchConfig.close(); });
		} else if (mode == "keysConfig") {
			this.listener.reset();
		}
	}

	load() {
		this.listener.reset();
		this.listener.simple_combo(settings.keymap.toggle, function() { board.toggle(); });
		this.listener.simple_combo(settings.keymap.prev, function() { board.prev(); });
		this.listener.simple_combo(settings.keymap.next, function() { board.next(); });
		this.listener.simple_combo(settings.keymap.reset, function() { board.reset(); });
		this.listener.simple_combo(settings.keymap.activeRed, function() { board.activeRed(); });
		this.listener.simple_combo(settings.keymap.activeBlu, function() { board.activeBlu(); });

		this.listener.simple_combo(settings.keymap.incrRedWres, function() { board.incrRedWres(); });
		this.listener.simple_combo(settings.keymap.incrRedTeam, function() { board.incrRedTeam(); });
		this.listener.simple_combo(settings.keymap.incrBluWres, function() { board.incrBluWres(); });
		this.listener.simple_combo(settings.keymap.incrBluTeam, function() { board.incrBluTeam(); });
		this.listener.simple_combo(settings.keymap.decrRedWres, function() { board.decrRedWres(); });
		this.listener.simple_combo(settings.keymap.decrRedTeam, function() { board.decrRedTeam(); });
		this.listener.simple_combo(settings.keymap.decrBluWres, function() { board.decrBluWres(); });
		this.listener.simple_combo(settings.keymap.decrBluTeam, function() { board.decrBluTeam(); });

		this.listener.simple_combo(settings.keymap.incrWarnRed, function() { board.incrWarnRed(); });
		this.listener.simple_combo(settings.keymap.incrWarnBlu, function() { board.incrWarnBlu(); });
		this.listener.simple_combo(settings.keymap.decrWarnRed, function() { board.decrWarnRed(); });
		this.listener.simple_combo(settings.keymap.decrWarnBlu, function() { board.decrWarnBlu(); });

		this.listener.simple_combo(settings.keymap.openMatchConfig, function() { matchConfig.open(); });
		this.listener.simple_combo(settings.keymap.toggleOverview, function() { ow.toggle(); });
	}
}

/***
CONFIG
***/
class MatchConfig implements Config {
	private form: any;
	private fightRow: string;

	private audios: Tab<HTMLAudioElement> = {};

	constructor() {
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

		// load buzzer audios
		for (const key in defaults.buzzerFiles) {
			const bf = defaults.buzzerFiles[key];
			this.audios[key] = bf != "" ? new Audio(bf) : new Audio();
		}
	}

	public open() {
		if (!board.isClockRunning() && !fscreen.is()) {
			keys.switch("matchConfig");
			this.toggleInputs();
			labels.config.keys.hide();
			labels.config.match.show();
			this.fillValues(settings);
		}
	}

	public submit() {
		if (this.apply()) {
			this.close();
		}
	}

	public close() {
		keys.switch("board");
		labels.config.match.hide();
	}

	public fillValues(localSettings: Settings) {
		// default select elements
		labels.config.selectDefaultWeights.val(0);
		labels.config.selectDefaultKeymapping.val(0);

		// create fights table
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

		// BUZZER
		while (this.form.buzzers.firstChild) {
			this.form.buzzers.removeChild(this.form.buzzers.firstChild);
		}
		let i = 0;
		for (const key in defaults.buzzerFiles) {
			const opt = document.createElement("option");
			opt.text = key;
			opt.value = key;
			opt.onclick = function() { matchConfig.audios[key].play() };
			this.form.buzzers.options.add(opt);
			if (localSettings.match.buzzer == key) {
				this.form.buzzers.selectedIndex = i;
			}
			i++;
		}

		// FIGHTS
		$("#fights :input").each(function(this, index) {
			const el = <HTMLInputElement>this;
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

	public apply(): boolean {
		let valid: boolean = false;

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
			// global countdown
			settings.timer.period.countdown = countdown;
			settings.timer.pause.countdown = countdown;

			valid = true;

			this.form.timer.period.minutes.classList.remove(labels.css.invalid);
			this.form.timer.period.seconds.classList.remove(labels.css.invalid);
		} else {
			this.form.timer.period.minutes.classList.add(labels.css.invalid);
			this.form.timer.period.seconds.classList.add(labels.css.invalid);
		}

		// team names
		settings.match.red = this.form.name.red.value;
		settings.match.blu = this.form.name.blu.value;

		// mmSet, showWeight, showTeams
		settings.match.mmSet = this.form.mmSet.checked;
		settings.match.showWeigth = this.form.showWeigth.checked;
		settings.match.showTeams = this.form.showTeams.checked;
		settings.match.sponsors.show = this.form.showSponsors.checked;
		settings.match.theme = !this.form.theme.checked;
		settings.match.wrestlersAboveTeams = this.form.wrestlersAboveTeams.checked;

		// buzzer
		settings.match.buzzer = this.form.buzzers.options.item(this.form.buzzers.selectedIndex).value;

		// fights
		$("#fights :input").each(function(this, index) {
			const el = <HTMLInputElement>this;
			const f = $(this).closest("tr").index() - 2;

			if (f >= 0) {
				// add fight if necessary from table input
				if (settings.fights[f] == undefined) {
					settings.fights.push({ red: "", blu: "", greco: false, weight: "" });
				}

				if (el.name == labels.html.inputname.weight) {
					settings.fights[f].weight = el.value;
				}
				// greco
				else if (el.name == labels.html.inputname.greco) {
					settings.fights[f].greco = el.checked;
				}
				// red
				else if (el.name == labels.html.inputname.red) {
					settings.fights[f].red = el.value;
				}
				// blu
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
		// showTeams
		const t = !this.form.showTeams.checked;
		this.form.name.red.disabled = t;
		this.form.name.blu.disabled = t;

		// weight/style
		const b = !this.form.showWeigth.checked;
		const weightInputs = $(":input[name=weight]");
		for (let k = 0, m = weightInputs.length; k < m; k++) {
			(<HTMLInputElement>weightInputs[k]).disabled = b;
		}
		const grecoInputs = $(":input[name=greco]");
		for (let k = 0, m = grecoInputs.length; k < m; k++) {
			(<HTMLInputElement>grecoInputs[k]).disabled = b;
		}

		// subsecond
		this.form.subsecond.disabled = !this.form.countdown.checked;
	}

	public clearNames() {
		$(":input[name=red], input[name=blu]").val("");
	}

	loadDefaults() {
		const val = labels.config.selectDefaultWeights.val();

		if (val != undefined && val > 0) {
			const hin = val == 1;
			const df: Fight[] = defaults.settings.fights;
			const weightInputs = $(":input[name=weight]");
			for (let k = 0, m = df.length; k < m; k++) {
				(<HTMLInputElement>weightInputs[k]).value = df[k].weight;
			}
			const grecoInputs = $(":input[name=greco]");
			for (let k = 0, m = df.length; k < m; k++) {
				const g = hin ? df[k].greco : !df[k].greco;
				(<HTMLInputElement>grecoInputs[k]).checked = g;
			}
		}
	}

	public addFight() {
		$("#fights").append(this.fightRow);
	}

	public removeFight() {
		$(".fightRow").last().remove();
	}

	public saveToFile() {
		this.apply();
		const a = labels.loadsave.dummyAnchor;
		const json = JSON.stringify(settings);
		const ref = "data:application/json;charset=utf-8," + encodeURIComponent(json);
		a.href = ref;
		a.target = "_blank";
		a.download = labels.loadsave.saveFileName;
		a.click();
	}

	public loadFromFile() {
		labels.loadsave.fileInput.click();
	}

	private readSingleFile(e: any) {
		const file = e.target.files[0];
		if (!file) {
			return;
		}
		const reader = new FileReader();
		reader.onload = function(e) {
			const result = <string> reader.result
			const loadedSettings = JSON.parse(result);
			matchConfig.fillValues(loadedSettings);
		};
		reader.readAsText(file);
	}

}

/***
KEYPRESS
***/
class KeysConfig implements Config {

	public open() {
		keys.switch("keysConfig");
		labels.config.match.hide();
		labels.config.keys.show();
		this.fillValues(settings.keymap);
	}

	public submit() {
		if (this.apply()) {
			this.close();
		}
	}

	public close() {
		keys.switch("matchConfig");
		labels.config.match.show();
		labels.config.keys.hide();
	}

	public fillValues(map: Keymap) {
		labels.config.keymappingform.children().remove("*");
		const info = defaults.keymaps["info"];

		const m = 10; // 19
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
			input.onkeydown = function(this, event: KeyboardEvent) {
				input.value = "";
			};
			input.onkeyup = function(this, event: KeyboardEvent) {
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

	public apply(): boolean {
		// save data from input elements
		const inputs = labels.config.keymappingform.children().children().filter(":input");
		const values = new Array();
		let valid: boolean = true;
		for (const input of inputs) {
			let i = <HTMLInputElement>input;
			if (values.indexOf(i.value) > -1) {
				input.classList.add(labels.css.invalid);
				inputs[values.indexOf(i.value)].classList.add(labels.css.invalid);
				valid = false;
			}
			values.push(i.value);
		}

		if (valid) {
			for (const input of inputs) {
				let i = <HTMLInputElement>input;
				settings.keymap[i.name] = i.value;
			}
		}

		return valid;
	}

	loadDefaults() {
		const val = <string>labels.config.selectDefaultKeymapping.val();
		if (val != undefined && val != "0") {
			this.fillValues(defaults.keymaps[val]);
		}
	}
}

/***
BOARD
***/
class Board {
	private names: Names = new Names();
	private scores: Scores = new Scores();
	private timer: Timer = new Timer();

	constructor() {
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

	private defineLabels() {
		// TODO remove hard coded selector
		$(".active").hide();
		$(".scoreside").removeClass(labels.css.showWarning);

		// reassign default labels if necessary
		// TODO automated label selection
		if (settings.match.wrestlersAboveTeams) {
			labels.boxes = defaults.boxes.wrestlersAboveTeams;
		} else {
			labels.boxes = defaults.boxes.wrestlersBelowTeams;
		}
	}

	private loadTitleBar() {
		labels.titlebar.fullscreenButton.html(settings.lang.fullscreenOn);

		labels.titlebar.div.mouseenter(function(this: any) {
			clearTimeout($(this).data('timeoutId'));
			$(this).find("ul").slideDown();
		}).mouseleave(function(this: any) {
			const someElement = $(this),
				timeoutId = setTimeout(function() {
					someElement.find("ul").slideUp();
				}, 2000);
			//set the timeoutId, allowing us to clear this trigger if the mouse comes back over
			someElement.data("timeoutId", timeoutId);
		});
		labels.titlebar.div.trigger("mouseenter");
		labels.titlebar.div.trigger("mouseleave");
	}

	updateTitleBar() {
		if (fscreen.is()) {
			labels.titlebar.fullscreenButton.html(settings.lang.fullscreenOff);
			labels.titlebar.settingsButton.hide();
		} else {
			labels.titlebar.fullscreenButton.html(settings.lang.fullscreenOn);
			labels.titlebar.settingsButton.show();
		}
	}

	toggleFullscreen() {
		if (fscreen.is()) {
			fscreen.exitFullscreen(labels.board);
		} else {
			fscreen.requestFullscreen(labels.board);
		}
	}

	private setTheme() {
		if (!settings.match.theme) {
			const link = '<link rel="stylesheet" type="text/css" href="' + labels.css.darkTheme + '">'
			$("head").append(link);
		} else {
			$('link[href*="' + labels.css.darkTheme + '"]').remove();
		}
	}

	public isClockRunning(): boolean {
		return this.timer.anyClockRunning();
	}

	public next() {
		if (!this.timer.anyClockRunning()) {
			this.names.move(1);
			this.reset();
		}
	}

	public prev() {
		if (!this.timer.anyClockRunning()) {
			this.names.move(-1);
			this.reset();
		}
	}

	public reset() {
		if (!this.timer.anyClockRunning()) {
			this.scores.reset();
			this.timer.reset();
		}
	}

	public toggle() {
		this.timer.toggle();
	}

	/*
	Active time
	*/
	public activeRed() {
		this.timer.toggleActiveTime(true);
	}

	public activeBlu() {
		this.timer.toggleActiveTime(false);
	}

	/*
	Scores
	*/
	public incrRedWres() { this.scores.deltaRedWres(1); }
	public incrRedTeam() { this.scores.deltaRedTeam(1); }
	public incrBluWres() { this.scores.deltaBluWres(1); }
	public incrBluTeam() { this.scores.deltaBluTeam(1); }
	public decrRedWres() { this.scores.deltaRedWres(-1); }
	public decrRedTeam() { this.scores.deltaRedTeam(-1); }
	public decrBluWres() { this.scores.deltaBluWres(-1); }
	public decrBluTeam() { this.scores.deltaBluTeam(-1); }

	// warnings
	public incrWarnRed() {
		this.scores.deltaRedWarn(1);
	}
	public decrWarnRed() {
		this.scores.deltaRedWarn(-1);
	}
	public incrWarnBlu() {
		this.scores.deltaBluWarn(1);
	}
	public decrWarnBlu() {
		this.scores.deltaBluWarn(-1);
	}
}

const settings: Settings = clone(defaults.settings);
const keys = new Keys();
const board = new Board();
const ow = new Overview();
const keysConfig = new KeysConfig();
const matchConfig = new MatchConfig();

if (fscreen.fullscreenEnabled) {
	fscreen.addEventListener("fullscreenchange",
		function() {
			board.updateTitleBar();
		}, false);
}
