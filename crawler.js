const https = require("https");
const fs = require("fs");
const cheerio = require("cheerio");

const rootUrl =
  "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects";
const prefix = "https://developer.mozilla.org";
let rootNodesList = [];
httpGet(rootUrl);

function findNested(arr, nestedKey, filterFn) {
  const directory = arr.find(filterFn);
  const findChildrenNodes = arr.filter((it) => !!it[nestedKey]);
  if (directory) return directory;
  else if (findChildrenNodes) {
    const flattenNextLevelChildrenList = findChildrenNodes.reduce((r, c, i) => {
      return r.concat(c[nestedKey]);
    }, []);
    return findNested(flattenNextLevelChildrenList, nestedKey, filterFn);
  } else return null;
}

// http 爬
function httpGet(url) {
  https
    .get(url, (res) => {
      let html = "";

      res.on("data", (data) => {
        html += data;
      });
      res.on("end", () => {
        // fs.writeFile("creawer.txt", html, (err) => {});
        filterHtmlAndFeedJson(url, html);
      });
    })
    .on("error", () => {
      console.log("crash!");
    });
}

//利用 cheerio 处理html
function filterHtmlAndFeedJson(currentUrl, html) {
  const $ = cheerio.load(html);
  const childNodesList = [];
  const matchUrl = currentUrl.match(/(?<=^https\:\/\/).*/);
  // const breadCrumbLengthIs7 = (matchUrl || [""])[0].split("/").length === 7;
  const breadCrumbLengthIs7 = currentUrl === rootUrl;

  const childNodes = breadCrumbLengthIs7 ? $("h3 > a") : $("h2 > a");

  childNodes.each(function (nodeIndex, nodeItem) {
    const childNodeName = $(this).text();
    const childNodeLink = $(this).attr("href");

    const subDivNode = nodeItem.parent.next;
    const grandChildNodes = breadCrumbLengthIs7
      ? $("li > a", subDivNode)
      : $("dt > a", subDivNode);
    const grandChildList = [];
    grandChildNodes.each(function (grandNodeIndex, grandNodeItem) {
      const grandChildNodesName = $(this).children("code").text();
      const grandChildNodesLink = $(this).attr("href");
      grandChildList.push({
        name: grandChildNodesName,
        link: grandChildNodesLink ? prefix + grandChildNodesLink : "#",
      });
      if (grandChildNodesLink && breadCrumbLengthIs7)
        httpGet(prefix + grandChildNodesLink);
    });

    childNodesList.push({
      name: childNodeName,
      link: currentUrl + childNodeLink,
      children: grandChildList.length ? grandChildList : undefined,
    });
  });

  // 判断level
  if (breadCrumbLengthIs7) rootNodesList = childNodesList;
  else {
    const matchLinkArrayItem = findNested(
      rootNodesList,
      "children",
      (item) => item.link === currentUrl
    );
    if (matchLinkArrayItem && childNodesList.length) {
      matchLinkArrayItem.children = childNodesList;
    }
  }

  // feed data
  fs.writeFile("result.json", JSON.stringify(rootNodesList), function (err) {
    if (err) {
      console.log(err);
    }
  });
}
