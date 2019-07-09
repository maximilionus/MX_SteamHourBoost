const SteamUser = require('steam-user')
const Telegraf = require('telegraf')

const forceIdle = JSON.parse(process.env.STEAM_FORCEIDLE)
const idleList_shuffle_ms = JSON.parse(process.env.CORE_SHUFFLE_DELAY)
//Activate interval for idleList shuffle
setInterval(function() {
	idleList = idleList.sort(function(){return .5 - Math.random();})
	client.gamesPlayed(idleList, forceIdle);
	console.log(`Idle array successfully shuffled and restarted idle process for GameID${Array.isArray(idleList) && idleList.length > 1 ? 's' : ''} [${idleList}]`)
}, idleList_shuffle_ms)

var idleList = JSON.parse(process.env.STEAM_GAMEIDS.split(",")).sort(function(){return .5 - Math.random();})

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

	function checkTGUser(userId) {
		if (userId == JSON.parse(process.env.TBOT_ACCESSID)) { //User id check
			console.log(`TGBOT: Authorized user '${userId}' is online`)

			tg_bot.telegram.sendMessage(userId, 'You are connected to MXSteamHourBooster control system. Welcome user!');
			tg_bot.command('current_idle_array', (ctx) => ctx.reply(`Current idle list ${process.env.STEAM_GAMEIDS}`))
		} else {
			console.log(`TGBOT: Access for user[${userId}] was denied.`)
		}
	}

	tg_bot.start((ctx) => checkTGUser(ctx.from.id))
	tg_bot.launch().then(console.log("Telegram control bot successfully connected and ready to work"))
} else {
	console.log("TBOT: Disabled by user, not initializing.")
}