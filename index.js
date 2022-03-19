const Discord = require('discord.js');
const WebSocket = require('ws');
const fs = require('fs');
require('dotenv').config();

let cryptos = ['BTC','COMP','DOGE','EOS','LINK','MKR','STORJ','TRX','YFI','AAVE','ATOM','BAT','DASH','DOT','ETC','IOTA','MATIC','XEM','XRP','ZEC','ADA','BCH','EGLD','ETH','LTC','NEO','RVN','UNI','XLM','XTZ','ZIL','ALGO','AVAX','BNB','ENJ','FIL','LUNA','SOL','THETA','VET','XMR','ZRX'];

var jsonPrices = {};
var lastPrices = new Map();
var prices = new Map();

var whitelist = [];

const client = new Discord.Client({
	intents: [
		Discord.Intents.FLAGS.GUILDS,
		Discord.Intents.FLAGS.GUILD_MESSAGES
	]
});

client.on('ready', () => {
  console.log(new Date().toLocaleString() + ` | INFO | Logged in as ${client.user.tag}`);

  setPresence();
  fetchWhiteList();
  startPriceFetcher();

  startEveryMinuteTasks();
  startHourlyTasks();
  
  const guildID = "";
  const guild = client.guilds.cache.get(guildID);
  let commands;

  if(guild){
    commands = guild.commands;
  }else{
    commands = client.application?.commands;
  }

  commands?.create({
    name: 'help',
    description: 'Show all commands.'
  });

  commands?.create({
    name: 'donate',
    description: 'Show crypto addresses from your friends for a donation.',
    options: [
      {
        name: 'to',
        description: 'Display crypto addresses from a specific person.',
        required: true,
        type: Discord.Constants.ApplicationCommandOptionTypes.USER
      }
    ]
  });

  commands?.create({
    name: 'whitelist',
    description: 'Command outputs in whitelisted channels are visible to everyone.',
    options: [
      {
        name: 'add',
        description: 'Add channel to the whitelist.',
        type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
        options: [
          {
            name: 'channel',
            description: 'Add channel to the whitelist.',
            required: true,
            type: Discord.Constants.ApplicationCommandOptionTypes.CHANNEL
          }
        ]
      },
      {
        name: 'remove',
        description: 'Remove channel from the whitelist.',
        type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
        options: [
          {
            name: 'channel',
            description: 'Remove channel from the whitelist.',
            required: true,
            type: Discord.Constants.ApplicationCommandOptionTypes.CHANNEL
          }
        ]
      }
    ]
  });

  cryptos.forEach(crypto => {
    let name = crypto.toLowerCase();
    commands?.create({
      name: name,
      description: 'General ' + crypto + ' commands',
      options: [
        {
          name: 'price',
          description: 'Display ' + crypto + ' price',
          type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
          options: [
            {
              name: 'amount',
              description: 'Calculate worth of your ' + crypto,
              required: false,
              type: Discord.Constants.ApplicationCommandOptionTypes.NUMBER,
            }
          ]
        },
        {
          name: 'set',
          description: 'Set your own ' + crypto + ' address to accept donations.',
          type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
          options: [
            {
              name: 'address',
              description: 'Enter your own ' + crypto + ' address to accept donations.',
              required: true,
              type: Discord.Constants.ApplicationCommandOptionTypes.STRING
            }
          ]
        },
        {
          name: 'remove',
          description: 'Remove your ' + crypto + ' address from donations.',
          type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND
        }
      ]
    });
  });
  
});

//Help
client.on('interactionCreate', async interaction => {
  if(!interaction.isCommand()) return;
  if(interaction.commandName != 'help') return;

  const embed = new Discord.MessageEmbed()
  .setColor("ORANGE")
  .setTitle("CryptoBot Help")
  .setThumbnail("https://cryptobal.info/images/logo.png")
  .setURL("https://cryptobal.info")
  .addField("/[crypto] price", "Show price of specific crypto", false)
  .addField("/[crypto] price [amount]", "Show price of specific amount of crypto", false)
  .addField("/[crypto] set [address]", "Set crypto address in donation list", false)
  .addField("/[crypto] remove", "Remove crypto address from donation list", false)
  .addField("/donate [user]", "Show donation list from specific user", false)
  .addField("/whitelist add [channel]", "Add channel to the whitelist", false)
  .addField("/whitelist remove [channel]", "Remove channel from the whitelist", false)
  .setTimestamp(new Date());

  let jsonE = { embeds: [ embed ], ephemeral: true };
  if(whitelist.includes(interaction.channel.id)) jsonE = { embeds: [ embed ], ephemeral: false };
  interaction.reply(jsonE);
});

