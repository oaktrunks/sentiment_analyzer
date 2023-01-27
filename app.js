const port = process.env.PORT || 3000;

const Constant = require("./constant.js");
const { MongoClient } = require("mongodb");
const needle = require("needle");
const vader = require("vader-sentiment");
// TODO set this up to use localhost once app is ready for deployment
const uri = "";
const client = new MongoClient(uri);
//TODO process env vars
// const token = process.env.BEARER_TOKEN;
const token = "";

async function main() {
  await client.connect();

  let rules = [];
  for (key in Constant.TRACKERS) {
    const tracker = Constant.TRACKERS[key];

    //See if tracker exists in database
    //do recent_search
    //store all tweets later than latest data in db
    const latestUpdate = await findOne(Constant.COLLECTIONS.TRACKERSTATE, {
      tag: tracker.tag,
    });
    let latestUpdateId = latestUpdate ? latestUpdate.newestId : 0;
    rules.push({
      value: tracker.rule,
      tag: tracker.tag,
    });

    await recentSearchAnalysis(tracker, 100, latestUpdateId);
  }
  await setupFilteredStream(rules);
  await filteredStreamConnect(0);
}
main();

async function getAllRules() {
  const response = await needle("get", Constant.TWITTER_URLS.STREAM_RULES, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  if (response.statusCode !== 200) {
    console.log("Error:", response.statusMessage, response.statusCode);
    throw new Error(response.body);
  }
  return response.body;
}

async function deleteAllRules(rules) {
  if (!Array.isArray(rules.data)) {
    return null;
  }
  const ids = rules.data.map((rule) => rule.id);
  const data = {
    delete: {
      ids: ids,
    },
  };
  const response = await needle(
    "post",
    Constant.TWITTER_URLS.STREAM_RULES,
    data,
    {
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
    }
  );
  if (response.statusCode !== 200) {
    throw new Error(response.body);
  }
  return response.body;
}

async function setRules(rules) {
  const data = {
    add: rules,
  };
  const response = await needle(
    "post",
    Constant.TWITTER_URLS.STREAM_RULES,
    data,
    {
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
    }
  );
  if (response.statusCode !== 201) {
    throw new Error(response.body);
  }
  return response.body;
}

function filteredStreamConnect(retryAttempt) {
  console.log("connecting to stream");
  const stream = needle.get(Constant.TWITTER_URLS.STREAM, {
    headers: {
      "User-Agent": "v2FilterStreamJS",
      Authorization: `Bearer ${token}`,
    },
    timeout: 20000,
  });

  stream
    .on("data", (data) => {
      try {
        const json = JSON.parse(data);
        // A successful connection resets retry count.
        retryAttempt = 0;

        const intensity = vader.SentimentIntensityAnalyzer.polarity_scores(
          json.data.text
        );

        const analysis = {
          tag: json.matching_rules[0].tag,
          createdAt: Date.now(),
          id: json.data.id,
          text: json.data.text,
          neg: intensity.neg,
          neu: intensity.neu,
          pos: intensity.pos,
          compound: intensity.compound,
        };
        console.log(`Analyzed a new tweet about ${json.matching_rules[0].tag}`);

        insertOne(Constant.COLLECTIONS.ANALYSIS, analysis);
        replaceOne(
          Constant.COLLECTIONS.TRACKERSTATE,
          { tag: json.matching_rules[0].tag },
          {
            tag: json.matching_rules[0].tag,
            newestId: json.data.id,
          }
        );
      } catch (e) {
        if (
          data.detail ===
          "This stream is currently at the maximum allowed connection limit."
        ) {
          console.log(data.detail);
          process.exit(1);
        } else {
          // Keep alive signal received. Do nothing.
        }
      }
    })
    .on("err", (error) => {
      if (error.code !== "ECONNRESET") {
        console.log(error.code);
        process.exit(1);
      } else {
        // This reconnection logic will attempt to reconnect when a disconnection is detected.
        // To avoid rate limits, this logic implements exponential backoff, so the wait time
        // will increase if the client cannot reconnect to the stream.
        setTimeout(() => {
          console.warn("A connection error occurred. Reconnecting...");
          streamConnect(++retryAttempt);
        }, 2 ** retryAttempt);
      }
    });

  return stream;
}

async function setupFilteredStream(newRules) {
  try {
    const currentRules = await getAllRules();

    await deleteAllRules(currentRules);

    await setRules(newRules);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function recentSearchAnalysis(tracker, pagination, dbNewestId) {
  const endpointUrl = Constant.TWITTER_URLS.RECENT_SEARCH;

  let nextToken;
  let newestId = 0;
  let analyzedTweets = [];
  do {
    let params = {
      query: tracker.rule,
      "tweet.fields": "created_at",
      max_results: pagination,
    };
    if (nextToken) {
      params.next_token = nextToken;
    }
    if (dbNewestId) {
      //Make sure latestUpdateId is within a week, otherwise don't include
      params.since_id = dbNewestId;
    }

    const res = await needle("get", endpointUrl, params, {
      headers: {
        "User-Agent": "v2RecentSearchJS",
        authorization: `Bearer ${token}`,
      },
    });

    if (!res.body) {
      throw new Error("Unsuccessful recentSearchAnalysis");
    }
    if (!res.body.meta) {
      console.log(res.body);
      break;
    }
    nextToken = res.body.meta.next_token;
    if (res.body.meta.newest_id > newestId) {
      newestId = res.body.meta.newest_id;
    }
    if (res.body.data) {
      res.body.data.forEach((element) => {
        // console.log(element.created_at);
        const intensity = vader.SentimentIntensityAnalyzer.polarity_scores(
          element.text
        );

        const analysis = {
          tag: tracker.tag,
          createdAt: Date.parse(element.created_at),
          id: element.id,
          text: element.text,
          neg: intensity.neg,
          neu: intensity.neu,
          pos: intensity.pos,
          compound: intensity.compound,
        };
        analyzedTweets.push(analysis);
      });
    }
  } while (nextToken);
  if (newestId > 0) {
    await insertMany(Constant.COLLECTIONS.ANALYSIS, analyzedTweets);
    await replaceOne(
      Constant.COLLECTIONS.TRACKERSTATE,
      { tag: tracker.tag },
      {
        tag: tracker.tag,
        newestId,
      }
    );
    console.log(
      `Analyzed ${analyzedTweets.length} tweets about ${tracker.name}`
    );
  }
}

async function findOne(collection, query) {
  const result = await client
    .db(Constant.SENTIMENT_DB)
    .collection(collection)
    .findOne(query);
  return result;
}

async function replaceOne(collection, query, replacement) {
  const result = await client
    .db(Constant.SENTIMENT_DB)
    .collection(collection)
    .replaceOne(query, replacement, { upsert: true });
  return result;
}

async function find(collection, sort = {}, query = {}) {
  let result = await client
    .db(Constant.SENTIMENT_DB)
    .collection(collection)
    .find(query)
    .sort(sort)
    .toArray();
  return result;
}

async function drop(collection) {
  try {
    let result = await client
      .db(Constant.SENTIMENT_DB)
      .collection(collection)
      .drop();
    return result;
  } catch (e) {
    console.log(e);
  }
}

async function insertOne(collection, doc) {
  const result = await client
    .db(Constant.SENTIMENT_DB)
    .collection(collection)
    .insertOne(doc);
  return result;
}

async function insertMany(collection, docs) {
  const result = await client
    .db(Constant.SENTIMENT_DB)
    .collection(collection)
    .insertMany(docs);
  return result;
}

const express = require("express");
const path = require("path");
const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("*", function (req, res) {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

app.post("/getSentimentData", async function (req, res) {
  let success = false;
  let sentimentData;
  let message;
  try {
    const symbol = Constant.SYMBOLS.find((s) => s.symbol == req.body.symbol);
    if (symbol) {
      const sort = { createdAt: 1 };
      const query = { tag: symbol.tracker.tag };
      sentimentData = await find(Constant.COLLECTIONS.ANALYSIS, sort, query);
      success = true;
    } else {
      message = "Symbol not found";
    }
  } catch (e) {
    console.log(e);
  }

  res.json({
    success,
    sentimentData,
    message,
  });
});

// Listen on port 3000, IP defaults to 127.0.0.1
app.listen(port);

// Put a friendly message on the terminal
console.log("Server running at http://127.0.0.1:" + port + "/");
