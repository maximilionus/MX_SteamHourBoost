const SteamUser = require('steam-user');
const Telegraf = require('telegraf');
const Dotenv = require('dotenv');
const SocksAgent = require('socks5-https-client/lib/Agent');
Dotenv.config();

const forceIdle = JSON.parse(process.env.STEAM_FORCEIDLE);
var idleList_shuffle_ms = JSON.parse(process.env.CORE_SHUFFLE_DELAY);

var core_data = {
	idlingProcessStatus: true,
	timeFromStartup: 0,
	timeFromShuffle: 0,
	lastShuffleType: 'none',
	steam_AUTH_Code: process.env.STEAM_2FA,
	restartDate: new Date(),
	tbot_userLogged: false
};

//Init timers
setInterval(function () {
	if (core_data.idlingProcessStatus) {
		core_data.timeFromShuffle++;
	};
	core_data.timeFromStartup++;
}, 1000);

var idleList = JSON.parse(process.env.STEAM_GAMEIDS.split(",")).sort(function () { return .5 - Math.random(); }); //Init idleList
setInterval(function () {
	if (core_data.idlingProcessStatus) {
		idleList = idleList.sort(function () { return .5 - Math.random(); });
		SteamAPI.gamesPlayed(idleList, forceIdle);
		core_data.timeFromShuffle = 0;
		core_data.lastShuffleType = 'Scheduled';
		console.log(`Idle array successfully shuffled and restarted idle process for GameID${Array.isArray(idleList) && idleList.length > 1 ? 's' : ''} [${idleList}]`);
	};
}, idleList_shuffle_ms);
//Activate interval for idleList shuffle


if (idleList.length < 1) {
	console.log('No games selected');
	process.exit();
};

const SteamAPI = new SteamUser();

const logOnDetails = {
	'accountName': process.env.STEAM_LOGIN,
	'password': process.env.STEAM_PASSWORD,
	'twoFactorCode': core_data.steam_AUTH_Code,
	'dontRememberMachine': true
};

SteamAPI.on('loggedOn', details => {
	SteamAPI.getNicknames(() => {
		console.log(`Logged into Steam as '${SteamAPI.accountInfo.name}' ${SteamAPI.steamID.getSteam3RenderedID()}`);
		SteamAPI.setPersona(SteamUser.EPersonaState.Online);
		SteamAPI.gamesPlayed(idleList, forceIdle);
		console.log(`Idling for GameID${Array.isArray(idleList) && idleList.length > 1 ? 's' : ''} [${idleList}]`);
	});
});

// Some error occurred during logon
SteamAPI.on('error', e => console.log(e));



