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
	//Tell steam we are playing games.
	//730=csgo
	//2350=quake3
	//753=steam
	//440=tf2
	//240=css
	//220-HalfLife2
	//10-cs
	//80=cscz
	//570=dota2
	bot.gamesPlayed([2350, 753, 550, 730, 570, 240, 220, 10, 80, 440]);
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