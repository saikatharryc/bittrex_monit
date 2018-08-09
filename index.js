const config = require("./config/config");
const mongoose = require("./db_connect");
require("./models/index");
var rp = require("request-promise");
const Stats = mongoose.model("Stats");
const cron = require("node-cron");
const sendMail = require("./send_mail");

const market_options = {
  uri: config.req_uri.market,
  method: "GET",
  json: true
};

/**
 * Save data of Every minute from latesttick in DB.
 *
 * @param {Object} formatted_data
 * @param {Boolean} full
 * @returns Promise
 */
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
  //Lets not Update the minutes high,low, close,
  // and total volume when same data getting after a minute also.
  // Just insert the data into an array and increasing the count.
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
      //if nothing gets updated, insert doc
      if (data.nModified == 0) {
        try {
          return Stats.insertMany({
            hour: new Date().getHours(),
            expireAt: new Date().setDate(new Date().getDate() + 1), //Becaus i want to delete this next day
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
/**
 * Calls Market and then for each market it calls for latest tick.
 *  and then save the data afterwards.
 * @returns Promise
 */
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
            `${config.req_uri.latest_tick}?marketName=${
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
/**
 * Run This function Every minute
 */
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
      //check for 5,15,30,60 minutes and send the data as its count from 0
      // so adding [4, 14, 29, 59]
      Stats.find({ count: { $in: [4, 14, 29, 59],hour:new Date().getHours() } })
        .exec()
        .then(stat_data => {
          if (stat_data.length) {
            const no_markets = stat_data.length;
            let data_arr = [];
            stat_data.forEach(i => {
              data_arr.push({
                market: i.marketName,
                tickValue: i.all_data.length,
                close: i.close,
                open: i.open,
                low: i.low,
                high: i.high,
                total_volume: i.total_volume
              });

              if (no_markets == data_arr.length) {
                //send a mail
                return sendMail
                  .mailit([config.smtp_credentials.send_to], {
                    subject: `Summry after ${
                      i.all_data.length
                    } tick & of ${no_markets} markets`,
                    text: JSON.stringify(data_arr),
                    body: JSON.stringify(data_arr)
                  })
                  .then(mail_data => {
                    console.log(mail_data);
                  })
                  .catch(error_mail => {
                    console.log(error_mail);
                  });
              }
            });
          } else {
            return;
          }
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
