'use strict';

var discord_js = require('discord.js');
var fs = require('fs-extra');
var emojiList = require('./utils/emoji.json');
var mcproto = require('mcproto');
var child_process = require('child_process');

const regexCache = {};
/** Finds the first colon not in a custom emoji */
function findColon(string) {
    let index = string.indexOf(':');
    while (index !== -1) {
        if (!(string[index - 1] === '<' ||
            (string[index - 1] === 'a' && string[index - 2] === '<'))) {
            return index + 1;
        }
        index = string.indexOf(':', index + 1);
    }
    return string.length;
}
/** Uses bot mentions as a prefix */
function parseCommand(message) {
    const bot = message.client.user;
    if (!regexCache[bot.id]) {
        regexCache[bot.id] = new RegExp(`<@!?${message.client.user.id}>`, 'g');
    }
    if (message.mentions.has(bot) || regexCache[bot.id].test(message.content)) {
        const args = [];
        const colon = findColon(message.content);
        const command = message.content
            .slice(0, colon)
            .replace(regexCache[bot.id], '')
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase()
            // Must be a single regex or then IDs will be added in the wrong order
            .replace(/<(?:[#@][!&]?|a?:\w+:)(\d+)>|\d{15,20}/g, (match, mentionId) => {
            const id = match[0] === '<' ? mentionId : match;
            args.push(id);
            return '<id>';
        })
            .toLowerCase();
        if (colon < message.content.length) {
            args.push(message.content.slice(colon).trim());
        }
        return {
            command,
            args
        };
    }
    else {
        return null;
    }
}

/** Randomly select from a list */
function select(list) {
    return list[Math.floor(Math.random() * list.length)];
}

class CachedMap {
    #path;
    #object;
    constructor(path) {
        this.#path = path;
    }
    read = async () => {
        this.#object = await fs
            .readFile(this.#path, 'utf-8')
            .then(json => (json === '' ? {} : JSON.parse(json)))
            .catch(err => (err.code === 'ENOENT' ? {} : Promise.reject(err)));
    };
    has(id) {
        return Object.prototype.hasOwnProperty.call(this.#object, id);
    }
    get(id, defaultValue) {
        if (id === undefined) {
            return defaultValue;
        }
        return this.has(id) ? this.#object[id] : defaultValue;
    }
    set(id, value) {
        this.#object[id] = value;
        return this;
    }
    delete(id) {
        delete this.#object[id];
        return this;
    }
    entries() {
        return Object.entries(this.#object);
    }
    async save() {
        await fs.writeFile(this.#path, JSON.stringify(this.#object, null, '\t'));
    }
}

const emojiRegex = new RegExp(`<a?:\\w+:(\\d+)>|${emojiList.join('|').replace(/[+*]/g, m => '\\' + m)}`, 'g');

var ok = ['👌', '🆗', '👍', '✅'];

const pollChannels = new CachedMap('./data/poll-reactions.json');
const onReady$5 = pollChannels.read;
function isPollChannel(message) {
    return pollChannels.get(message.channel.id, false);
}
function isPoll(message) {
    return (isPollChannel(message) || !!message.content?.includes('(this is a poll)'));
}
async function pollChannel(message) {
    if (message.channel instanceof discord_js.DMChannel ||
        message.channel.lastMessageId === undefined) {
        await message.reply("who're you polling in here just me and you??");
        return;
    }
    if (!message.channel
        .permissionsFor(message.member)
        .has(discord_js.PermissionFlagsBits.ManageChannels)) {
        await message.reply("you can't even manage channels, why should i listen to you");
        return;
    }
    if (isPollChannel(message)) {
        await message.reply(select([
            'this is already a poll channel though',
            "didn't you already do `poll channel`",
            "that doesn't do anything if this channel already is a poll channel"
        ]));
    }
    else {
        pollChannels.set(message.channel.id, true).save();
        await message.react(select(ok));
    }
}
async function notPollChannel(message) {
    if (message.channel instanceof discord_js.DMChannel ||
        message.channel.lastMessageId === undefined) {
        await message.reply("who're you polling in here just me and you??");
        return;
    }
    if (!message.channel
        .permissionsFor(message.member)
        .has(discord_js.PermissionFlagsBits.ManageChannels)) {
        await message.reply("you can't even manage channels, why should i listen to you");
        return;
    }
    if (isPollChannel(message)) {
        pollChannels.set(message.channel.id, false).save();
        await message.react(select(ok));
    }
    else {
        await message.reply(select([
            "this isn't a poll channel though",
            "that doesn't do anything if this channel already isn't a poll channel"
        ]));
    }
}
function getReactions$1(message, isNew) {
    if (isPoll(message)) {
        const emoji = message.content.match(emojiRegex) || [];
        if (emoji.length === 0 && isNew) {
            return ['👍', '👎'];
        }
        else {
            return emoji;
        }
    }
    else {
        return null;
    }
}

async function getSource(message, [messageId, channelId = message.channel.id]) {
    const channel = await message.client.channels
        .fetch(channelId)
        .catch(() => null);
    if (!channel) {
        await message.reply(`can't get channel <#${channelId}>`);
        return;
    }
    if (!channel.isTextBased()) {
        await message.reply(`<#${channelId}> is not a channel with messages you fool`);
        return;
    }
    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (!msg) {
        await message.reply(`can't get the message with id ${messageId}`);
        return;
    }
    const useFile = msg.content.length > 1800 ||
        msg.content.includes('```') ||
        msg.content.includes('<a:') ||
        msg.content.includes('<:');
    await message.reply({
        content: select(['here you go', 'i n s p e c t', 'hmm']),
        // If the message might be too long for an embed or can't be contained in a
        // code block or has custom emoji, upload a text file
        files: useFile
            ? [
                new discord_js.AttachmentBuilder(Buffer.from(msg.content), {
                    name: 'message.txt'
                })
            ]
            : undefined,
        embeds: useFile
            ? undefined
            : [
                {
                    title: select(['conTENT', 'source', 'wow', 'very cool']),
                    description: msg.content.length > 0
                        ? `\`\`\`md\n${msg.content}\n\`\`\``
                        : select([
                            '*the message is EMPTY*',
                            '*there is NOTHING*',
                            '*no message CONTENT very interest*'
                        ])
                }
            ]
    });
}
const getSourceFlipped = async (message, [channelId, messageId]) => getSource(message, [messageId, channelId]);
async function getDate(message, [id = message.author.id]) {
    const timestamp = (BigInt(id) >> 22n) / 1000n + 1420070400n;
    await message.reply(select([
        "'twas made %F (%R)",
        'it was created on %F, %R',
        'if my sixth sense is CORRECT it materialised into existence on %F, %R',
        'creation happened %R on %F',
        'on %F, it poofed into existence. that was %R!'
    ])
        .replace('%F', `<t:${timestamp}:F>`)
        .replace('%R', `<t:${timestamp}:R>`));
}

const welcomeChannels = new CachedMap('./data/welcome-channels.json');
const sentienceMsgSent = new CachedMap('./data/sentience-msg-sent.json');
const onReady$4 = () => Promise.all([welcomeChannels.read(), sentienceMsgSent.read()]);
async function setWelcome(message, [channelId, welcomeMsg]) {
    if (message.channel instanceof discord_js.DMChannel ||
        message.channel.lastMessageId === undefined) {
        await message.reply('no dms');
        return;
    }
    if (!message.channel
        .permissionsFor(message.member)
        .has(discord_js.PermissionFlagsBits.ManageGuild)) {
        await message.reply('why should i obey you if you cant even manage the server lmao');
        return;
    }
    welcomeChannels
        .set(message.guild.id, { channelId, message: welcomeMsg })
        .save();
    await message.react(select(ok));
}
async function onJoin(member) {
    const { channelId, message } = welcomeChannels.get(member.guild.id) ?? {};
    if (!channelId)
        return;
    const channel = member.guild.channels.cache.get(channelId);
    if (!(channel instanceof discord_js.TextChannel))
        return;
    await channel.send({
        content: select([
            'Hi, {USER}; please read this:',
            'Welcome, {USER}! Read this:',
            "Hey, {USER}! Let's see if you can read.",
            '{USER}, I have been told to show you this.'
        ]).replace('{USER}', member.toString()),
        embeds: [
            {
                description: message,
                footer: {
                    text: 'Note: I am just a bot, and I have been instructed to repeat this message to all users who join the server.'
                }
            }
        ]
    });
}
async function onMessage$2(message) {
    if (!message.guild)
        return;
    const { channelId } = welcomeChannels.get(message.guild.id) ?? {};
    if (message.channel.id === channelId && !message.author.bot) {
        if (!sentienceMsgSent.get(`${message.guild.id}-${message.author.id}`)) {
            await message.reply({
                content: message.content.length > 15
                    ? select([
                        "Thanks! You'll be verified... eventually. Bureaucracy is slow.",
                        "This message might be enough proof that you're sentient. You can send more if you want, just in case. I'm just a bot.",
                        "Cool! I'm just a bot, so I can't tell if this means you're sentient. We'll have to wait and see."
                    ])
                    : select([
                        "That's a bit short of a message. Try sending more to prove that you're not a bot, and you'll be verified eventually.",
                        "Say more. Couldn't a bot have said that as well? Once you're prove you're human you'll eventually be verified.",
                        'The more you write, the better. Show me your definitely human imagination! If your messages are satisfactorily humanlike, you will eventually get verified.'
                    ]),
                allowedMentions: {
                    repliedUser: false
                }
            });
            sentienceMsgSent
                .set(`${message.guild.id}-${message.author.id}`, true)
                .save();
        }
    }
}

const lockdownCategories = new CachedMap('./data/lockdown-cats.json');
const lockdownVotes = new CachedMap('./data/lockdown-votes.json');
const onReady$3 = () => Promise.all([lockdownCategories.read(), lockdownVotes.read()]);
async function setLockdownCategory(message, [categoryId]) {
    if (message.channel instanceof discord_js.DMChannel ||
        message.channel.lastMessageId === undefined) {
        await message.reply('no dms');
        return;
    }
    if (!message.channel
        .permissionsFor(message.member)
        .has(discord_js.PermissionFlagsBits.ManageChannels)) {
        await message.reply('lol first show me that you can manage chanenls then we talk');
        return;
    }
    lockdownCategories.set(message.guild.id, categoryId).save();
    await message.react(select(ok));
}
const MIN_VOTES = 3;
const VOTE_PERIOD = 10 * 60 * 1000;
async function voteLockdown(message) {
    const categoryId = lockdownCategories.get(message.guild?.id);
    const category = message.guild.channels.cache.get(categoryId);
    if (!(category instanceof discord_js.CategoryChannel)) {
        await message.reply("server doesn't have category set to lock down");
        return;
    }
    const votes = lockdownVotes.get(message.guild?.id, []);
    const now = Date.now();
    for (let i = 0; i < votes.length; i++) {
        if (now - votes[i].time > VOTE_PERIOD) {
            votes.splice(i--, 1);
        }
    }
    if (votes.find(vote => vote.user === message.author.id)) {
        lockdownVotes.save();
        await message.reply("tsk tsk, you've already voted in the past 10 min");
        return;
    }
    else {
        if (votes.length === 0) {
            // The array might be new
            lockdownVotes.set(message.guild.id, votes);
        }
        votes.push({ time: now, user: message.author.id });
        lockdownVotes.save();
    }
    if (votes.length >= MIN_VOTES) {
        const success = await category.permissionOverwrites
            .resolve(message.guild.roles.everyone.id)
            .edit({ ViewChannel: null }, 'Democracy voted to lock the channel.')
            .then(() => true)
            .catch(() => false);
        await message.channel.send(success
            ? "unverified folk have been BANISHED from the common people's channels"
            : 'unfortunately i lack the perms to change channel perms oopsi');
    }
    else {
        await message.reply(`${votes.length} of the minimum ${MIN_VOTES} votes needed to close off the server from them pesky unverifieds`);
    }
}

const mentionCache = new CachedMap('./data/mentions.json');
const onReady$2 = mentionCache.read;
async function onMessage$1(message) {
    const { channel: { id: channelId }, mentions } = message;
    if (mentions.everyone || mentions.roles.size > 0 || mentions.users.size > 0) {
        const msg = {
            author: message.author.id,
            content: message.content,
            url: message.url
        };
        if (mentions.everyone) {
            mentionCache.set(`${channelId}-everyone`, msg);
        }
        for (const roleId of mentions.roles.keys()) {
            mentionCache.set(`${channelId}-${roleId}`, { ...msg, role: true });
        }
        // Ignore user pings from this bot
        if (message.author.id !== message.client.user.id) {
            for (const userId of mentions.users.keys()) {
                mentionCache.set(`${channelId}-${userId}`, msg);
            }
        }
        mentionCache.save();
    }
}
async function whoPinged(message, args) {
    const [targetId, channelId = message.channel.id] = args.length < 2 && message.content.includes('everyone')
        ? ['everyone', args[0]]
        : args;
    const lastMention = mentionCache.get(`${channelId}-${targetId}`);
    const them = targetId === 'everyone'
        ? 'everyone'
        : targetId === message.author.id
            ? 'you'
            : 'them';
    if (lastMention) {
        await message.reply({
            embeds: [
                {
                    // This breaks if a Nitro user repeats ]( 2000 times in a message,
                    // whatever
                    description: `<@${lastMention.author}> pinged ${targetId === 'everyone'
                        ? '@everyone'
                        : `<@${lastMention.role ? '&' : ''}${targetId}>`} ([link to message](${lastMention.url})):\n\n${lastMention.content.replace(/]\(/g, ']\ufeff(')}`,
                    footer: {
                        text: !lastMention.role && targetId !== 'everyone'
                            ? "this only shows direct pings to the user, btw, it doesn't factor in role and everyone pings"
                            : ''
                    }
                }
            ],
            allowedMentions: {
                repliedUser: false
            }
        });
    }
    else {
        await message.reply({
            content: select([
                "hmm if someone did ping $them $here then i wasn't paying attention",
                'whoever pinged must have pinged $them before i started tracking pings $here',
                'i dont recall $them being pinged $here, maybe i was offline or smth'
            ])
                .replace('$them', them)
                .replace('$here', channelId === message.channel.id ? 'here' : 'there') +
                (channelId === message.channel.id
                    ? ` (note: if the ping was in a different channel then reply \`who pinged ${targetId} in <channel>\`)`
                    : ''),
            allowedMentions: {
                repliedUser: false
            }
        });
    }
}
async function whoPingedMe(message, [channelId = message.channel.id]) {
    const userMention = mentionCache.get(`${channelId}-${message.author.id}`);
    const possibilities = [mentionCache.get(`${channelId}-everyone`), userMention];
    if (message.member) {
        for (const roleId of message.member.roles.cache.keys()) {
            possibilities.push(mentionCache.get(`${channelId}-${roleId}`));
        }
    }
    const lastMention = possibilities.reduce((acc, curr) => 
    // Using message ID (from URL) to get latest ping. Snowflakes' most
    // significant digits encode the time, so imprecision due to casting a
    // u64 to a f64 should be negligible.
    !acc ||
        (curr &&
            +acc.url.split('/').slice(-1)[0] < +curr.url.split('/').slice(-1)[0])
        ? curr
        : acc, undefined);
    if (lastMention) {
        await message.reply({
            embeds: [
                {
                    description: `<@${lastMention.author}> [pinged you](${lastMention.url}):\n\n${lastMention.content.replace(/]\(/g, ']\ufeff(')}`,
                    footer: {
                        text: lastMention === userMention
                            ? ''
                            : `tip: reply \`who pinged ${message.author.id} in ${channelId}\` to filter out role and everyone pings`
                    }
                }
            ],
            allowedMentions: {
                repliedUser: false
            }
        });
    }
    else {
        await message.reply({
            content: select([
                "i don't remember you getting pinged, maybe i wasn't paying attention",
                "hm you might've been pinged while i was offline",
                "your ping is not in my records, maybe i wasn't tracking pings then"
            ]) +
                (channelId === message.channel.id
                    ? ' (note: if you were pinged in a different channel then reply `who pinged me in <channel>`)'
                    : ''),
            allowedMentions: {
                repliedUser: false
            }
        });
    }
}

async function avatar(message, [userId = message.author.id]) {
    const user = await message.client.users.fetch(userId).catch(() => null);
    if (user) {
        await message.reply({
            content: select([
                'too blue for my tastes',
                'why does it look so bad up close',
                'i regret having eyes'
            ]),
            embeds: [
                {
                    image: {
                        url: user.displayAvatarURL({ extension: 'png', size: 4096 })
                    }
                }
            ]
        });
    }
    else {
        await message.reply({
            embeds: [
                {
                    description: select([
                        `no idea who <@${userId}> is`,
                        `<@${userId}>? dont know em`,
                        `stop making up people!! <@${userId}> is about as real as the grass you touched this morning: it doesn't exist`
                    ])
                }
            ]
        });
    }
}

const DEFAULT_PORT = '25565';
const EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 7;
const CHECK_FREQ = 1000 * 60 * 5;
async function getServerStatus(host, port) {
    const client = await mcproto.Client.connect(host, port);
    client.send(new mcproto.PacketWriter(0x0)
        .writeVarInt(404)
        .writeString(host)
        .writeUInt16(port)
        .writeVarInt(mcproto.State.Status));
    client.send(new mcproto.PacketWriter(0x0));
    const response = await client.nextPacket(0x0);
    const { players: { max, online, sample: players = [] }, version: { name: version } } = response.readJSON();
    client.end();
    return { online, max, players, version };
}
async function serverStatus(message, [address]) {
    try {
        const [host, port = DEFAULT_PORT] = address.split(':');
        const { online, max, players, version } = await getServerStatus(host, +port);
        await message.reply({
            content: select([
                'fomo time?',
                "let's see who's gaming",
                'tbh i expected more people on'
            ]),
            embeds: [
                {
                    title: select([
                        `${online}/${max} online`,
                        `${online}/${max} gaming rn`,
                        `${online}/${max} not touching grass`
                    ]),
                    description: online > 0
                        ? players
                            .map(({ name, id }) => `[${name}](https://namemc.com/profile/${id})`)
                            .join('\n') ||
                            select([
                                "server not showing who's on",
                                'no players provided',
                                'the servers hiding something...'
                            ])
                        : select([
                            "no one's on :(",
                            'dead server',
                            'everyone touching grass today'
                        ]),
                    footer: {
                        text: version
                    }
                }
            ]
        });
    }
    catch (error) {
        await message.reply({
            content: select(['problem!', "can't connect!", 'oopsie doopsie']),
            embeds: [
                {
                    description: error instanceof Error ? error.message : String(error)
                }
            ]
        });
    }
}
function createEmbed(suffix = '', color) {
    return ({ id, name }) => ({
        author: {
            name: name + suffix,
            icon_url: `https://cravatar.eu/helmavatar/${id}/64.png`
        },
        color
    });
}
async function check(channel, info, state, start = false) {
    if (Date.now() > info.start + EXPIRATION_TIME) {
        clearInterval(state.timeoutId);
        trackChannels.delete(channel.id).save();
        delete states[channel.id];
        await channel.send({
            content: `It has now been <t:${Math.floor(info.start / 1000)}:R> when you asked me to start tracking your server. In case you've stopped playing, I'm going to stop tracking the server now.`,
            embeds: [
                {
                    description: `If you would like to continue tracking, reply to this message with \`track: ${info.host}:${info.port}\``
                }
            ]
        });
        return;
    }
    const { online, max, players } = await getServerStatus(info.host, info.port).catch(() => ({
        online: 0,
        max: -1,
        players: [],
        version: ''
    }));
    const embeds = start
        ? players.map(createEmbed(' was already on.'))
        : [
            // Joined
            ...players
                .filter(({ id }) => !state.lastPlayers.some(p => p.id === id))
                .map(createEmbed(' joined the game.', 0x22c55e)),
            // Left
            ...state.lastPlayers
                ?.filter(({ id }) => !players.some(p => p.id === id))
                .map(createEmbed(' left the game.', 0xef4444))
        ];
    if (start || embeds.length > 0) {
        await channel.send({
            content: `${online}/${Math.max(max, 0)} players are on now. I check again <t:${Math.floor((Date.now() + CHECK_FREQ) / 1000)}:R>.${max === -1 ? ' **NOTE: Server is offline.**' : ''}`,
            embeds
        });
    }
    state.lastPlayers = players;
}
const trackChannels = new CachedMap('./data/minecraft-track.json');
const onReady$1 = trackChannels.read;
const states = {};
async function init(client) {
    await Promise.all(trackChannels.entries().map(async ([channelId, info]) => {
        const channel = await client.channels.fetch(channelId);
        if (channel?.isTextBased()) {
            states[channelId] = {
                lastPlayers: [],
                timeoutId: setInterval(() => {
                    check(channel, info, states[channelId]);
                }, CHECK_FREQ)
            };
            await check(channel, info, states[channelId], true);
        }
    }));
}
async function track(message, [address]) {
    if (states[message.channel.id]) {
        clearInterval(states[message.channel.id].timeoutId);
    }
    if (address) {
        const [host, port = DEFAULT_PORT] = address.split(':');
        const state = {
            lastPlayers: [],
            timeoutId: setInterval(() => {
                check(message.channel, info, state);
            }, CHECK_FREQ)
        };
        const info = {
            host,
            port: +port,
            start: Date.now()
        };
        trackChannels.set(message.channel.id, info).save();
        states[message.channel.id] = state;
        await check(message.channel, info, state, true);
    }
    else {
        const info = trackChannels.get(message.channel.id);
        await message.reply(info
            ? 'ok i will stop tracking'
            : "i don't think i was tracking a server. put the server url after the colon, like `track: yourmom.com`");
        trackChannels.delete(message.channel.id).save();
    }
}

const customEmojiRegex = /<a?:\w+:(\d+)>/g;
const emojiUsage = new CachedMap('./data/emoji-usage.json');
const onReady = emojiUsage.read;
async function getUsage(message) {
    if (!message.guild) {
        await message.reply('i dont track emojis in dms sry');
        return;
    }
    await message.reply({
        embeds: [
            {
                description: Array.from(
                // Force fetch in case emoji changed
                await message.guild.emojis.fetch(undefined, { force: true }), ([emojiId, { animated }]) => ({
                    emoji: `<${animated ? 'a' : ''}:w:${emojiId}>`,
                    count: emojiUsage.get(`${message.guildId}-${emojiId}`, 0)
                }))
                    .sort((a, b) => b.count - a.count)
                    .map(({ emoji, count }) => `${emoji} ${count}`)
                    .join('\n')
            }
        ]
    });
}
async function onMessage(message) {
    if (!message.guildId) {
        return;
    }
    // Remove duplicate emoji
    const emojis = new Set(Array.from(message.content.matchAll(customEmojiRegex), ([, emojiId]) => emojiId));
    for (const emojiId of emojis) {
        const id = `${message.guildId}-${emojiId}`;
        emojiUsage.set(id, emojiUsage.get(id, 0) + 1);
    }
    emojiUsage.save();
}
async function onReact$1(reaction) {
    if (reaction.partial) {
        reaction = await reaction.fetch();
    }
    // It's easy to inflate the count by reacting and unreacting. Only making the
    // first reaction count should thwart this somewhat.
    if (reaction.count === 1 &&
        !(reaction.emoji instanceof discord_js.GuildEmoji &&
            reaction.emoji.guild.id !== reaction.message.guildId)) {
        const id = `${reaction.message.guildId}-${reaction.emoji.id}`;
        emojiUsage.set(id, emojiUsage.get(id, 0) + 1);
    }
    emojiUsage.save();
}

async function isMenu(message) {
    if (!message.guild || !message.content.includes('(select roles)')) {
        return false;
    }
    // Author of select role menu must be present and able to add roles manually
    return message.guild.members
        .fetch(message.author)
        .then(member => member.permissions.has(discord_js.PermissionFlagsBits.ManageRoles))
        .catch(() => false);
}
const roleMentionRegex = /<@&(\d+)>/;
function parseMenu(content) {
    const roles = {};
    for (const line of content.split('\n')) {
        const roleId = line.match(roleMentionRegex);
        if (!roleId) {
            continue;
        }
        // Allow any emoji in line to add/remove the role (also because emojiRegex
        // is global, so I can't use .match anyways)
        for (const [unicode, customId] of line.matchAll(emojiRegex)) {
            roles[customId ?? unicode] = roleId[1];
        }
    }
    return roles;
}
async function getReactions(message) {
    if (await isMenu(message)) {
        return Object.keys(parseMenu(message.content));
    }
    else {
        return null;
    }
}
async function onReact(reaction, user, added) {
    const message = reaction.message.partial
        ? await reaction.message.fetch()
        : reaction.message;
    if (!message.guild || !(await isMenu(message))) {
        return;
    }
    // Author of select role menu must be present and able to add roles manually
    const menuAuthor = await message.guild.members
        .fetch(message.author)
        .catch(() => null);
    if (!menuAuthor?.permissions.has(discord_js.PermissionFlagsBits.ManageRoles)) {
        return;
    }
    const roles = parseMenu(message.content);
    // `id` has custom emoji ID, `name` has Unicode character
    const emoji = reaction.emoji.id ?? reaction.emoji.name;
    console.log(roles, emoji);
    if (emoji && roles[emoji]) {
        try {
            const member = await message.guild.members.fetch(user.id);
            if (added) {
                await member.roles.add(roles[emoji]);
            }
            else {
                await member.roles.remove(roles[emoji]);
            }
        }
        catch {
            // Ignore permission errors, etc.
            return;
        }
    }
}

async function about(message) {
    await message.reply({
        content: select(['hi', 'i am moofy', 'hello', 'i am me']),
        embeds: [
            {
                title: select([
                    'who am i',
                    'i am whom',
                    'whomst',
                    'who i am',
                    'introduction',
                    'hi hi'
                ]),
                description: [
                    select([
                        'i am bot',
                        'i am a discord bot for personal use',
                        'i am made with [discord.js](https://discord.js.org/)',
                        'please be respectful'
                    ]),
                    select([
                        '[observe my brain](https://github.com/SheepTester/floofy-bot)',
                        'i am on the [git hubs](https://github.com/SheepTester/floofy-bot)',
                        'my six brain cells are made in [java script](https://github.com/SheepTester/floofy-bot)'
                    ]),
                    select([
                        'fact: java is short for javascript',
                        'tip: in js, `let` is unsafe, always use `var`',
                        "fun fact: you made javascript, that's why it sucks",
                        "cool tip: make your js arrays sparce with `arr[5000] = 'lol'` then delete it using `delete arr[5000]` to spice up performance",
                        "useful tip: make sure your code does not have `'use script'` because it makes it more prone to errors",
                        'did you know: javascript is used to mod [minecraft](https://minecraft.fandom.com/wiki/Bedrock_Edition_beta_scripting_documentation#Scripting_system)'
                    ])
                ].join('\n\n'),
                footer: {
                    text: 'Running floofy-bot'
                }
            }
        ]
    });
}

let ignoring = null;
async function ignore(message) {
    if (message.author.id === process.env.OWNER) {
        const keyword = select([
            'moofy, revive!',
            'moofy, you can stop ignoring us now',
            'moofy, resuscitate.',
            'moofy, come back please'
        ]);
        ignoring = keyword;
        await message.reply(select([
            `say \`${keyword}\` and i shall return. bye`,
            `i shall ignore you all now. send \`${keyword}\` to undo`,
            `ignorance is 😎. utter \`${keyword}\` to reverse that`,
            `if you say \`${keyword}\` i will stop ignoring you`
        ]));
    }
    else {
        await message.reply(select([
            `i only bow down to <@${process.env.OWNER}>`,
            `you are not <@${process.env.OWNER}>`,
            'go away',
            'no u'
        ]));
    }
}

function execute(command) {
    return new Promise(resolve => {
        child_process.exec(command, (error, stdout, stderr) => {
            resolve({ error, stdout, stderr });
        });
    });
}
function displayResults(results) {
    return results
        .map(result => (result ? '```sh\n' + result + '\n```' : '👌'))
        .join('\n');
}
async function exit(message) {
    if (message.author.id === process.env.OWNER) {
        const msg = await message.reply(select(['okay BYE', 'i go POOF now', 'weeee']));
        console.log('Restarting');
        const results = [];
        async function reportExec(command) {
            results.push(`$ ${command}`);
            await msg.edit(displayResults(results));
            const { error, stdout, stderr } = await execute(command);
            results.push(stdout, stderr);
            if (error) {
                results.push(error?.stack);
            }
            await msg.edit(displayResults(results));
            if (error) {
                throw error;
            }
        }
        await reportExec('git checkout -- package-lock.json');
        await reportExec('git pull');
        await reportExec('npm install');
        process.exit();
    }
    else {
        await message.reply(select([
            'shoo',
            `you are not <@${process.env.OWNER}>`,
            'out of here commoner',
            'scram plebian'
        ]));
    }
}

require('dotenv').config();
async function help(message) {
    const aliases = new Map();
    for (const [commandName, commandFunc] of Object.entries(commands)) {
        // Don't show owner commands to non-owners
        if (message.author.id !== process.env.OWNER &&
            commandName in ownerCommands) {
            continue;
        }
        let set = aliases.get(commandFunc);
        if (!set) {
            set = new Set();
            aliases.set(commandFunc, set);
        }
        set.add(commandName);
    }
    await message.reply({
        content: select([
            'here you gooo',
            'taste and sample as you please',
            'please read carefully',
            'the aliases sometimes describe what the command does, sometimes',
            'helped'
        ]),
        embeds: [
            {
                title: select([
                    'nice, some commands',
                    'commands and aliases',
                    'words that i will accept',
                    'helpp'
                ]),
                fields: Array.from(aliases.values(), ([name, ...aliases]) => ({
                    name,
                    value: aliases.length
                        ? `or ${aliases.map(alias => `\`${alias}\``).join(' or ')}`
                        : select([
                            'no aliases, nice',
                            "that's it",
                            'this command has no aliases'
                        ]),
                    inline: true
                }))
            }
        ]
    });
}
const ownerCommands = {
    'ignore us please': ignore,
    exeunt: exit
};
const commands = {
    'source of <id>': getSource,
    'get raw message source of message <id> in this channel': getSource,
    'get raw message source of message <id> in channel <id>': getSource,
    'source of <id> in <id>': getSource,
    'source of <id>-<id>': getSourceFlipped,
    'get raw message source of message in channel <id> with id <id>': getSourceFlipped,
    'get source of <id>-<id>': getSourceFlipped,
    'how old is <id>': getDate,
    'when was <id> created': getDate,
    'when did i join discord': getDate,
    'how old am i': getDate,
    'who pinged <id>': whoPinged,
    'who pinged user <id> in channel <id>': whoPinged,
    'who pinged everyone in channel <id>': whoPinged,
    'who pinged <id> in <id>': whoPinged,
    'who pinged role <id> here': whoPinged,
    'who pinged everyone': whoPinged,
    'who pinged everyone here': whoPinged,
    'who pinged everyone in <id>': whoPinged,
    'who pinged me in <id>': whoPingedMe,
    'who pinged me in channel <id>': whoPingedMe,
    'who pinged me': whoPingedMe,
    'who pinged': whoPingedMe,
    'pfp of <id>': avatar,
    'get avatar of user <id>': avatar,
    'avatar of <id>': avatar,
    'profile picture of <id>': avatar,
    'my pfp': avatar,
    'whats my pfp': avatar,
    'status:': serverStatus,
    'who is on the minecraft server:': serverStatus,
    'track:': track,
    'track minecraft server:': track,
    'stop tracking': track,
    'this is a poll channel': pollChannel,
    'turn on poll channel mode which auto-adds reactions to messages': pollChannel,
    'poll channel': pollChannel,
    'this is poll': pollChannel,
    'this is poll channel': pollChannel,
    'this is not a poll channel': notPollChannel,
    'turn off poll channel mode': notPollChannel,
    'not poll channel': notPollChannel,
    'not poll': notPollChannel,
    'not a poll channel': notPollChannel,
    "this isn't a poll channel": notPollChannel,
    'emoji usage': getUsage,
    'welcome new folk in <id> with:': setWelcome,
    'when a user joins the server send a message in channel <id> containing the following:': setWelcome,
    'allow people to lock down <id>': setLockdownCategory,
    'set lockdown category id to <id>': setLockdownCategory,
    'close the gates': voteLockdown,
    "deny the unverified access to the commoners' channels": voteLockdown,
    'vote for lockdown': voteLockdown,
    about: about,
    'who are you': about,
    'introduce yourself': about,
    help: help,
    'list all of the commands and their aliases': help,
    ...ownerCommands
};
const client = new discord_js.Client({
    partials: [discord_js.Partials.Channel, discord_js.Partials.Message, discord_js.Partials.Reaction],
    intents: [
        discord_js.GatewayIntentBits.Guilds,
        discord_js.GatewayIntentBits.GuildMessages,
        discord_js.GatewayIntentBits.GuildMembers,
        discord_js.GatewayIntentBits.GuildMessageReactions,
        discord_js.GatewayIntentBits.DirectMessages,
        discord_js.GatewayIntentBits.MessageContent
    ]
});
client.on('messageCreate', async (message) => {
    if (ignoring !== null) {
        if (message.author.id === process.env.OWNER &&
            message.content === ignoring) {
            ignoring = null;
            await message.channel.send(select([
                "i'm BACK folkk",
                'i am BACK',
                'i have RETURNED',
                'IGNORANCE is now CRINGE again'
            ]));
        }
        return;
    }
    const parsed = parseCommand(message);
    // If ping
    if (parsed && !message.author.bot) {
        const { command, args } = parsed;
        if (command === '') {
            await message.reply(select([
                '<:ping:719277539113041930>',
                'please do not needlessly ping me',
                'do you need help? reply to this message with `help`',
                'what',
                'if you need help, reply `help`',
                'bruh'
            ]));
        }
        else if (commands[command]) {
            await commands[command](message, args);
        }
        else {
            console.log('Unknown command:', command);
            await message.reply(select([
                'idk what that means but ok',
                'please do not needlessly ping me',
                'was that meant to be a joke',
                'reply `help` if you need help',
                'reply to this message with `help` for a list of commands'
            ]));
        }
    }
    await onMessage$2(message);
    await onMessage$1(message);
    await onMessage(message);
    const reactions = getReactions$1(message, true) ??
        (await getReactions(message));
    if (reactions) {
        await Promise.all(reactions.map(em => message.react(em))).catch(() => { });
    }
});
client.on('messageUpdate', async (_oldMessage, newMessage) => {
    if (ignoring !== null) {
        return;
    }
    if (newMessage) {
        newMessage = await newMessage.fetch();
    }
    const reactions = getReactions$1(newMessage, false) ??
        (await getReactions(newMessage));
    if (reactions) {
        await Promise.all(reactions.map(em => newMessage.react(em))).catch(() => { });
    }
});
client.on('guildMemberAdd', async (member) => {
    if (ignoring !== null) {
        return;
    }
    await onJoin(member);
});
client.on('messageReactionAdd', async (reaction, user) => {
    if (ignoring !== null) {
        return;
    }
    onReact$1(reaction);
    onReact(reaction, user, true);
});
// There is also RemoveAll and RemoveEmoji, but I think they should keep the
// user's role and just clear reactions. Also easier for me 😊
client.on('messageReactionRemove', async (reaction, user) => {
    if (ignoring !== null) {
        return;
    }
    onReact(reaction, user, false);
});
process.on('unhandledRejection', reason => {
    console.error(reason);
});
fs.ensureDir('./data/')
    .then(() => Promise.all([
    onReady$5(),
    onReady$4(),
    onReady$3(),
    onReady$2(),
    onReady(),
    onReady$1()
]))
    .then(() => client.login(process.env.TOKEN))
    .then(() => init(client))
    .catch(err => {
    console.error(err);
    process.exit(1);
});
try {
    const { EventLogger } = require('node-windows');
    const log = new EventLogger('Floofy noises');
    // These errors show in Event Viewer
    const origLog = console.log;
    console.log = (...data) => {
        log.info(data.join(' '));
        origLog(data);
    };
    const origErr = console.error;
    console.error = error => {
        log.error(`${error?.stack}`);
        origErr(error);
    };
}
catch (error) {
    try {
        fs.writeFileSync('./data/EventLoggerError.txt', error instanceof Error ? error.stack || error.message : String(error));
    }
    catch { }
}
