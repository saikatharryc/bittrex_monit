const mongoose = require("mongoose");

const { StatSchema } = require("./Stats");

mongoose.model("Stats", StatSchema);

module.exports = mongoose;
