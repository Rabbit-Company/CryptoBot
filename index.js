const Discord = require('discord.js');
const WebSocket = require('ws');
const fs = require('fs');
require('dotenv').config();

let cryptos = ['BTC','COMP','DOGE','EOS','LINK','MKR','STORJ','TRX','YFI','AAVE','ATOM','BAT','DASH','DOT','ETC','IOTA','MATIC','XEM','XRP','ZEC','ADA','BCH','EGLD','ETH','LTC','NEO','RVN','UNI','XLM','XTZ','ZIL','ALGO','AVAX','BNB','ENJ','FIL','LUNA','SOL','THETA','VET','XMR','ZRX'];

var jsonPrices = {};
var lastPrices = new Map();
var prices = new Map();

const client = new Discord.Client({ 
	intents: [
		Discord.Intents.FLAGS.GUILDS,
		Discord.Intents.FLAGS.GUILD_MESSAGES
	] 
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  startPriceFetcher();
  
  const guildID = "954118145872896090";
  const guild = client.guilds.cache.get(guildID);
  let commands;

  if(guild){
    commands = guild.commands;
  }else{
    commands = client.application?.commands;
  }

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
              description: 'Enter your own ' + crypto + ' address to accept donations',
              required: true,
              type: Discord.Constants.ApplicationCommandOptionTypes.STRING
            }
          ]
        }
      ]
    });
  });
  
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

      interaction.reply({ embeds: [ embed ], ephemeral: true });
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

    interaction.reply({ embeds: [ embed ], ephemeral: true });
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

    fs.readFile("users.json", 'utf-8', (err, data) => {
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
      fs.writeFile("users.json", JSON.stringify(json), 'utf-8', () => {
        const embed = new Discord.MessageEmbed()
        .setColor("GREEN")
        .setTitle("SUCCESS")
        .setThumbnail("https://cryptobal.info/images/cryptos/" + crypto + ".png")
        .setDescription("**" + crypto + " donation address has been set successfully.**")
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

  fs.readFile("users.json", 'utf-8', (err, data) => {
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
    if(json[user.id] != null){
      Object.keys(json[user.id]).forEach(crypto => {
        embed.addField(crypto, json[user.id][crypto], false);
      });
    }else{
      embed.setDescription("User did not set their crypto addresses for donations. Make sure to remind him.");
    }

    interaction.reply({ embeds: [ embed ], ephemeral: true });
  });

});

function startPriceFetcher(){
  const socket = new WebSocket('wss://fstream.binance.com/ws/!markPrice@arr');

  socket.on('open', () => {
    console.log("WebSocket oppened at " + new Date().toLocaleString());
  });

  socket.on('close', () => {
    console.log("WebSocket closed at " + new Date().toLocaleString());
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

client.login(process.env.token);