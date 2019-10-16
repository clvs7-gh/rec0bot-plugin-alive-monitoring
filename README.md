# Server Alive Monitoring Plugin for REC0-Bot

## What is this?
A Rec0-bot plugin which monitor specified servers. If one or more servers are down, this plugin reports that to configured slack channel, or webhook url. Also when downed server is backed online, this plugin reports it.

## Limitation
Currently, only tcp is supported.

## How to build
Run `npm i && npm run build` to build.  
If you want to clean up built files, run `npm run clean`.

## Environment variables
- `REC0_ENV_ALIVE_MONITORING_NOTIFY_CHANNEL` : A channel name which rec0bot posts report to.
- `REC0_ENV_ALIVE_MONITORING_TARGETS` : Monitoring targets with comma-separated. Please specify as like : `host1:port1,host2:port2`
- `REC0_ENV_ALIVE_MONITORING_NOTIFY_WHOOK_URL` : (Optional) Webhook url you want to notify events to.
- `REC0_ENV_ALIVE_MONITORING_NOTIFY_WHOOK_TEMPLATE`: (Optional) JSON Template Text. '[\*MESSAGE\*]' is replaced with notification message.

## Author
clvs7 (Arisaka Mashiro)

## License
Apache License 2.0
