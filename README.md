### MAXIMILI's Steam Hour Booster for Deploys
| Var                | Sample       | Description                                                                                                            |
| ------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| STEAM_LOGIN        | strloginname | Steam login [str]                                                                                                      |
| STEAM_PASSWORD     | strpasswd    | Steam passwd [str]                                                                                                     |
| STEAM_2FA          | 2FA Code     | Steam 2FA code [str]                                                                                                   |
| STEAM_GAMEIDS      | [XXX,XXX]    | Steam items for idle [int arr]                                                                                         |
| STEAM_FORCEIDLE    | true         | Force steam to kick user with different ip from game to start idle process [bool]                                      |
| CORE_SHUFFLE_DELAY | 1000         | Steam idle restart with STEAM_GAMEIDS shuffle procedure delay in ms [int]                                              |
| TBOT_ENABLE        | true         | Enable/Disable Telegram control bot [bool]                                                                             |
| TBOT_TOKEN         | tokenstr     | Telegram bot token if enabled [str]                                                                                    |
| TBOT_ACCESSID      | 83737333983  | Telegram bot will compare userID with this int after `/start` command and ignore unauthorized users (if enabled) [int] |