//Cryptos
client.on('interactionCreate', async interaction => {
	if(!interaction.isCommand()) return;
  if(!cryptos.includes(interaction.commandName.toUpperCase())) return;
  let crypto = interaction.commandName.toUpperCase();
  let action = interaction.options.getSubcommand();
	
  if(action == 'price'){
    let price = parseFloat(prices.get(crypto));
    let amount = interaction.options.getNumber("amount");

    if(typeof amount === 'number'){
      let worth = amount * price;
      price = (price < 0.10) ? price.toFixed(4) : price.toFixed(2);

      const embed = new Discord.MessageEmbed()
      .setColor("ORANGE")
      .setTitle(crypto + " calculator")
      .setThumbnail("https://cryptobal.info/images/cryptos/" + crypto + ".png")
      .setURL("https://cryptobal.info")
      .setDescription(amount + " " + crypto + " = **$" + worth.toFixed(2) +"**")
      .setTimestamp(new Date());

      let jsonE = { embeds: [ embed ], ephemeral: true };
      if(whitelist.includes(interaction.channel.id)) jsonE = { embeds: [ embed ], ephemeral: false };
      interaction.reply(jsonE);
      return;
    }

    price = (price < 0.10) ? price.toFixed(4) : price.toFixed(2);

    const embed = new Discord.MessageEmbed()
    .setColor("ORANGE")
    .setTitle(crypto + " price")
    .setThumbnail("https://cryptobal.info/images/cryptos/" + crypto + ".png")
    .setURL("https://cryptobal.info")
    .setDescription("**$" + price +"**")
    .setTimestamp(new Date());

    let jsonE = { embeds: [ embed ], ephemeral: true };
    if(whitelist.includes(interaction.channel.id)) jsonE = { embeds: [ embed ], ephemeral: false };
    interaction.reply(jsonE);
  }else if(action == 'set'){
    let address = interaction.options.getString("address");
    if(!(address.length >= 15 && address.length <= 128 && !address.includes(" "))){
      const embed = new Discord.MessageEmbed()
      .setColor("RED")
      .setTitle("ERROR")
      .setThumbnail("https://cryptobal.info/images/cryptos/" + crypto + ".png")
      .setDescription("**Inputed " + crypto + " address is not valid!**")
      .setTimestamp(new Date());

      interaction.reply({ embeds: [ embed ], ephemeral: true });
      return;
    }

    fs.readFile("data/users.json", 'utf-8', (err, data) => {
      if(err != null){
        const embed = new Discord.MessageEmbed()
        .setColor("RED")
        .setTitle("ERROR")
        .setThumbnail("https://cryptobal.info/images/cryptos/" + crypto + ".png")
        .setDescription("**Something went wrong. Please try again.**")
        .setTimestamp(new Date());
  
        interaction.reply({ embeds: [ embed ], ephemeral: true });
        return;
      }

      json = JSON.parse(data);
      if(json[interaction.user.id] == null) json[interaction.user.id] = {};
      json[interaction.user.id][crypto] = address;
      fs.writeFile("data/users.json", JSON.stringify(json), 'utf-8', () => {
        const embed = new Discord.MessageEmbed()
        .setColor("GREEN")
        .setTitle("SUCCESS")
        .setThumbnail("https://cryptobal.info/images/cryptos/" + crypto + ".png")
        .setDescription("**" + crypto + " donation address has been set successfully.**")
        .setTimestamp(new Date());
  
        interaction.reply({ embeds: [ embed ], ephemeral: true });
      });
    });
  }else if(action == 'remove'){
    fs.readFile("data/users.json", 'utf-8', (err, data) => {
      if(err != null){
        const embed = new Discord.MessageEmbed()
        .setColor("RED")
        .setTitle("ERROR")
        .setThumbnail("https://cryptobal.info/images/cryptos/" + crypto + ".png")
        .setDescription("**Something went wrong. Please try again.**")
        .setTimestamp(new Date());
  
        interaction.reply({ embeds: [ embed ], ephemeral: true });
        return;
      }

      json = JSON.parse(data);
      if(json[interaction.user.id] == null || json[interaction.user.id][crypto] == null){
        const embed = new Discord.MessageEmbed()
        .setColor("YELLOW")
        .setTitle("No action required")
        .setThumbnail("https://cryptobal.info/images/cryptos/" + crypto + ".png")
        .setDescription("**" + crypto + " address for donations has already been removed.**")
        .setTimestamp(new Date());
  
        interaction.reply({ embeds: [ embed ], ephemeral: true });
        return;
      }

      delete json[interaction.user.id][crypto];
      fs.writeFile("data/users.json", JSON.stringify(json), 'utf-8', () => {
        const embed = new Discord.MessageEmbed()
        .setColor("GREEN")
        .setTitle("SUCCESS")
        .setThumbnail("https://cryptobal.info/images/cryptos/" + crypto + ".png")
        .setDescription("**" + crypto + " donation address has been removed successfully.**")
        .setTimestamp(new Date());
  
        interaction.reply({ embeds: [ embed ], ephemeral: true });
      });

    });
  }
});

