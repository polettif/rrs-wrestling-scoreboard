const defaults = {
	keymaps: <Tab<Keymap>>{
		"info": {
			toggle: "Start/Stop Uhr",
			incrRedWres: "Einzelpunkte Rot +1",
			decrRedWres: "Einzelpunkte Rot -1",
			incrRedTeam: "Teampunkte Rot +1",
			decrRedTeam: "Teampunkte Rot -1",
			activeRed: "Aktivzeit Rot",
			incrWarnRed: "Verwarnung Rot +1",
			decrWarnRed: "Verwarnung Rot -1",
			prev: "Vorheriger Kampf",
			reset: "Kampf zurücksetzen",
			openMatchConfig: "Einstellungen öffnen",
			incrBluWres: "Einzelpunkte Blau +1",
			decrBluWres: "Einzelpunkte Blau -1",
			incrBluTeam: "Teampunkte Blau +1",
			decrBluTeam: "Teampunkte Blau -1",
			activeBlu: "Aktivzeit Blau",
			incrWarnBlu: "Verwarnung Blau +1",
			decrWarnBlu: "Verwarnung Blau -1",
			next: "Nächster Kampf",
			toggleOverview: "Matchübersicht öffnen"
		},
		"tastatur": {
			toggle: "space",
			next: "z",
			prev: "t",
			reset: "y",
			incrRedWres: "f",
			decrRedWres: "d",
			incrRedTeam: "v",
			decrRedTeam: "c",
			incrBluWres: "j",
			decrBluWres: "k",
			incrBluTeam: "n",
			decrBluTeam: "m",
			activeRed: "e",
			activeBlu: "i",
			incrWarnRed: "w",
			decrWarnRed: "q",
			incrWarnBlu: "o",
			decrWarnBlu: "p",
			openMatchConfig: ",",
			toggleOverview: "1"
		},
		"alos": {
			toggle: "m",
			next: "x",
			prev: "c",
			reset: "v",
			incrRedWres: "f",
			decrRedWres: "d",
			incrRedTeam: "s",
			decrRedTeam: "j",
			incrBluWres: "r",
			decrBluWres: "e",
			incrBluTeam: "w",
			decrBluTeam: "u",
			activeRed: "f1",
			activeBlu: "2",
			incrWarnRed: "5",
			decrWarnRed: "f2",
			incrWarnBlu: "4",
			decrWarnBlu: "3",
			openMatchConfig: "6",
			toggleOverview: "7" // start/7 free
		}
	},
	fights: {
		"mm": [
			{
				red: "",
				blu: "",
				weight: "57",
				greco: false
			},
			{
				red: "",
				blu: "",
				weight: "61",
				greco: true
			},
			{
				red: "",
				blu: "",
				weight: "65",
				greco: false
			},
			{
				red: "",
				blu: "",
				weight: "70",
				greco: true
			},
			{
				red: "",
				blu: "",
				weight: "74",
				greco: false
			},
			{
				red: "",
				blu: "",
				weight: "74",
				greco: true
			},
			{
				red: "",
				blu: "",
				weight: "80",
				greco: false
			},
			{
				red: "",
				blu: "",
				weight: "86",
				greco: true
			},
			{
				red: "",
				blu: "",
				weight: "97",
				greco: false
			},
			{
				red: "",
				blu: "",
				weight: "130",
				greco: true
			}
		],
	},
	buzzerFiles: <Tab<string>>{
		"IndustrialAlarm": "audio/IndustrialAlarm.mp3",
		"Schiff": "audio/AirHornShip.mp3",
		"AirHorn": "audio/AirHorn.mp3",
		"Buzz": "audio/Buzz.mp3",
		"DoorBuzzer": "audio/DoorBuzzer.mp3",
		"(Kein Ton)": ""
	},
	settings: <Settings>{},
	labels: <any>{},
	boxes: <any>{}
};

