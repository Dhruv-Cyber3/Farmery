const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FeedbackSchema = new Schema({
  cname: {
    type: String,
    required: true,
  },
  cemail: {
    type: String,
    required: true,
  },
  content: {
    type: String,
  },
});

module.exports = mongoose.model("Feedback", FeedbackSchema);
