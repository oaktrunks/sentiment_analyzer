import * as Constant from "../model/constant.js";
import * as MongoController from "./mongo_controller.js";
import * as Element from "../viewpage/element.js";

var myChart;
var neuAnalysisMap = {};
var posAnalysisMap = {};
var negAnalysisMap = {};

export function addEventListeners() {
  Element.divChart.addEventListener("click", (e) => {
    chartClickHandler(e);
  });
}

export async function buildGraph(pathname) {
  const tracker = Constant.trackers.find((t) => t.path == pathname);
  if (!tracker) {
    return;
  }

  //Remove previous chart
  Element.divChart.innerHTML =
    '<canvas id="myChart" width="1000" height="600"></canvas>';

  const sentimentData = await MongoController.getSentimentData(tracker.symbol);

  let labels = [];
  let labelMap = {};
  let neuCountMap = {};
  let posCountMap = {};
  let negCountMap = {};
  sentimentData.forEach((analysis) => {
    const formattedDate = new Date(analysis.createdAt).toDateString();

    if (!labelMap[formattedDate]) {
      //First analysis for this date
      labelMap[formattedDate] = true;
      labels.push(formattedDate);

      neuCountMap[formattedDate] = 0;
      posCountMap[formattedDate] = 0;
      negCountMap[formattedDate] = 0;

      neuAnalysisMap[formattedDate] = [];
      posAnalysisMap[formattedDate] = [];
      negAnalysisMap[formattedDate] = [];
    }
    //Analysis is positive
    if (analysis.compound > 0) {
      posCountMap[formattedDate]++;
      posAnalysisMap[formattedDate].push(analysis);
    }
    //Analysis is negative
    else if (analysis.compound < 0) {
      negCountMap[formattedDate]++;
      negAnalysisMap[formattedDate].push(analysis);
    }
    //Analysis is neutral
    else {
      neuCountMap[formattedDate]++;
      neuAnalysisMap[formattedDate].push(analysis);
    }
  });
  const posDataset = {
    label: "Positive Tweets",
    data: Object.values(posCountMap),
    fill: false,
    borderColor: "rgb(51, 255, 51)",
    backgroundColor: "rgb(51, 255, 51)",
    tension: 0.1,
  };
  const negDataset = {
    label: "Negative Tweets",
    data: Object.values(negCountMap),
    fill: false,
    borderColor: "rgb(255, 51, 51)",
    backgroundColor: "rgb(255, 51, 51)",
    tension: 0.1,
  };
  const neuDataset = {
    label: "Neutral Tweets",
    data: Object.values(neuCountMap),
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
  myChart = new Chart(ctx, {
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

function chartClickHandler(evt) {
  const points = myChart.getElementsAtEventForMode(
    evt,
    "nearest",
    { intersect: true },
    true
  );
  if (points.length) {
    const firstPoint = points[0];
    let formattedDate = myChart.data.labels[firstPoint.index];
    let tweetHTML = "";
    let analysisArray = [];
    let analysisType = "";
    if (firstPoint.datasetIndex == 0) {
      //Positive Dataset
      tweetHTML += `<h2>Positive tweets from ${formattedDate}:</h2>`;
      analysisArray = posAnalysisMap[formattedDate];
      analysisType = "pos";
    } else if (firstPoint.datasetIndex == 1) {
      //Negative Dataset
      tweetHTML += `<h2>Negative tweets from ${formattedDate}:</h2>`;
      analysisArray = negAnalysisMap[formattedDate];
      analysisType = "neg";
    } else if (firstPoint.datasetIndex == 2) {
      //Neutral Dataset
      tweetHTML += `<h2>Neutral tweets from ${formattedDate}:</h2>`;
      analysisArray = neuAnalysisMap[formattedDate];
      analysisType = "neu";
    }
    tweetHTML += generateTable(analysisArray, analysisType);
    Element.divTweets.innerHTML = tweetHTML;
    $("#tweetTable").DataTable({ paging: true });
    
  }
}

function generateTable(analysisArray, analysisType) {
  let tableHTML = "";
  const tableHead = `
  <table id="tweetTable" class="table table-striped table-bordered table-sm" cellspacing="0" data-page-length='10'>
    <thead>
      <th>
        Tweet
      </th>
      <th>
        Rating
      </th>
      <th>
        Timestamp
      </th>
    </thead>
    <tbody>
  `;
  const tableFoot = `
  </tbody>
  <tfoot>
    <tr>
      <th>
        Tweet
      </th>
      <th>
        Rating
      </th>
      <th>
        Timestamp
      </th>
    </tr>
  </tfoot>
  </table>
  `;

  tableHTML += tableHead;
  analysisArray.forEach((analysis) => {
    let rating = "Unknown";
    if (analysisType == "pos") rating = analysis.pos;
    else if (analysisType == "neu") rating = analysis.neu;
    else if (analysisType == "neg") rating = analysis.neg;
    tableHTML += `
    <tr>
      <td>
        ${analysis.text}
      </td>
      <td>
        ${rating}
      </td>
      <td>
        ${new Date(analysis.createdAt).toTimeString()}
      </td>
    </tr>
    `;
  });
  tableHTML += tableFoot;

  return tableHTML;
}
