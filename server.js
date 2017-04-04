/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }]*/
/* eslint no-lonely-if: "error"*/
const TelegramBot = require('node-telegram-bot-api');
const CronJob = require('cron').CronJob;
const ran = require('./ran');
const mongoose = require('mongoose');

const appUrl = `https://${process.env.APP_NAME}.herokuapp.com:443`;
const options = {
  webHook: { port: process.env.PORT },
};
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, options);

bot.setWebHook(`${appUrl}/bot${process.env.TELEGRAM_TOKEN}`);
const isReachable = require('is-reachable');

const Schema = new mongoose.Schema({
  chatId: Number,
  url: String,
  name: String,
  reachable: Boolean,
});

// Schema
const Client = mongoose.model('Server', Schema);

// Connect
mongoose.connect(process.env.MONGODB_URI, (error) => {
    if (error) console.error(error);
    else console.log('mongo connected');
});


bot.onText(/\/add (.+) (.+)/, (msg, match) => {
  const client = new Client();
  client.id = client._id;
  client.name = match[1];
  client.url = match[2];
  client.chatId = msg.chat.id;
  client.reachable = true;
  client.save((err) => {
    if (err) {
      console.log(err);
      bot.sendMessage(msg.chat.id, 'There is a error.');
    } else {
      bot.sendMessage(msg.chat.id, `${match[1]} - ${match[2]} added successfully.`);
    }
  });
});


bot.onText(/\/list/, (msg) => {
  Client.find({ 'chatId': msg.chat.id }, (err, servers) => {
    if (err) return console.error(err);
    servers.forEach((value) => {
      bot.sendMessage(msg.chat.id, `${value.name} ${value.url}`);
    });
  });
});

bot.onText(/\/delete (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const name = match[1];

  Client.findOneAndRemove({ chatId, name }, (err) => {
    if (err) {
      bot.sendMessage(chatId, `${name} doesn't deleted.`);
    } else {
      bot.sendMessage(chatId, `${name} deleted successfully.`);
    }
  });
});

new CronJob('* * * *', () => {
  Client.find((err, servers) => {
    if (err) return console.error(err);
    servers.forEach((value, key) => {
      isReachable(value.url).then(reachable => {
        if (!reachable) {
          if (value.reachable === true) {
            ran(value.url, (error, status) => {
              if (!status) {
                value.reachable = false;
                value.save();
                bot.sendMessage(value.chatId, `${value.name}, is unreachable.`);
              }
            })
          }
        } else {
          if (!value.reachable) {
            ran(value.url, (error, status) => {
              if (status) {
                value.reachable = true;
                value.save();
                console.log(value.chatId, `${value.name}, is reachable now!.`);
                bot.sendMessage(value.chatId, `${value.name}, is reachable now!.`);
              }
            })
          }
        }
      });
    });
  });
}, null, true, 'America/Los_Angeles');
