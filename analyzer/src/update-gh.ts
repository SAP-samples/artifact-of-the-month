require("dotenv").config();
import { readFileSync, writeFileSync } from "fs";

import Providers from "./providers";
import { getMonthIdentifier } from "./helper";
import { Artifact } from "./types";
import providers from "./providers";

(async () => {

    // get current month data
    const currentMonth = getMonthIdentifier(-1);
    let currentMonthJson: any = {};
    try {
        const filecontent = readFileSync(
            `${__dirname}/../data/raw-${currentMonth}.json`,
            "utf8"
        );
        currentMonthJson = JSON.parse(filecontent);
    } catch (e) {
        if (e.code !== "ENOENT") {
            throw e;
        }
    }

    // get data from github
    const artifactsGithub: Artifact[] = await Providers[2].get(currentMonthJson)


    const artifactsMap: any = {};
    artifactsGithub.flat().forEach((artifact: any) => {
        artifactsMap[artifact.id] = artifact;
    });

    // update current month data
    for (let key in artifactsMap) {
        let newData = artifactsMap[key];
        if (key in currentMonthJson) {
            let currentData = currentMonthJson[key]
            currentData['description'] = newData['description']
            currentData['tags'] = newData['tags']
            currentData['updatedAt'] = newData['updatedAt']
        }

    }

    writeFileSync(
        `${__dirname}/../data/raw-${currentMonth}.json`,
        JSON.stringify(currentMonthJson)
    );
})();
