const SteamUser = require('steam-user')

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