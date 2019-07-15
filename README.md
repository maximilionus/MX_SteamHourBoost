### MAXIMILI's Steam Hour Booster for Deploys
| Var                | Type          | Description                                                                                                      |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| STEAM_LOGIN        | `str`         | Steam login                                                                                                      |
| STEAM_PASSWORD     | `str`         | Steam passwd                                                                                                     |
| STEAM_2FA          | `str`         | Steam 2FA code                                                                                                   |
| STEAM_GAMEIDS      | [`int`,`int`] | Steam items for idle                                                                                             |
| STEAM_FORCEIDLE    | `bool`        | Force steam to kick user with different ip from game to start idle process                                       |
| CORE_SHUFFLE_DELAY | `int`         | Steam idle restart with STEAM_GAMEIDS shuffle procedure delay in ms                                              |
| TBOT_ENABLE        | `bool`        | Enable/Disable Telegram control bot                                                                              |
| TBOT_TOKEN         | `str`         | Telegram bot token if enabled                                                                                    |
| TBOT_ACCESSID      | `int`         | Telegram bot will compare userID with this int after `/start` command and ignore unauthorized users (if enabled) |
| TBOT_USESOCKS      | `bool`        | Use socks5 connection for telegram bot?                                                                          |
| TBOT_SOCKS_HOST    | `str`         | socks5 host ip                                                                                                   |
| TBOT_SOCKS_PORT    | `int`         | socks5 host port                                                                                                 |
---

### Telegram bot commands-list
```
start - Init
info - Get all collected data
idle_switch - Enable/End idling(will stay online)
get_idle_array - Return array with current idling IDs
get_env_idle_array - Return array values from process.env
set_idle_array - Override current idle array with new values
reset_idle_array - Reset overridden array to process.env value
```