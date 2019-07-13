const SteamUser = require('steam-user')
const Telegraf = require('telegraf')
const Dotenv = require('dotenv')
Dotenv.config()

const forceIdle = JSON.parse(process.env.STEAM_FORCEIDLE)
var idleList_shuffle_ms = JSON.parse(process.env.CORE_SHUFFLE_DELAY)

//Init timers
var data_collected = {
	idlingProcessStatus: true,
	timeFromStartup: 0,
	timeFromShuffle: 0,
	lastShuffleType: 'none',
	restartDate: new Date()
}
setInterval(function () {
	if (data_collected.idlingProcessStatus) {
		data_collected.timeFromShuffle++
	}
	data_collected.timeFromStartup++
}, 1000)

var idleList = JSON.parse(process.env.STEAM_GAMEIDS.split(",")).sort(function () { return .5 - Math.random(); }) //Init idleList
setInterval(function () {
	if (data_collected.idlingProcessStatus) {
		idleList = idleList.sort(function () { return .5 - Math.random(); })
		client.gamesPlayed(idleList, forceIdle)
		data_collected.timeFromShuffle = 0
		data_collected.lastShuffleType = 'Scheduled'
		console.log(`Idle array successfully shuffled and restarted idle process for GameID${Array.isArray(idleList) && idleList.length > 1 ? 's' : ''} [${idleList}]`)
	}
}, idleList_shuffle_ms)
//Activate interval for idleList shuffle


if (idleList.length < 1) {
	console.log('No games selected')
	process.exit()
}

const client = new SteamUser()

const logOnDetails = {
	'accountName': process.env.STEAM_LOGIN,
	'password': process.env.STEAM_PASSWORD,
	'twoFactorCode': process.env.STEAM_2FA,
	'dontRememberMachine': true
}

client.on('loggedOn', details => {
	client.getNicknames(() => {
		console.log(`Logged into Steam as '${client.accountInfo.name}' ${client.steamID.getSteam3RenderedID()}`);
		client.setPersona(SteamUser.EPersonaState.Busy);
		client.gamesPlayed(idleList, forceIdle);
		console.log(`Idling for GameID${Array.isArray(idleList) && idleList.length > 1 ? 's' : ''} [${idleList}]`)
	})
})

// Some error occurred during logon
client.on('error', e => console.log(e));

client.logOn(logOnDetails)


//Init telegram bot
if (JSON.parse(process.env.TBOT_ENABLE)) {
	const tg_bot = new Telegraf(process.env.TBOT_TOKEN)

	function forceChangeIdleArr(ctx){
		inputString = ctx.message.text.replace('/set_idle_array', '')

		idleList = JSON.parse((inputString).split(","))
		idleList = idleList.sort(function () { return .5 - Math.random(); })
		client.gamesPlayed(idleList, forceIdle);
		data_collected.timeFromShuffle = 0;
		data_collected.lastShuffleType = 'Forced (Idle array update)'

		ctx.reply('Idle array was successfully force overridden')
		console.log(`TBOT: Idle array was force overridden by user\nNew array: [${idleList}]`)
	}

	function resetOverriddenIdleList(ctx){
		idleList = JSON.parse(process.env.STEAM_GAMEIDS.split(",")).sort(function () { return .5 - Math.random(); })
		client.gamesPlayed(idleList, forceIdle)
		data_collected.timeFromShuffle = 0
		data_collected.lastShuffleType = 'Forced (Reset idle list to env)'

		ctx.reply('Idle array was reseted to process.env state')
		console.log('TBOT: Idle array was reseted to process.env state')
	}

	function switchIdleStatus(ctx){
		if (data_collected.idlingProcessStatus){
			data_collected.idlingProcessStatus = false
			data_collected.timeFromShuffle = 0
			data_collected.lastShuffleType = 'Forced (Idle switch)'

			client.gamesPlayed([], true)
		} else {
			data_collected.idlingProcessStatus = true
			client.gamesPlayed(idleList, forceIdle)
		}
		ctx.reply(`Idling status was changed to ${data_collected.idlingProcessStatus}`)
		console.log(`TBOT: Idling status was changed to ${data_collected.idlingProcessStatus}`)
	}

	function sendFromUnauthToAdmin(ctx){
		console.log(`TBOT: Received message from unauthorized user\n- ${ctx.message.from.username}[id:'${ctx.message.from.id}']: ${ctx.message.text}`)
		tg_bot.telegram.sendMessage(process.env.TBOT_ACCESSID, `-----\nReceived message from unauthorized user\n\n${ctx.message.from.username}[id:'${ctx.message.from.id}']: ${ctx.message.text}\n-----`)
	}

	function checkTGUser(userId) {
		if (userId == JSON.parse(process.env.TBOT_ACCESSID)) {
			console.log(`TBOT: Authorized user '${userId}' is online`)
			tg_bot.telegram.sendMessage(userId, 'You are connected to MXSteamHourBooster control system. Welcome!');
			//
			tg_bot.command('get_env_idle_array', (ctx) => ctx.reply(process.env.STEAM_GAMEIDS))
			//
			tg_bot.command('get_idle_array', (ctx) => ctx.reply(idleList))
			//
			tg_bot.command('set_idle_array', (ctx) => forceChangeIdleArr(ctx))
			//
			tg_bot.command('reset_idle_array', (ctx) => resetOverriddenIdleList(ctx))
			//
			tg_bot.command('set_idleshuffle_time',(ctx) => idleList_shuffle_ms=ctx.message.text.replace('/set_idleshuffle_time ', ''))
			//
			tg_bot.command('info', (ctx) => ctx.reply(`
			=====\nLast restart date: ${data_collected.restartDate}\n=====\nIdling status: [${data_collected.idlingProcessStatus}]\n=====\nTime from script run (h/m/s):\n${Math.floor(data_collected.timeFromStartup / 3600)}:${Math.floor(data_collected.timeFromStartup % 3600 / 60)}:${data_collected.timeFromStartup % 3600 % 60}\nTime from last idle array shuffle (h/m/s):\n${Math.floor(data_collected.timeFromShuffle / 3600)}:${Math.floor(data_collected.timeFromShuffle % 3600 / 60)}:${Math.floor(data_collected.timeFromShuffle % 3600 % 60)}\n- Last shuffle type: ${data_collected.lastShuffleType}\n=====
			`))
			//
			tg_bot.command('idle_switch', (ctx) => switchIdleStatus(ctx)) 
		} else {
			console.log(`TBOT: Access for user[${userId}] was denied.`)
			tg_bot.on('message', (ctx) => sendFromUnauthToAdmin(ctx)) //TODO: Doesn't work for some reason
			//Send all messages from unauthorized users to log
		}
	}

	tg_bot.start((ctx) => checkTGUser(ctx.from.id))
	tg_bot.launch().then(console.log("Telegram control bot successfully connected and ready to work"))
} else {
	console.log("TBOT: Disabled by user, not initializing.")
}