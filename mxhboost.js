const fs = require('fs')
const fileExists = require('file-exists')
const path = require('path')
const rl = require('readline-sync')
const SteamUser = require('steam-user')

const idleList = require('./idleList')

if (idleList.length < 1) {
	console.log('No games selected')
	process.exit()
}

const client = new SteamUser()

const logOnDetails = {
	//'accountName': '',
	'dontRememberMachine': false
}

const composeLoginKeyPath = () => path.join(client.options.dataDirectory, `loginKey.${logOnDetails.accountName}.txt`)

logOnDetails['accountName'] = logOnDetails['accountName'] || rl.question('Steam Account Name: ', {
	limit: name => name.length > 0
})

if (fileExists.sync(composeLoginKeyPath())) {
	logOnDetails['loginKey'] = fs.readFileSync(composeLoginKeyPath(), 'utf8')
	logOnDetails['rememberPassword'] = true // no matter what this should be true
} else if (logOnDetails['password'] === undefined) {
	logOnDetails['password'] = rl.question(`Steam Password for ${logOnDetails['accountName']}: `, {
		hideEchoBack: true,
		limit: pw => pw.length > 0
	})
	logOnDetails['rememberPassword'] = logOnDetails['rememberPassword'] || rl.question('Remember Password? (Yes or No) ', {
		limit: ['yes', 'no'],
		trueValue: ['yes'],
		falseValue: ['no']
	})
}

client.on('loginKey', key => fs.writeFileSync(composeLoginKeyPath(), key, 'utf8'))

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