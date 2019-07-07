var Steam = require('steam');
var fs = require('fs');
var bot = new Steam.SteamClient();

if (fs.existsSync('sentryfile')) {
	var sentry = fs.readFileSync('sentryfile');
	console.log('[STEAM] logging in with sentry ');
	bot.logOn({
		accountName: process.env.STEAM_LOGIN,
		password: process.env.STEAM_PASSWORD,
		authCode: process.env.STEAM_2FA,
		shaSentryfile: sentry
	});
}
else {
	console.log('[STEAM] logging in without sentry');
	bot.logOn({
		accountName: process.env.STEAM_LOGIN,
		password: process.env.STEAM_PASSWORD,
		authCode: process.env.STEAM_2FA,
	});
}
bot.on('loggedOn', function () {
	console.log('[STEAM] Logged in.');
	bot.setPersonaState(Steam.EPersonaState.Online);

	bot.gamesPlayed([process.env.STEAM_GAMEIDS.split(",")]);
});

bot.on('sentry', function (sentryHash) {//A sentry file is a file that is sent once you have
	//passed steamguard verification.
	console.log('[STEAM] Received sentry file.');
	fs.writeFile('sentryfile', sentryHash, function (err) {
		if (err) {
			console.log(err);
		} else {
			console.log('[FS] Saved sentry file to disk.');
		}
	});
});

//Handle logon errors
bot.on('error', function (e) {
	console.log('[STEAM] ERROR - Logon failed');
	if (e.eresult == Steam.EResult.InvalidPassword) {
		console.log('Reason: invalid password');
	}
	else if (e.eresult == Steam.EResult.AlreadyLoggedInElsewhere) {
		console.log('Reason: already logged in elsewhere');
	}
	else if (e.eresult == Steam.EResult.AccountLogonDenied) {
		console.log('Reason: logon denied - steam guard needed');
	}
})