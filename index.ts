import { Logger } from '@log4js-node/log4js-api';
import { Sema } from 'async-sema/lib';
import * as fs from 'fs';
import * as isReachable from 'is-reachable';
import * as path from 'path';
import { promisify } from 'util';
import { BotProxy } from './bot-proxy.interface';
import { MessageContext } from './message-context.interface';

let mBot: BotProxy;
let logger: Logger;
let metadata: { [key: string]: string };

let states: { [host: string]: AvailabilityResult } = {};
const sema = new Sema(1);

const DATA_DIR_NAME = 'data';
const STATES_JSON_FILENAME = 'states.json';
const NOTIFY_CHANNEL_NAME = (process.env.REC0_ENV_ALIVE_MONITORING_NOTIFY_CHANNEL || '').trim() || 'general';
const MONITORING_TARGETS = (process.env.REC0_ENV_ALIVE_MONITORING_TARGETS || '').split(',').map(i => i.trim())
    .filter(v => v.split(':').length === 2);


export const init = async (bot: BotProxy, options: { [key: string]: any }): Promise<void> => {
    mBot = bot;
    logger = options.logger || console;
    metadata = await import(path.resolve(__dirname, 'package.json'));

    await loadState();

    logger.info(`${metadata.name} plugin v${metadata.version} has been initialized.`);
};

export const onStart = () => {
    logger.debug('onStart()');
};

export const onStop = () => {
    logger.debug('onStop()');
};

export const onMessage = async (message: string, context: MessageContext, data: { [key: string]: any }) => {
    logger.debug('onMessage()');
    logger.debug('targets:', MONITORING_TARGETS);
    await scanAndUpdate();
};

export const onPluginEvent = async (eventName: string, value?: any, fromId?: string) => {
    logger.debug('onPluginEvent()');
    if (eventName === 'scheduled:check-alive') {
        await scanAndUpdate();
    }
};

/**
 * Private
 */

const saveState = async () => {
    // Save
    await promisify(fs.writeFile)(path.resolve(__dirname, DATA_DIR_NAME, STATES_JSON_FILENAME), JSON.stringify({
        states: states
    }), {
        encoding: 'utf-8',
        flag: 'w'
    });
};

const loadState = async () => {
    // Open or create file
    let raw = await promisify(fs.readFile)(path.resolve(__dirname, DATA_DIR_NAME, STATES_JSON_FILENAME), {
        encoding: 'utf-8',
        flag: 'a+'
    });
    const isInit = raw.trim().length <= 0;
    raw = raw || JSON.stringify({states: {}});
    const parsed = JSON.parse(raw);
    states = parsed.states;
    if (isInit) {
        await saveState();
    }
};

const scanAndUpdate = async () => {
    logger.debug('scanAndUpdate()');
    await sema.acquire();
    logger.debug('Scanning...');
    // Run server availability check
    const results = await checkAvailability();
    await updateStates(results, async (newState: AvailabilityResult) => {
        if (newState.isOk) {
            // Backed online!
            await mBot.sendTalk(await mBot.getChannelId(NOTIFY_CHANNEL_NAME),
                `:information_source: Server  ' ${newState.host} '  is backed online! :tada:`);
        } else {
            // Went offline...
            await mBot.sendTalk(await mBot.getChannelId(NOTIFY_CHANNEL_NAME),
                `:warning: Server  ' ${newState.host} '  is went offline! Please check ASAP. :soon:`);
        }
    });
    logger.debug('Done!');
    sema.release();
};

const checkAvailability = async (): Promise<AvailabilityResult[]> => {
    const results: AvailabilityResult[] = [];

    for ( const target of MONITORING_TARGETS ) {
        const result: AvailabilityResult = {
            host: `${target}`,
            isOk: await isReachable(`tcp://${target}`)
        };
        results.push(result);
    }

    return results;
};

const updateStates = async (results: AvailabilityResult[], onStateChanged: (newState: AvailabilityResult) => Promise<void>) => {
    for ( const result of results ) {
        const state = states[result.host];
        if (state) {
            if (state.isOk !== result.isOk) {
                // Update state
                state.isOk = result.isOk;
                await onStateChanged(result);
            }
        } else {
            // Add state
            states[result.host] = Object.assign({}, result);
        }
    }
    logger.debug('states:', states);
    await saveState();
};

/**
 * Interface
 */

interface AvailabilityResult {
    host: string;
    isOk: boolean;
}

