interface Tab<T> {
	[index: string]: T;
	[index: number]: T;
}

interface Fight {
	red: string;
	blu: string;
	weight: string;
	greco: boolean;
}

interface Config {
	open(): void;
	apply(): boolean;
	submit(): void;
	close(): void;
	fillValues(s: Settings | Keymap): void;
}

/* CONFIG INTERFACES */

interface Settings {
	fights: Fight[],
	timer: {
		period: TimerParams,
		pause: TimerParams,
		active: TimerParams
	},
	lang: Language,
	match: MatchParams,
	keymap: Keymap
}

interface TimerParams {
	/* only loaded for period */ name: string,
	/* only loaded for period */ minutes: number,
	/* only loaded for period */ seconds: number,
	/* only loaded for period */ countdown: boolean,
	/* applied to all clocks */  subsecond: number,
	/* not loaded from file */   alwaysLeadZero: boolean
}

interface MatchParams {
	red: string,
	blu: string,
	showWeigth: boolean,
	lastPeriod: number;
	buzzer: string,
	mmSet: boolean,
	showTeams: boolean,
	sponsors: {
	/* not loaded from file */ directoryLight: string,
	/* not loaded from file */ directoryDark: string,
	/* not loaded from file */ interval: number,
	/* not loaded from file */ quantity: number,
		show: boolean
	},
	theme: boolean,
	wrestlersAboveTeams: boolean
}

interface Language {
	/* not loaded from file */ periodSuffix: string,
	/* not loaded from file */ weightSuffix: string,
	/* not loaded from file */ greco: string,
	/* not loaded from file */ nonGreco: string,
	/* not loaded from file */ grecoShort: string,
	/* not loaded from file */ nonGrecoShort: string,
	/* not loaded from file */ fullscreenOn: string,
	/* not loaded from file */ fullscreenOff: string
}

interface Keymap {
	[key: string]: string;
	toggle: string,
	next: string,
	prev: string,
	reset: string
	incrRedWres: string,
	incrRedTeam: string,
	incrBluWres: string,
	incrBluTeam: string,
	decrRedWres: string,
	decrRedTeam: string,
	decrBluWres: string,
	decrBluTeam: string,
	activeRed: string,
	activeBlu: string,
	incrWarnRed: string,
	decrWarnRed: string,
	incrWarnBlu: string,
	decrWarnBlu: string,
	openMatchConfig: string,
	toggleOverview: string
}
