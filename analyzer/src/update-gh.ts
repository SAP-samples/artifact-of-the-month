require("dotenv").config();
import { readFileSync, writeFileSync } from "fs";

import  GitHubRepositoriesProvider  from "./providers/gh-repo";
import { getMonthIdentifier } from "./helper";
import { Artifact } from "./types";
import providers from "./providers";

(async () => {

    // get current month data
    let currentTrendsJson: any = {};
    let currentAllItemsJson: any = {};
    try {
        const filecontentTrends = readFileSync(
            `${__dirname}/../../frontend/trends/webapp/model/trends.json`,
            "utf8"
        );
        currentTrendsJson = JSON.parse(filecontentTrends);
    } catch (e) {
        if (e.code !== "ENOENT") {
            throw e;
        }
    }
    try {
        const filecontentAllItems = readFileSync(
            `${__dirname}/../../frontend/trends/webapp/model/allItems.json`,
            "utf8"
        );
        currentAllItemsJson = JSON.parse(filecontentAllItems);
    } catch (e) {
        if (e.code !== "ENOENT") {
            throw e;
        }
    }

    // get data from github
    const artifactsGithub: Artifact[] = await GitHubRepositoriesProvider.get(currentTrendsJson)


    const artifactsMap: any = {};
    artifactsGithub.flat().forEach((artifact: any) => {
        artifactsMap[artifact.id] = artifact;
    });

    //loop over new data and update current data
    for (let key in artifactsMap) {
        let newData = artifactsMap[key];
        // find single object in dict array
        currentTrendsJson.newlyAdded.forEach((item: any) => {
            if (item.id === newData.id) {
                item.description = newData.description;
                item.tags = newData.tags;
                item.updatedAt = newData.updatedAt;
            }
        });
        currentTrendsJson.overall.forEach((item: any) => {
            if (item.id === newData.id) {
                item.description = newData.description;
                item.tags = newData.tags;
                item.updatedAt = newData.updatedAt;
            }
        });
        currentTrendsJson.recentlyUpdated.forEach((item: any) => {
            if (item.id === newData.id) {
                item.description = newData.description;
                item.tags = newData.tags;
                item.updatedAt = newData.updatedAt;
            }
        });
        currentAllItemsJson.forEach((item: any) => {
            if (item.id === newData.id) {
                item.description = newData.description;
                item.tags = newData.tags;
                item.updatedAt = newData.updatedAt;
            }
        });
    }

    // write new data to frontend data
    writeFileSync(
        `${__dirname}/../../frontend/trends/webapp/model/allItems.json`,
        JSON.stringify(currentAllItemsJson)
    );
    writeFileSync(`${__dirname}/../../frontend/trends/webapp/model/trends.json`, JSON.stringify(currentTrendsJson));
})();