defaults.settings = {
	keymap: defaults.keymaps["tastatur"],
	fights: defaults.fights["mm"],
	match: {
		red: "RR Schattdorf",
		blu: "Gäste",
		showWeigth: true,
		lastPeriod: 2,
		buzzer: "IndustrialAlarm",
		mmSet: true,
		showTeams: true,
		sponsors: {
			directoryLight: "sponsoren/light/",
			directoryDark: "sponsoren/dark/",
			interval: 45,
			quantity: 3,
			show: true
		},
		theme: false,
		wrestlersAboveTeams: true
	},
	lang: {
		periodSuffix: ". Halbzeit",
		weightSuffix: " kg",
		greco: "Greco",
		nonGreco: "Freistil",
		grecoShort: "G",
		nonGrecoShort: "F",
		fullscreenOn: "Vollbild ein",
		fullscreenOff: "Vollbild aus"
	},
	timer: {
		period: {
			name: "period",
			minutes: 3,
			seconds: 0,
			countdown: true,
			subsecond: 10,
			alwaysLeadZero: true
		},
		pause: {
			name: "pause",
			minutes: 0,
			seconds: 30,
			countdown: true,
			subsecond: 0,
			alwaysLeadZero: false
		},
		active: {
			name: "active",
			minutes: 0,
			seconds: 30,
			countdown: true,
			subsecond: 0,
			alwaysLeadZero: false
		}
	}
};

defaults.boxes.wrestlersAboveTeams = {
	red: {
		team: {
			box: $(".box.foot.red"),
			name: $("#red-foot-name"),
			score: $("#red-foot-score")
		},
		wres: {
			box: $(".box.head.red"),
			name: $("#red-head-name"),
			score: $("#red-head-score"),
			time: $("#activeclock-red-head"),
			warn: [
				$(".head.red .w1"),
				$(".head.red .w2"),
				$(".head.red .w3")
			]
		}
	},
	blu: {
		team: {
			box: $(".box.foot.blu"),
			name: $("#blu-foot-name"),
			score: $("#blu-foot-score")
		},
		wres: {
			box: $(".box.head.blu"),
			name: $("#blu-head-name"),
			score: $("#blu-head-score"),
			time: $("#activeclock-blu-head"),
			warn: [
				$(".head.blu .w1"),
				$(".head.blu .w2"),
				$(".head.blu .w3")
			]
		}
	}
}

defaults.boxes.wrestlersBelowTeams = {
	red: {
		team: {
			box: $(".box.head.red"),
			name: $("#red-head-name"),
			score: $("#red-head-score")
		},
		wres: {
			box: $(".box.foot.red"),
			name: $("#red-foot-name"),
			score: $("#red-foot-score"),
			time: $("#activeclock-red-foot"),
			warn: [
				$(".foot.red .w1"),
				$(".foot.red .w2"),
				$(".foot.red .w3")
			]
		}
	},
	blu: {
		team: {
			box: $(".box.head.blu"),
			name: $("#blu-head-name"),
			score: $("#blu-head-score")
		},
		wres: {
			box: $(".box.foot.blu"),
			name: $("#blu-foot-name"),
			score: $("#blu-foot-score"),
			time: $("#activeclock-blu-foot"),
			warn: [
				$(".foot.blu .w1"),
				$(".foot.blu .w2"),
				$(".foot.blu .w3")
			]
		}
	}
}


defaults.labels = {
	boxes: defaults.boxes.wrestlersAboveTeams,
	match: {
		weight: $("#weight"),
		style: $("#style"),
		periodInfo: $("#periodInfo"),
		periodClock: $("#periodClock"),
		pauseClock: $("#pauseClock")
	},
	titlebar: {
		div: $("#titlebar"),
		settingsButton: $("#settingsButton"),
		fullscreenButton: $("#fullscreenButton"),
	},
	config: {
		match: $("#matchConfig"),
		keys: $("#keysConfig"),
		keymappingform: $("#keymappingform"),
		selectDefaultWeights: $("#select-default-weights"),
		selectDefaultKeymapping: $("#select-default-keymapping")
	},
	sponsor: $("#sponsor"),
	board: document.querySelector("#board"),
	overview: {
		layer: $("#overview"),
		red: $("#overviewRedBox"),
		blu: $("#overviewBluBox"),
		boxes: $("#overview span"),
		table: $("#overview table"),
		logo: $("#overview img")
	},
	css: {
		showWarning: "warning",
		hideScore: "hideScore",
		invalid: "invalid",
		timeseparator: "pt",
		darkTheme: "src/css/dark.css"
	},
	html: {
		inputname: {
			weight: "weight",
			greco: "greco",
			red: "red",
			blu: "blu"
		},
	},
	loadsave: {
		saveFileName: "rrs-anzeigetafel-einstellungen.json",
		dummyAnchor: <HTMLAnchorElement>document.getElementById("dummyAnchor"),
		fileInput: <HTMLInputElement>document.getElementById("fileInput")
	},
};
