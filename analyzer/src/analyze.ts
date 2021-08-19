import glob from "glob";
import { readFileSync, writeFileSync } from "fs";

import { getMonthIdentifier, withinLastMonth, zScore } from "./helper";
import { TrendsFile, Ranking } from "./types";

// 1. Parse the most recent stats
const currentMonth = getMonthIdentifier();
const currentFilename = `data/raw-${currentMonth}.json`;
const currentArtifactsContent = readFileSync(currentFilename, "utf8");
const currentArtifacts = JSON.parse(currentArtifactsContent);
const currentArtifactIds = Object.keys(currentArtifacts);

// 2. Prepare helper objects
const timeseries: any = {};
const countsPerType: any = {};
currentArtifactIds.map((id: string) => {
    const artefact = currentArtifacts[id];
    timeseries[id] = artefact;
    timeseries[id].series = [];
    if (!countsPerType[artefact.type]) {
        countsPerType[artefact.type] = [];
    }
    artefact.currentCount &&
        countsPerType[artefact.type].push(artefact.currentCount);
});

// 3. Build up the time series object
const previousFilenames = glob
    .sync("data/raw-*.json")
    .filter((path: string) => path !== currentFilename);

previousFilenames.map((path: string) => {
    const previousContent = readFileSync(path, "utf8");
    const previousArtifacts = JSON.parse(previousContent);

    currentArtifactIds.map((id: string) => {
        if (previousArtifacts[id]) {
            // TODO for later (September/October), ignore first occurence as it's probably an outlier
            timeseries[id].series.push(previousArtifacts[id].currentCount);
        }
    });
});

// 4. Analyze the time series data

// 4. Compute the z-score for each artifact
currentArtifactIds.map((id: string) => {
    timeseries[id].score = timeseries[id].series.length
        ? zScore(timeseries[id].currentCount, timeseries[id].series)
        : 0;
});

// 5. Parse the previous ranking
let pastRanking: TrendsFile = {
    overall: [],
    recentlyUpdated: [],
    newlyAdded: [],
};
const pastMonth = getMonthIdentifier(-1);
const pastRankingFilename = `data/trends-${pastMonth}.json`;
try {
    const pastRankingContent = readFileSync(pastRankingFilename, "utf8");
    pastRanking = JSON.parse(pastRankingContent);
} catch (e) {
    if (e.code !== "ENOENT") {
        throw e;
    }
}

// 6.1 Determine the overall ranking
const trendRanking: Ranking[] = Object.values(timeseries)
    .sort((a1: any, a2: any) => a2.score - a1.score)
    .map((a: any, idx: number) => {
        const past = pastRanking.overall.find((p: Ranking) => p.id === a.id);
        return {
            id: a.id,
            name: a.name,
            rank: idx,
            description: a.description,
            pastRank: past && past.rank,
            score: a.score,
            type: a.type,
            link: a.link,
            tags: a.tags,
            updatedAt: a.updatedAt,
            createdAt: a.createdAt,
        };
    });

// 6.2 Determine the ranking of previously updated items
const updatedArtifactsRanking: Ranking[] = Object.values(timeseries)
    .filter((a: any) => withinLastMonth(a.updatedAt))
    .sort((a1: any, a2: any) => a2.score - a1.score)
    .map((a: any, idx: number) => {
        const past = pastRanking.recentlyUpdated.find(
            (p: Ranking) => p.id === a.id
        );
        return {
            id: a.id,
            name: a.name,
            rank: idx,
            description: a.description,
            pastRank: past && past.rank,
            score: a.score,
            type: a.type,
            link: a.link,
            tags: a.tags,
            updatedAt: a.updatedAt,
            createdAt: a.createdAt,
        };
    });

// 6.3 Calculate the ranking of new items
const newArtifactsRanking: Ranking[] = Object.values(timeseries)
    .filter((a: any) => a.series.length <= 1 && countsPerType[a.type].length)
    .map((a: any) => {
        a.score = zScore(a.currentCount, countsPerType[a.type]);
        return a;
    })
    .sort((a1: any, a2: any) => a2.score - a1.score)
    .map((a: any, idx: number) => {
        return {
            id: a.id,
            name: a.name,
            rank: idx,
            description: a.description,
            score: a.score,
            type: a.type,
            link: a.link,
            tags: a.tags,
            updatedAt: a.updatedAt,
            createdAt: a.createdAt,
        };
    });

// 7. Write results back to files
const newRankings = JSON.stringify({
    overall: trendRanking.slice(0, 99),
    recentlyUpdated: updatedArtifactsRanking.slice(0, 99),
    newlyAdded: newArtifactsRanking.slice(0, 99),
});

writeFileSync(`${__dirname}/../data/trends-${currentMonth}.json`, newRankings);

writeFileSync(`${__dirname}/../data/trends.json`, newRankings);

writeFileSync(
    `${__dirname}/../data/allItems.json`,
    JSON.stringify(Object.values(currentArtifacts))
);
