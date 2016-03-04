'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');
var moment = require('moment');

/**
 * Constructor function. It accepts a settings object which should contain the following keys:
 *      token : the API token of the bot (mandatory)
 *      name : the name of the bot (will default to "trainbot")
 *      dbPath : the path to access the database (will default to "data/norrisbot.db")
 *
 * @param {object} settings
 * @constructor
 *
 * @author Luciano Mammino <lucianomammino@gmail.com>
 */
var TrainBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'trainbot';
    this.dbPath = settings.dbPath || path.resolve(__dirname, '..', 'data', 'norrisbot.db');

    this.user = null;
    this.db = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(TrainBot, Bot);

/**
 * Run the bot
 * @public
 */
TrainBot.prototype.run = function () {
    TrainBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

/**
 * On Start callback, called when the bot connects to the Slack server and access the channel
 * @private
 */
TrainBot.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

/**
 * On message callback, called when a message (of any type) is detected with the real time messaging API
 * @param {object} message
 * @private
 */
TrainBot.prototype._onMessage = function (message) {
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromTrainBot(message) &&
        this._isMentioningTrainBot(message)
    ) {
        this._reply(message);
    }
};

/**
 * Replyes to a message with a random Joke
 * @param {object} originalMessage
 * @private
 */


 TrainBot.prototype._showTimes = function (input) {
    var self = this;

    var data =
    [
        {from: '23:53'},
        {from: '21:17'},
        {from: '19:00'},
        {from: '17:40'},
        {from: '17:04'},
        {from: '15:34'},
        {from: '14:32'},
        {from: '11:05'},
        {from: '9:42'},
        {from: '7:42'},
        {from: '7:18'},
        {from: '6:39'},
        {from: '6:00'},
        {from: '5:13'}
    ];

    var now = moment();
    var data_unix = data;
    var nearest = ''

    for(var i=0; data.length > i; i++) {
        var compare_time = moment(data_unix[i].from, 'HH:mm');

        if(now.isAfter(compare_time)) {
            break;
        }
        nearest = compare_time.format('h:mm a')
    }

    var channel = self._getChannelById(input.channel);
    self.postMessageToChannel(channel.name, 'The next train leaves at ' + nearest, {as_user: true});

 }



TrainBot.prototype._reply = function (input) {
    var self = this;

    var input_split = input.text.split(",");
    console.log(input);
    var arg_1 = input_split[1];
    var arg_2 = input_split[2];
    var arg_3 = input_split[3];

    if(arg_1 === 'help') {
        this._help();        
    }
    else if(arg_1.length){
        this._showTimes(input);
    }





    // self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function (err, record) {
    //     if (err) {
    //         return console.error('DATABASE ERROR:', err);
    //     }

    //     var channel = self._getChannelById(input.channel);
    //     self.postMessageToChannel(channel.name, record.joke, {as_user: true});
    //     self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
    // });
};

/**
 * Loads the user object representing the bot
 * @private
 */
TrainBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

/**
 * Open connection to the db
 * @private
 */
TrainBot.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

/**
 * Check if the first time the bot is run. It's used to send a welcome message into the channel
 * @private
 */
TrainBot.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

TrainBot.prototype._help = function () {
    this.postMessageToChannel(this.channels[0].name, 'Hi!' +
        '\n Usage: trainbot <command>' +
        '\n \n where <command> are the following arguments:' +
        '\n {origin}, {destination}, {time of day}',
        {as_user: true});
};

/**
 * Sends a welcome message in the channel
 * @private
 */
TrainBot.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name, 'Hi!' +
        '\n Just say `trainbot` to invoke me!',
        {as_user: true});
};

/**
 * Util function to check if a given real time message object represents a chat message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
TrainBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

/**
 * Util function to check if a given real time message object is directed to a channel
 * @param {object} message
 * @returns {boolean}
 * @private
 */
TrainBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C'
        ;
};

/**
 * Util function to check if a given real time message is mentioning Trainbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
TrainBot.prototype._isMentioningTrainBot = function (message) {
    return message.text.toLowerCase().indexOf('trainbot') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

/**
 * Util function to check if a given real time message has ben sent by the Trainbot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
TrainBot.prototype._isFromTrainBot = function (message) {
    return message.user === this.user.id;
};

/**
 * Util function to get the name of a channel given its id
 * @param {string} channelId
 * @returns {Object}
 * @private
 */
TrainBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

module.exports = TrainBot;
