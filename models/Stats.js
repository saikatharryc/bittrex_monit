const mongoose = require("mongoose");

var MinuteSchema = mongoose.Schema({
  open: Number,
  close: Number,
  high: Number,
  low: Number,
  volume: Number,
  data_timestamp:Date
});
var StatSchema = mongoose.Schema(
  {
    hour: Number,
    marketName: String,
    open: {
      type: Number,
      default: 0
    },
    close: {
      type: Number,
      default: 0
    },
    high: {
      type: Number,
      default: 0
    },
    low: {
      type: Number,
      default: 0
    },
    total_volume:{
        type: Number,
        default: 0
    },
    count: {
      type: Number,
      default: 0
    },
    all_data: [MinuteSchema]
  }
);
module.exports = { StatSchema };
