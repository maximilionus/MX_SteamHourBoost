const SteamUser = require('steam-user');
const Telegraf = require('telegraf');
const telegraf_extra = require('telegraf/extra');
const telegraf_markdown = telegraf_extra.markdown();
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
	restartDate: new Date()
};

// Init timers
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
// Activate interval for idleList shuffle


if (idleList.length < 1) {
	console.log('No games selected');
	process.exit();
};

const SteamAPI = new SteamUser();

const logOnDetails = {
	'accountName': process.env.STEAM_LOGIN,
	'password': Buffer.from(process.env.STEAM_PASSWORD, 'base64').toString('ascii'),
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

SteamAPI.on('error', e => console.log(e));



// Init telegram bot
if (JSON.parse(process.env.TBOT_ENABLE)) {
	var tg_bot;
	
	/* * * * * * * * * * * * * * * * * */
	const TBOT_UNAUTHWARNING = "Not whitelisted user request detected";
	/* consts with all static strings */
	
	if (process.env.TBOT_USESOCKS !== 'false') {
		const socksAgent = new SocksAgent({
			socksHost: process.env.TBOT_SOCKS_HOST,
			socksPort: process.env.TBOT_SOCKS_PORT
		});
		tg_bot = new Telegraf(process.env.TBOT_TOKEN, {
			telegram: { agent: socksAgent }
		});
	} else { tg_bot = new Telegraf(process.env.TBOT_TOKEN); };
	
	function checkTGUser(userId) { // ctx.message.chat.id
		let AccessAllowed = false;
		(userId === JSON.parse(process.env.TBOT_ACCESSID)) ? (AccessAllowed = true) : (AccessAllowed = false);
		return AccessAllowed;
	};

	function printIdleArray(ctx) {
		if (checkTGUser(ctx.message.chat.id)) {
			ctx.reply(idleList);
		} else {
			console.log(`[TBOT]=>[SECURITY]>[/get_idle_array] : ${TBOT_UNAUTHWARNING}. User: id[${ctx.message.chat.id}], name[${ctx.message.from.username}]`);
		};
	};

	function printIdleArray_FromEnv(ctx) {
		if (checkTGUser(ctx.message.chat.id)) {
			ctx.reply(process.env.STEAM_GAMEIDS);
		} else {
			console.log(`[TBOT]=>[SECURITY]>[/get_env_idle_array] : ${TBOT_UNAUTHWARNING}. User: id[${ctx.message.chat.id}], name[${ctx.message.from.username}]`);
		};
	};

	function forceChangeIdleArr(ctx){
		if(checkTGUser(ctx.message.chat.id)) {
			inputString = ctx.message.text.replace('/set_idle_array', '');
			
			idleList = JSON.parse((inputString).split(","));
			idleList = idleList.sort(function () { return .5 - Math.random(); });
			SteamAPI.gamesPlayed(idleList, forceIdle);
			core_data.timeFromShuffle = 0;
			core_data.lastShuffleType = 'Forced (Idle array update)';
	
			ctx.reply('*Idle array* was successfully force overridden', telegraf_markdown);
			console.log(`[TBOT] : Idle array was force overridden by user\nNew array: [${idleList}]`);
		} else {
			console.log(`[TBOT]=>[SECURITY]>[/set_idle_array] : ${TBOT_UNAUTHWARNING}. User: id[${ctx.message.chat.id}], name[${ctx.message.from.username}]`);
		};
	};

	function resetOverriddenIdleList(ctx){
		if(checkTGUser(ctx.message.chat.id)) {
			idleList = JSON.parse(process.env.STEAM_GAMEIDS.split(",")).sort(function () { return .5 - Math.random(); });
			SteamAPI.gamesPlayed(idleList, forceIdle);
			core_data.timeFromShuffle = 0;
			core_data.lastShuffleType = 'Forced (Reset idle list to env)';

			ctx.reply('Idle array was _reseted_ to `process.env` state', telegraf_markdown);
			console.log('[TBOT] : Idle array was reseted to process.env state');
		} else {
			console.log(`[TBOT]=>[SECURITY]>[/reset_idle_array] : ${TBOT_UNAUTHWARNING}. User: id[${ctx.message.chat.id}], name[${ctx.message.from.username}]`);
		};
	};

	function printStatusInfo(ctx) {
		if(checkTGUser(ctx.message.chat.id)) {
			let info_time_final = {
				from_restart: {
					days: Math.floor(core_data.timeFromStartup / 3600 / 24),
					hours: Math.floor(core_data.timeFromStartup / 3600) - ((Math.floor(core_data.timeFromStartup / 3600 / 24)) * 24),
					minutes: Math.floor(core_data.timeFromStartup % 3600 / 60),
					seconds: core_data.timeFromStartup % 3600 % 60
				},
				from_idle_shuffle: {
					days: Math.floor(core_data.timeFromShuffle/ 3600 / 24),
					hours: Math.floor(core_data.timeFromShuffle / 3600),
					minutes: Math.floor(core_data.timeFromShuffle % 3600 / 60) - ((Math.floor(core_data.timeFromShuffle / 3600 / 24)) * 24),
					seconds: Math.floor(core_data.timeFromShuffle % 3600 % 60)
				}
			};
			ctx.reply(`\u0060[CURRENT STATUS REPORT]\u0060\n=====\n▫️ *Last restart date* :\n\u0060[ ${core_data.restartDate} ]\u0060\n▫️ *Idling status* :\n\u0060[ ${core_data.idlingProcessStatus} ]\u0060\n▫️ *Steam MSG Notifications system status* :\n\u0060[ ${allowSteamMSGNotifications} ]\u0060\n=====\n▫️ *Time from script run* _(d/h/m/s)_ :\n\u0060[ ${info_time_final.from_restart.days}:${info_time_final.from_restart.hours}:${info_time_final.from_restart.minutes}:${info_time_final.from_restart.seconds} ]\u0060\n▫️ *Time from last idle array shuffle* _(d/h/m/s)_ :\n\u0060[ ${info_time_final.from_idle_shuffle.days}:${info_time_final.from_idle_shuffle.hours}:${info_time_final.from_idle_shuffle.minutes}:${info_time_final.from_idle_shuffle.seconds} ]\u0060\n▫️ *Last shuffle type* :\n\u0060[ ${core_data.lastShuffleType} ]\u0060\n=====`, telegraf_markdown);
		} else {
			console.log(`[TBOT]=>[SECURITY]>[/info] : ${TBOT_UNAUTHWARNING}. User: id[${ctx.message.chat.id}], name[${ctx.message.from.username}]`);
		};
	};

	function switchIdleStatus(ctx) {
		if(checkTGUser(ctx.message.chat.id)) {
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
			ctx.reply(`Idling status was changed to \u0060${core_data.idlingProcessStatus}\u0060`, telegraf_markdown);
			console.log(`[TBOT] : Idling status was changed to ${core_data.idlingProcessStatus}`);
		} else {
			console.log(`[TBOT]=>[SECURITY]>[/idle_switch] : ${TBOT_UNAUTHWARNING}. User: id[${ctx.message.chat.id}], name[${ctx.message.from.username}]`);
		};
	};

	function set2FAkeyAndRelog(ctx) {
		if(checkTGUser(ctx.message.chat.id)) {
			SteamAPI.logOff();
			let key_str_final = ctx.message.text.replace('/set2fa', '');
			let logOnDetails = {
				'accountName': process.env.STEAM_LOGIN,
				'password': Buffer.from(process.env.STEAM_PASSWORD, 'base64').toString('ascii'),
				'twoFactorCode': key_str_final,
				'dontRememberMachine': true
			};
			
			SteamAPI.logOn(logOnDetails);
			ctx.reply('2FA Key was successfully set and Steam Client recreated.');
			core_data.timeFromShuffle = 0;
			core_data.lastShuffleType = 'Forced (Set 2FA key with steam client relog)';
		} else {
			console.log(`[TBOT]=>[SECURITY]>[/set2fa] : ${TBOT_UNAUTHWARNING}. User: id[${ctx.message.chat.id}], name[${ctx.message.from.username}]`);
		};
	};

	function restartIdleBot(ctx) {
		if (checkTGUser(ctx.message.chat.id))
		{
			process.exit();
		} else {
			console.log(`[TBOT]=>[SECURITY]>[/restart] : ${TBOT_UNAUTHWARNING}. User: id[${ctx.message.chat.id}], name[${ctx.message.from.username}]`);
		};
	};

	var allowSteamMSGNotifications = false;
	function switch_SteamMSGAllowNotifications(ctx) {
		if (checkTGUser(ctx.message.chat.id)) {
			allowSteamMSGNotifications ? (allowSteamMSGNotifications = false) : (allowSteamMSGNotifications = true);
			console.log(`[TBOT]>[/snotif_switch] : Steam message notification system status: ${allowSteamMSGNotifications}`)
			ctx.reply(`Steam message notification system status: \u0060${allowSteamMSGNotifications}\u0060`, telegraf_markdown);
		} else {
			console.log(`[TBOT]=>[SECURITY]>[/restart] : ${TBOT_UNAUTHWARNING}. User: id[${ctx.message.chat.id}], name[${ctx.message.from.username}]`);
		};
	};

	SteamAPI.on('friendMessage', function(){
		if (allowSteamMSGNotifications) {
			console.log('[TBOT]=>[STEAM] : You have a new chat message.');
			tg_bot.telegram.sendMessage(JSON.parse(process.env.TBOT_ACCESSID), "[STEAM] - You have a new chat message.");
		};
	});

	/* * * * * * * * * * * * */
	tg_bot.command('get_env_idle_array', (ctx) => printIdleArray_FromEnv(ctx));
	tg_bot.command('get_idle_array', (ctx) => printIdleArray(ctx));
	tg_bot.command('set_idle_array', (ctx) => forceChangeIdleArr(ctx));
	tg_bot.command('reset_idle_array', (ctx) => resetOverriddenIdleList(ctx));
	tg_bot.command('info', (ctx) => printStatusInfo(ctx));
	tg_bot.command('idle_switch', (ctx) => switchIdleStatus(ctx));
	tg_bot.command('set2fa', (ctx) => set2FAkeyAndRelog(ctx))
	tg_bot.command('restart', (ctx) => restartIdleBot(ctx));
	tg_bot.command('snotif_switch', (ctx) => switch_SteamMSGAllowNotifications(ctx));
	/* Init all bot commands */

	tg_bot.launch().then(function() {
		console.log("Telegram control bot is ready to work");
		tg_bot.telegram.sendMessage(process.env.TBOT_ACCESSID, "Telegram bot successfully connected and ready to work.");
	});
} else {
	console.log("[TBOT] : Disabled by user, not initializing.");
};


SteamAPI.logOn(logOnDetails);