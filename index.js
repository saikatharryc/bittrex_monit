const mongoose = require("./db_connect");
require("./models/index");
var rp = require('request-promise');
const Stats = mongoose.model('Stats');

const uriFetch_markets = "https://bittrex.com/api/v1.1/public/getmarkets";
const uri = "https://bittrex.com/Api/v2.0/pub/market/GetLatestTick";
let marketList=[];

const market_options= {
  uri:uriFetch_markets,
  method:'GET',
  json: true 
}

rp(market_options).then(data=>{

// in This  method i'm unable to get market names.
//  let promiseArr = data.result.map((i)=>rp(`${uri}?marketName=${i.MarketName}&tickInterval=oneMin&_=${Date.now()}`));
//     Promise.all(promiseArr).then(data=>{
//       console.log(data);
//     }).catch(error_tick=>{
//       throw error_tick;
//     });

data.result.forEach(i=>{
  rp(`${uri}?marketName=${i.MarketName}&tickInterval=oneMin&_=${Date.now()}`).then(tick_data=>{
    let tick_formatted = {...JSON.parse(tick_data),marketName:i.MarketName};
    Stats.update({})
  }).catch(error_tick=>{
    console.log(error_tick);
  })
});


}).catch(error_market=>{
  throw error_market;
});