// Donations
client.on('interactionCreate', async interaction => {
  if(!interaction.isCommand()) return;
  if(interaction.commandName != 'donate') return;
  let user = interaction.options.getUser("to");

  let embed = new Discord.MessageEmbed()
  .setColor(user.hexAccentColor)
  .setTitle(user.username)
  .setDescription("Those crypto addresses are owned by " + user.tag)
  .setThumbnail(user.avatarURL())
  .setTimestamp(new Date());

  fs.readFile("data/users.json", 'utf-8', (err, data) => {
    if(err != null){
      const embed = new Discord.MessageEmbed()
      .setColor("RED")
      .setTitle("ERROR")
      .setThumbnail("https://cryptobal.info/images/cryptos/" + crypto + ".png")
      .setDescription("**Something went wrong. Please try again.**")
      .setTimestamp(new Date());

      let jsonE = { embeds: [ embed ], ephemeral: true };
      if(whitelist.includes(interaction.channel.id)) jsonE = { embeds: [ embed ], ephemeral: false };
      interaction.reply(jsonE);
      return;
    }

    json = JSON.parse(data);
    if(json[user.id] != null){
      Object.keys(json[user.id]).forEach(crypto => {
        embed.addField(crypto, json[user.id][crypto], false);
      });
    }else{
      embed.setDescription("**" + user.tag + "** did not set their crypto addresses for donations. Make sure to remind him.");
    }

    let jsonE = { embeds: [ embed ], ephemeral: true };
    if(whitelist.includes(interaction.channel.id)) jsonE = { embeds: [ embed ], ephemeral: false };
    interaction.reply(jsonE);
  });

});

