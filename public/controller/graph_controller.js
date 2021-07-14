import * as Constant from "../model/constant.js";
import * as MongoController from "./mongo_controller.js";

export async function buildGraph(pathname) {
  const tracker = Constant.trackers.find((t) => t.path == pathname);
  if (!tracker) {
    return;
  }

  //Remove previous chart
  document.querySelector("#div-chart").innerHTML =
    '<canvas id="myChart" width="1000" height="600"></canvas>';

  const sentimentData = await MongoController.getSentimentData(tracker.symbol);

  let labels = [];
  let labelMap = {};
  let neuMap = {};
  let posMap = {};
  let negMap = {};
  sentimentData.forEach((analysis) => {
    const formattedDate = new Date(analysis.createdAt).toDateString();

    if (!labelMap[formattedDate]) {
      //First analysis for this date
      labelMap[formattedDate] = true;
      labels.push(formattedDate);
      neuMap[formattedDate] = 0;
      posMap[formattedDate] = 0;
      negMap[formattedDate] = 0;
    }
    //Analysis is positive
    if (analysis.compound > 0) {
      posMap[formattedDate]++;
    }
    //Analysis is negative
    else if (analysis.compound < 0) {
      negMap[formattedDate]++;
    }
    //Analysis is neutral
    else {
      neuMap[formattedDate]++;
    }
  });
  const posDataset = {
    label: "Positive Tweets",
    data: Object.values(posMap),
    fill: false,
    borderColor: "rgb(51, 255, 51)",
    backgroundColor: "rgb(51, 255, 51)",
    tension: 0.1,
  };
  const negDataset = {
    label: "Negative Tweets",
    data: Object.values(negMap),
    fill: false,
    borderColor: "rgb(255, 51, 51)",
    backgroundColor: "rgb(255, 51, 51)",
    tension: 0.1,
  };
  const neuDataset = {
    label: "Neutral Tweets",
    data: Object.values(neuMap),
    fill: false,
    borderColor: "rgb(160, 160, 160)",
    backgroundColor: "rgb(160, 160, 160)",
    tension: 0.1,
  };

  //Generate new chart
  var ctx = document.getElementById("myChart");
  const data = {
    labels: labels,
    datasets: [posDataset, negDataset, neuDataset],
  };
  var myChart = new Chart(ctx, {
    type: "line",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      plugins: {
        title: {
          display: true,
          text: tracker.name + " Twitter Sentiment Analysis",
        },
      },
    },
  });
}
