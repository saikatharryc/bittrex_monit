const mongoose = require("./db_connect");
require("./models/index");
var rp = require("request-promise");
const Stats = mongoose.model("Stats");
const cron = require("node-cron");
const uriFetch_markets = "https://bittrex.com/api/v1.1/public/getmarkets";
const uri = "https://bittrex.com/Api/v2.0/pub/market/GetLatestTick";
const curntDate = new Date();
const hour = curntDate.getHours();

const market_options = {
  uri: uriFetch_markets,
  method: "GET",
  json: true
};
function save_it(formatted_data) {
  return Stats.update(
    { marketName: formatted_data.marketName, hour: hour },
    {
      $inc: {
        count: 1,
        total_volume: formatted_data.result[0].V
      },
      $max: {
        high: formatted_data.result[0].H
      },
      $min: {
        low: formatted_data.result[0].L
      },
      $set: {
        close: formatted_data.result[0].C
      },
      $push: {
        all_data: {
          open: formatted_data.result[0].O,
          close: formatted_data.result[0].C,
          high: formatted_data.result[0].H,
          low: formatted_data.result[0].L,
          volume: formatted_data.result[0].V,
          data_timestamp: formatted_data.result[0].T
        }
      }
    },
    { upsert: false }
  )
    .exec()
    .then(data => {
      if (data.nModified == 0) {
        try {
          return Stats.insertMany({
            hour: hour,
            marketName: formatted_data.marketName,
            open: formatted_data.result[0].O,
            close: formatted_data.result[0].C,
            high: formatted_data.result[0].H,
            low: formatted_data.result[0].L,
            total_volume: formatted_data.result[0].V,
            count: 1,
            all_data: [
              {
                open: formatted_data.result[0].O,
                close: formatted_data.result[0].C,
                high: formatted_data.result[0].H,
                low: formatted_data.result[0].L,
                volume: formatted_data.result[0].V,
                data_timestamp: formatted_data.result[0].T
              }
            ]
          });
        } catch (error_insert) {
          return Promise.reject(Error(error_insert));
        }
      } else {
        return Promise.resolve(data);
      }
    });
}

function process_it() {
  let promiseArr = [];
  return new Promise((resolve, reject) => {
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
              Stats.findOne({
                marketName: tick_formatted.marketName,
                hour: hour,
                "all_data.data_timestamp": tick_formatted.result[0].T
              })
                .select({ "all_data.$": 1 })
                .exec()
                .then(found_data => {
                  if (!found_data || !found_data.all_data) {
                    promiseArr.push(save_it(tick_formatted));
                  }
                })
                .catch(error_finding => {
                  return reject(Error(error_finding));
                });
              if (data.result.length == promiseArr.length) {
                Promise.all(promiseArr)
                  .then(data_saved => {
                    return resolve(data_saved);
                  })
                  .catch(error_saving => {
                    return reject(Error(error_saving));
                  });
              }
            })
            .catch(error_tick => {
              return reject(Error(error_tick));
            });
        });
      })
      .catch(error_market => {
        return reject(Error(error_market));
      });
  });
}

cron.schedule("* * * * *", () => {
  process_it()
    .then(data => {
      console.log(data);
    })
    .catch(error => {
      console.error(error);
    });
  console.log("Triggering!");
});
