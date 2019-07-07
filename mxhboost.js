const fs = require('fs')
const fileExists = require('file-exists')
const path = require('path')
const rl = require('readline-sync')
const SteamUser = require('steam-user')

const idleList = JSON.parse(process.env.STEAM_GAMEIDS.split(","))

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
		client.gamesPlayed(idleList, true);
		console.log(`Idling for GameID${Array.isArray(idleList) && idleList.length > 1 ? 's' : ''} [${idleList}]`)
	})
})

// Some error occurred during logon
client.on('error', e => console.log(e));

client.logOn(logOnDetails)