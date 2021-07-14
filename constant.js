exports.SENTIMENT_DB = "sentimentDB";
exports.COLLECTIONS = {
  ANALYSIS: "analysis",
  TRACKERSTATE: "trackerState",
};

// $ cashtag is not supported for our API level
exports.TRACKERS = {
  //Bitcoin has too much traffic to work for our API rate limits
  // BITCOIN: {
  //     name: "Bitcoin",
  //     tag: "bitcoin",
  //     rule: "(btc OR #btc OR bitcoin OR #bitcoin) lang:en",
  // }
  PAYCOM: {
    name: "Paycom Software, Inc.",
    tag: "paycom",
    rule: "(payc OR #payc OR paycom OR #paycom) lang:en",
  },
  DEVON: {
    name: "Devon Energy Corp",
    tag: "devon",
    rule: "(dvn OR #dvn OR devon energy OR #devonenergy) lang:en",
  },
  FORTINET: {
    name: "Fortinet Inc.",
    tag: "fortinet",
    rule: "(ftnt OR #ftnt OR fortinet OR #fortinet) lang:en",
  },
  CARMAX: {
    name: "CarMax Inc.",
    tag: "carmax",
    rule: "(kmx OR #kmx OR carmax OR #carmax) lang:en",
  },
};

exports.SYMBOLS = [
  { symbol: "PAYC", tracker: this.TRACKERS.PAYCOM },
  { symbol: "DVN", tracker: this.TRACKERS.DEVON },
  { symbol: "FTNT", tracker: this.TRACKERS.FORTINET },
  { symbol: "KMX", tracker: this.TRACKERS.CARMAX },
];

exports.TWITTER_URLS = {
  RECENT_SEARCH: "https://api.twitter.com/2/tweets/search/recent",
  STREAM_RULES: "https://api.twitter.com/2/tweets/search/stream/rules",
  STREAM: "https://api.twitter.com/2/tweets/search/stream",
};
