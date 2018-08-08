const mongoose = require("./db_connect");
require("./models/index");
var rp = require("request-promise");
const Stats = mongoose.model("Stats");
const cron = require("node-cron");
const sendMail = require('./send_mail');

const uriFetch_markets = "https://bittrex.com/api/v1.1/public/getmarkets";
const uri = "https://bittrex.com/Api/v2.0/pub/market/GetLatestTick";

const market_options = {
  uri: uriFetch_markets,
  method: "GET",
  json: true
};

function save_it(formatted_data, full) {
  let update_query = {
    $inc: {
      count: 1
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
  };
  if (full) {
    Object.assign(update_query, {
      $max: {
        high: formatted_data.result[0].H
      },
      $min: {
        low: formatted_data.result[0].L
      },
      $set: {
        close: formatted_data.result[0].C
      }
    });
    Object.assign(update_query["$inc"], {
      total_volume: formatted_data.result[0].V
    });
  }
  return Stats.update(
    { marketName: formatted_data.marketName, hour: new Date().getHours() },
    update_query,
    { upsert: false }
  )
    .exec()
    .then(data => {
      if (data.nModified == 0) {
        try {
          return Stats.insertMany({
            hour: new Date().getHours(),
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
                hour: new Date().getHours(),
                "all_data.data_timestamp": tick_formatted.result[0].T
              })
                .select({ "all_data.$": 1 })
                .exec()
                .then(found_data => {
                  if (!found_data || !found_data.all_data) {
                    promiseArr.push(save_it(tick_formatted, true));
                  } else {
                    promiseArr.push(save_it(tick_formatted, false));
                  }
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
                .catch(error_finding => {
                  return reject(Error(error_finding));
                });
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
      // i'm unable to use aggregate here, probably because i'm using mlab free instance
      // Stats.aggregate([
      //   {
      //     $match: { hour: new Date().getHours() },
      //     $project: {
      //       open: 1,
      //       close: 1,
      //       high: 1,
      //       low: 1,
      //       total_volume: 1,
      //       count: 1,
      //       data_points: { $size: "$all_data" }
      //     }
      //   }
      // ])
      Stats.find({})
        .exec()
        .then(stat_data => {
          console.log(stat_data);
          const no_markets = stat_data.length;
          let data_arr = [];
          stat_data.forEach(i => {
            if (
              i.all_data.length == 5 ||
              i.all_data.length == 15 ||
              i.all_data.length == 30 ||
              i.all_data.length == 60
            ) {
              data_arr.push({
                market: no_markets,
                tickValue: i.all_data.length,
                close: stat_data.close,
                open: stat_data.open,
                low: stat_data.low,
                high: stat_data.high,
                total_volume: stat_data.total_volume
              });

              if(no_markets ==data_arr.length){
                return sendMail.mailit(['saikat@kiot.io'],{
                  subject:`Summry after ${i.all_data.length} tick`,
                  text:JSON.stringify(data_arr),
                  body:JSON.stringify(data_arr)
                }).then(mail_data=>{
                  console.log(mail_data)
                }).catch(error_mail=>{
                  console.log(error_mail)
                });
                console.log('Sent mail');
              }
            }

          });
        })
        .catch(stat_error => {
          throw stat_error;
        });
    })
    .catch(error => {
      console.error(error);
    });
  console.log("Triggering!");
});