//Whitelist
client.on('interactionCreate', async interaction => {
  if(!interaction.isCommand()) return;
  if(interaction.commandName != 'whitelist') return;
  let action = interaction.options.getSubcommand();
  if(action == 'add'){
    let channel = interaction.options.getChannel('channel');
    if(!interaction.member.permissionsIn(channel).has('ADMINISTRATOR')){
      const embed = new Discord.MessageEmbed()
      .setColor("RED")
      .setTitle("ERROR")
      .setThumbnail("https://cryptobal.info/images/logo.png")
      .setDescription("**You don't have permission to add this channel to the whitelist.**")
      .setTimestamp(new Date());

      interaction.reply({ embeds: [ embed ], ephemeral: true });
      return;
    }

    if(whitelist.includes(channel.id)){
      const embed = new Discord.MessageEmbed()
      .setColor("YELLOW")
      .setTitle("INFO")
      .setThumbnail("https://cryptobal.info/images/logo.png")
      .setDescription("**This channel is already on the whitelist.**")
      .setTimestamp(new Date());

      interaction.reply({ embeds: [ embed ], ephemeral: true });
      return;
    }

    fs.readFile("data/whitelist.json", 'utf-8', (err, data) => {
      if(err != null){
        const embed = new Discord.MessageEmbed()
        .setColor("RED")
        .setTitle("ERROR")
        .setThumbnail("https://cryptobal.info/images/logo.png")
        .setDescription("**Something went wrong. Please try again.**")
        .setTimestamp(new Date());
  
        interaction.reply({ embeds: [ embed ], ephemeral: true });
        return;
      }

      whitelist = JSON.parse(data);
      whitelist.push(channel.id);

      fs.writeFile("data/whitelist.json", JSON.stringify(whitelist), 'utf-8', () => {
        const embed = new Discord.MessageEmbed()
        .setColor("GREEN")
        .setTitle("SUCCESS")
        .setThumbnail("https://cryptobal.info/images/logo.png")
        .setDescription("**Channel has been whitelisted successfully.**")
        .setTimestamp(new Date());
  
        interaction.reply({ embeds: [ embed ], ephemeral: true });
      });
    });

  }else if(action == 'remove'){
    let channel = interaction.options.getChannel('channel');
    if(!interaction.member.permissionsIn(channel).has('ADMINISTRATOR')){
      const embed = new Discord.MessageEmbed()
      .setColor("RED")
      .setTitle("ERROR")
      .setThumbnail("https://cryptobal.info/images/logo.png")
      .setDescription("**You don't have permission to remove this channel from the whitelist.**")
      .setTimestamp(new Date());

      interaction.reply({ embeds: [ embed ], ephemeral: true });
      return;
    }

    if(!whitelist.includes(channel.id)){
      const embed = new Discord.MessageEmbed()
      .setColor("YELLOW")
      .setTitle("INFO")
      .setThumbnail("https://cryptobal.info/images/logo.png")
      .setDescription("**This channel is not on the whitelist.**")
      .setTimestamp(new Date());

      interaction.reply({ embeds: [ embed ], ephemeral: true });
      return;
    }

    fs.readFile("data/whitelist.json", 'utf-8', (err, data) => {
      if(err != null){
        const embed = new Discord.MessageEmbed()
        .setColor("RED")
        .setTitle("ERROR")
        .setThumbnail("https://cryptobal.info/images/logo.png")
        .setDescription("**Something went wrong. Please try again.**")
        .setTimestamp(new Date());
  
        interaction.reply({ embeds: [ embed ], ephemeral: true });
        return;
      }

      const index = whitelist.indexOf(channel.id);
      if (index > -1) whitelist.splice(index, 1);

      fs.writeFile("data/whitelist.json", JSON.stringify(whitelist), 'utf-8', () => {
        const embed = new Discord.MessageEmbed()
        .setColor("GREEN")
        .setTitle("SUCCESS")
        .setThumbnail("https://cryptobal.info/images/logo.png")
        .setDescription("**Channel has been removed from whitelist successfully.**")
        .setTimestamp(new Date());
  
        interaction.reply({ embeds: [ embed ], ephemeral: true });
      });
    });
  }
});

function startPriceFetcher(){
  const socket = new WebSocket('wss://fstream.binance.com/ws/!markPrice@arr');

  socket.on('open', () => {
    console.log(new Date().toLocaleString() + " | INFO | WebSocket oppened");
  });

  socket.on('close', () => {
    console.log(new Date().toLocaleString() + " | INFO | WebSocket closed");
    startPriceFetcher();
  });

  socket.on('message', (data) => {
    jsonPrices = JSON.parse(data);
    cryptos.forEach(crypto => {
      for(let i = 0; i < jsonPrices.length; i++){
        let symbol = crypto + "USDT";
        let symbol2 = jsonPrices[i].s;
        if(symbol != symbol2) continue;
        lastPrices.set(crypto, prices.get(crypto));
        prices.set(crypto, jsonPrices[i].p);
      }
    });
  });
}

function fetchWhiteList(){
  fs.readFile("data/whitelist.json", 'utf-8', (err, data) => {
    if(err != null){
      console.log(new Date().toLocaleString() + " | ERROR | Fetching data from whitelist.json");
      return;
    }
    whitelist = JSON.parse(data);
  });
}

function setPresence(){
  client.user.setPresence({ status: 'online', activities: [{ name: client.guilds.cache.size + " servers", type: "WATCHING" }] });
}

function startEveryMinuteTasks(){
  setInterval(() => {
    fetchWhiteList();
  }, 60000);
}

function startHourlyTasks(){
  setInterval(() => {
    setPresence();
    console.log(new Date().toLocaleString() + " | INFO | Hourly tasks executed");
  }, 3600000);
}

client.login(process.env.token);