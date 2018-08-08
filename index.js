const mongoose = require("./db_connect");
require("./models/index");
var rp = require("request-promise");
const Stats = mongoose.model("Stats");
const cron = require("node-cron");
const uriFetch_markets = "https://bittrex.com/api/v1.1/public/getmarkets";
const uri = "https://bittrex.com/Api/v2.0/pub/market/GetLatestTick";

const market_options = {
  uri: uriFetch_markets,
  method: "GET",
  json: true
};
function save_it(formatted_data){
  const curntDate = new Date();
  const hour = curntDate.getHours();

 Stats.update({marketName:formatted_data.marketName,hour:hour},{
  $setOnInsert:{
      hour: hour,
      marketName: formatted_data.marketName,
      open:formatted_data.O,
      close:formatted_data.C,
      high:formatted_data.H,
      low:formatted_data.L ,
      total_volume:formatted_data.V,
      count:1,
      all_data: [{
        open:formatted_data.O,
        close:formatted_data.C,
        high:formatted_data.H,
        low:formatted_data.L ,
        volume: formatted_data.V,
        data_timestamp:formatted_data.T
      }]
  }
 }) 
}

function process_it() {
  rp(market_options)
    .then(data => {
      // in This  method i'm unable to get market names.
      //  let promiseArr = data.result.map((i)=>rp(`${uri}?marketName=${i.MarketName}&tickInterval=oneMin&_=${Date.now()}`));
      //     Promise.all(promiseArr).then(data=>{
      //       console.log(data);
      //     }).catch(error_tick=>{
      //       throw error_tick;
      //     });

      data.result.forEach(i => {
        rp(
          `${uri}?marketName=${
            i.MarketName
          }&tickInterval=oneMin&_=${Date.now()}`
        )
          .then(tick_data => {
            let tick_formatted = {
              ...JSON.parse(tick_data),
              marketName: i.MarketName
            };
            save_it(tick_formatted);
            // console.log(tick_formatted)
            //save it here in proper format
          })
          .catch(error_tick => {
            console.log(error_tick);
          });
      });
    })
    .catch(error_market => {
      throw error_market;
    });
}

cron.schedule("* * * * *", () => {
  process_it();
  console.log("Done Once!")
});