//Init telegram bot
if (JSON.parse(process.env.TBOT_ENABLE)) {
	var tg_bot;

	//Use SOCKS5 proxy if Telegram API blacklisted
	if (process.env.TBOT_USESOCKS !== 'false') {
		const socksAgent = new SocksAgent({
			socksHost: process.env.TBOT_SOCKS_HOST,
			socksPort: process.env.TBOT_SOCKS_PORT
		});
		tg_bot = new Telegraf(process.env.TBOT_TOKEN, {
			telegram: { agent: socksAgent }
		});
	} else { tg_bot = new Telegraf(process.env.TBOT_TOKEN); };

	function forceChangeIdleArr(ctx){
		inputString = ctx.message.text.replace('/set_idle_array', '');

		idleList = JSON.parse((inputString).split(","));
		idleList = idleList.sort(function () { return .5 - Math.random(); });
		SteamAPI.gamesPlayed(idleList, forceIdle);
		core_data.timeFromShuffle = 0;
		core_data.lastShuffleType = 'Forced (Idle array update)';

		ctx.reply('Idle array was successfully force overridden');
		console.log(`TBOT: Idle array was force overridden by user\nNew array: [${idleList}]`);
	};

	function resetOverriddenIdleList(ctx){
		idleList = JSON.parse(process.env.STEAM_GAMEIDS.split(",")).sort(function () { return .5 - Math.random(); });
		SteamAPI.gamesPlayed(idleList, forceIdle);
		core_data.timeFromShuffle = 0;
		core_data.lastShuffleType = 'Forced (Reset idle list to env)';

		ctx.reply('Idle array was reseted to process.env state');
		console.log('TBOT: Idle array was reseted to process.env state');
	}

	function switchIdleStatus(ctx) {
		if (core_data.idlingProcessStatus) {
			core_data.idlingProcessStatus = false;
			core_data.timeFromShuffle = 0;
			SteamAPI.gamesPlayed([], true);
			SteamAPI.setPersona(SteamUser.EPersonaState.Online);
		} else {
			core_data.idlingProcessStatus = true;
			SteamAPI.gamesPlayed(idleList, forceIdle);
		};
		core_data.lastShuffleType = 'Forced (Idle switch)';
		ctx.reply(`Idling status was changed to ${core_data.idlingProcessStatus}`);
		console.log(`TBOT: Idling status was changed to ${core_data.idlingProcessStatus}`);
	};

	function sendFromUnauthToAdmin(ctx){
		console.log(`TBOT: Received message from unauthorized user\n- ${ctx.message.from.username}[id:'${ctx.message.from.id}']: ${ctx.message.text}`);
		tg_bot.telegram.sendMessage(process.env.TBOT_ACCESSID, `-----\nReceived message from unauthorized user\n\n${ctx.message.from.username}[id:'${ctx.message.from.id}']: ${ctx.message.text}\n-----`);
	};

	function set2FAkeyAndRelog(key_str) {
		SteamAPI.logOff();
		let key_str_final = key_str.replace('/set2fa', '');
		let logOnDetails = {
			'accountName': process.env.STEAM_LOGIN,
			'password': process.env.STEAM_PASSWORD,
			'twoFactorCode': key_str_final,
			'dontRememberMachine': true
		};
		
		SteamAPI.logOn(logOnDetails);
	};

	function checkTGUser(userId) {
		if (userId == JSON.parse(process.env.TBOT_ACCESSID)) {
			console.log(`TBOT: Authorized user '${userId}' is online`);
			core_data.tbot_userLogged = true;
			tg_bot.telegram.sendMessage(userId, 'You are connected to MXSteamHourBooster control system. Welcome!');
			
			SteamAPI.on('friendMessage', function(){
				console.log('TBOT: [STEAM] - You have a new chat message.');
				tg_bot.telegram.sendMessage(JSON.parse(process.env.TBOT_ACCESSID), "[STEAM] - You have a new chat message.");
			});
			
			//
			tg_bot.command('get_env_idle_array', (ctx) => ctx.reply(process.env.STEAM_GAMEIDS));
			//
			tg_bot.command('get_idle_array', (ctx) => ctx.reply(idleList));
			//
			tg_bot.command('set_idle_array', (ctx) => forceChangeIdleArr(ctx));
			//
			tg_bot.command('reset_idle_array', (ctx) => resetOverriddenIdleList(ctx));
			//
			tg_bot.command('info', (ctx) => ctx.reply(`
			=====\nLast restart date: ${core_data.restartDate}\n=====\nIdling status: [${core_data.idlingProcessStatus}]\n=====\nTime from script run (h/m/s):\n${Math.floor(core_data.timeFromStartup / 3600)}:${Math.floor(core_data.timeFromStartup % 3600 / 60)}:${core_data.timeFromStartup % 3600 % 60}\nTime from last idle array shuffle (h/m/s):\n${Math.floor(core_data.timeFromShuffle / 3600)}:${Math.floor(core_data.timeFromShuffle % 3600 / 60)}:${Math.floor(core_data.timeFromShuffle % 3600 % 60)}\n- Last shuffle type: ${core_data.lastShuffleType}\n=====
			`));
			//
			tg_bot.command('idle_switch', (ctx) => switchIdleStatus(ctx));
			//
			tg_bot.command('set2fa', (ctx) => set2FAkeyAndRelog(ctx.message.text))
			//
			tg_bot.command('restart', () => (process.exit()));
		} else {
			//Send all messages from unauthorized users to log
			console.log(`TBOT: Access for user[${userId}] was denied.`);
			tg_bot.on('message', (ctx) => sendFromUnauthToAdmin(ctx));
		};
	};

	tg_bot.start((ctx) => checkTGUser(ctx.from.id));
	tg_bot.launch().then(console.log("Telegram control bot successfully connected and ready to work"));
} else {
	console.log("TBOT: Disabled by user, not initializing.");
};


SteamAPI.logOn(logOnDetails);