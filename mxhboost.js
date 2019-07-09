const SteamUser = require('steam-user')
const Telegraf = require('telegraf')

const forceIdle = JSON.parse(process.env.STEAM_FORCEIDLE)
const idleList_shuffle_ms = JSON.parse(process.env.CORE_SHUFFLE_DELAY)

//Init timers
var data_collected = {
	timeFromStartup: 0,
	timeFromShuffle: 0
}
setInterval(function () {
	data_collected.timeFromStartup++
	data_collected.timeFromShuffle++
}, 1000)

//Activate interval for idleList shuffle
setInterval(function () {
	idleList = idleList.sort(function () { return .5 - Math.random(); })
	client.gamesPlayed(idleList, forceIdle);
	data_collected.timeFromShuffle = 0;
	console.log(`Idle array successfully shuffled and restarted idle process for GameID${Array.isArray(idleList) && idleList.length > 1 ? 's' : ''} [${idleList}]`)
}, idleList_shuffle_ms)

var idleList = JSON.parse(process.env.STEAM_GAMEIDS.split(",")).sort(function () { return .5 - Math.random(); })

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

client.logOn(logOnDetails) //TODO:Use in final build


//Init telegram bot
if (JSON.parse(process.env.TBOT_ENABLE)) {
	const tg_bot = new Telegraf(process.env.TBOT_TOKEN)

	function forceChangeIdleArr(ctx){
		inputString = ctx.message.text.replace('/set_idle_array', '')

		idleList = JSON.parse((inputString).split(","))
		idleList = idleList.sort(function () { return .5 - Math.random(); })
		client.gamesPlayed(idleList, forceIdle);
		data_collected.timeFromShuffle = 0;

		ctx.reply(`Idle array was successfully force overridden with\n${ctx.message.text.replace('/set_idle_array ', '')}\n\nFinal variant of array:\n${idleList}`)
		console.log(`TBOT: Idle array was force overridden by user\nNew array: [${idleList}]`)
	}

	function checkTGUser(userId) {
		if (userId == JSON.parse(process.env.TBOT_ACCESSID)) { //User id check
			console.log(`TBOT: Authorized user '${userId}' is online`)
			tg_bot.telegram.sendMessage(userId, 'You are connected to MXSteamHourBooster control system. Welcome!');
			//
			tg_bot.command('get_env_idle_array', (ctx) => ctx.reply(process.env.STEAM_GAMEIDS))
			//
			tg_bot.command('get_idle_array', (ctx) => ctx.reply(idleList))
			//
			tg_bot.command('set_idle_array', (ctx) => forceChangeIdleArr(ctx))
			//
			tg_bot.command('reset_idle_array', (ctx) => idleList = JSON.parse(process.env.STEAM_GAMEIDS.split(",")).sort(function () { return .5 - Math.random(); }))
			//
			tg_bot.command('time', (ctx) => ctx.reply(`
			Time from script run (h/m/s): ${Math.floor(data_collected.timeFromStartup / 3600)}:${Math.floor(data_collected.timeFromStartup % 3600 / 60)}:${data_collected.timeFromStartup % 3600 % 60}\nTime from last idle array shuffle (h/m/s): ${Math.floor(data_collected.timeFromShuffle / 3600)}:${Math.floor(data_collected.timeFromShuffle % 3600 / 60)}:${Math.floor(data_collected.timeFromShuffle % 3600 % 60)}
			`))
			//
		} else {
			console.log(`TBOT: Access for user[${userId}] was denied.`)
			tg_bot.on('message', (ctx) => console.log(`TBOT: Received message from unauthorized user\n- ${ctx.message.from.username}[id:'${ctx.message.from.id}']: ${ctx.message.text}`))
			//Send all messages from unauthorized users to log
		}
	}

	tg_bot.start((ctx) => checkTGUser(ctx.from.id))
	tg_bot.launch().then(console.log("Telegram control bot successfully connected and ready to work"))
} else {
	console.log("TBOT: Disabled by user, not initializing.")
}