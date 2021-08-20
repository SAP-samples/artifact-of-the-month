require("dotenv").config();
import { readFileSync, writeFileSync } from "fs";

import Providers from "./providers";
import { getMonthIdentifier } from "./helper";
import { Artifact } from "./types";

(async () => {
    const lastMonth = getMonthIdentifier(-1);
    const currentMonth = getMonthIdentifier();

    let lastWeek = {};
    try {
        const filecontent = readFileSync(
            `${__dirname}/../data/raw-${lastMonth}.json`,
            "utf8"
        );
        lastWeek = JSON.parse(filecontent);
    } catch (e) {
        if (e.code !== "ENOENT") {
            throw e;
        }
    }

    const artifacts = await Promise.all(
        Providers.map(async (provider) => {
            console.log(`Start provider ${provider.name}.`);
            const items: Artifact[] = await provider.get(lastWeek);
            console.log(`Provider ${provider.name} returned ${items.length} items.`);
            return items;
        })
    );

    const artifactsMap: any = {};
    artifacts.flat().forEach((artifact: any) => {
        artifactsMap[artifact.id] = artifact;
    });

    writeFileSync(
        `${__dirname}/../data/raw-${currentMonth}.json`,
        JSON.stringify(artifactsMap)
    );
})();
