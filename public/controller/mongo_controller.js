import { Analysis } from "../model/analysis.js";

const url = "http://127.0.0.1:3000";
// const url = 'http://ec2-3-12-173-95.us-east-2.compute.amazonaws.com:8080';

async function sendRequest(route, data) {
  const res = await axios.post(url + route, data);
  return res;
}

export async function getSentimentData(symbol) {
  const res = await sendRequest("/getSentimentData", {
    symbol,
  });
  let analysisArray = [];
  const { success, sentimentData } = res.data;
  if (success) {
    sentimentData.forEach((doc) => {
      const a = new Analysis(doc);
      analysisArray.push(a);
    });
  } else {
    throw "getSentimentData failed";
  }
  return analysisArray;
}
