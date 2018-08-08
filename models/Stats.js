const mongoose = require("mongoose");

var MinuteSchema = mongoose.Schema({
  minute: Number,
  open: Number,
  close: Number,
  high: Number,
  low: Number,
  volume: Number
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
    count: {
      type: Number,
      default: 0
    },
    all_data: [MinuteSchema]
  },
  { timestamps: true }
);
module.exports = { StatSchema };
