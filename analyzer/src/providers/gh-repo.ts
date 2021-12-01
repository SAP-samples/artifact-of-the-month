const { Octokit } = require("@octokit/core");
const { throttling } = require("@octokit/plugin-throttling");
const MyOctokit = Octokit.plugin(throttling);

import axios from "axios";
import { Artifact } from "../types";

export default class GitHubRepositoriesProvider {
    static source = "github-packages";

    static repos: string[] = ["cloudfoundry-incubator/multiapps-cli-plugin", "nzamani/sap-cloud-connector-docker", "marcellourbani/abap-adt-api", "1DSAG/UI5-Best-Practice"];
    static asyncRepos: string[] = ["https://raw.githubusercontent.com/dotabap/dotabap-list/main/list.json"]
    static users: string[] = ["saphanaacademy"];
    static orgs: string[] = [
        "sap-samples",
        "sap",
        "ui5-community",
        "kyma-project",
        "orientechnologies",
        "abaplint",
    ];


    static octokit = new MyOctokit({
        auth: process.env.GITHUB_TOKEN,
        throttle: {
            onRateLimit: (retryAfter: any, options: any) => {
              GitHubRepositoriesProvider.octokit.log.warn(
                `Request quota exhausted for request ${options.method} ${options.url}`
              );
        
              // Retry four times after hitting a rate limit error, then give up
              if (options.request.retryCount <= 4) {
                console.log(`Retrying after ${retryAfter} seconds!`);
                return true;
              }
            },
            onAbuseLimit: (retryAfter: any, options: any) => {
              // does not retry, only logs a warning
              GitHubRepositoriesProvider.octokit.log.warn(
                `Abuse detected for request ${options.method} ${options.url}`
              );
            },
          },
    });

    static transformRepo(rawRepo: any, lastMonth: any) {
        const id = `gh-repo-stars-${rawRepo.full_name}`;
        const old: Artifact | undefined = Object.values(lastMonth).find(
            //@ts-ignore
            (old: Artifact) => old.id === id
        );
        const tags = [
            `${rawRepo.stargazers_count} ${rawRepo.stargazers_count === 1 ? "star" : "stars"
            }`,
            `${rawRepo.forks} ${rawRepo.forks === 1 ? "fork" : "forks"}`,
        ];
        rawRepo.license && tags.push(rawRepo.license.spdx_id);
        if (old) {
            return {
                ...old,
                name: rawRepo.full_name,
                description: rawRepo.description,
                link: rawRepo.html_url,
                tags,
                updatedAt: rawRepo.updated_at,
                type: "code-repository",
                aggregatedCount: rawRepo.stargazers_count + rawRepo.forks,
                currentCount:
                    rawRepo.stargazers_count +
                    rawRepo.forks -
                    old.aggregatedCount,
            };
        }
        return {
            id,
            name: rawRepo.full_name,
            description: rawRepo.description,
            link: rawRepo.html_url,
            createdAt: rawRepo.created_at,
            aggregatedCount: rawRepo.stargazers_count + rawRepo.forks,
            currentCount: rawRepo.stargazers_count + rawRepo.forks,
            updatedAt: rawRepo.updated_at,
            type: "code-repository",
            tags,
        };
    }

    static async fetchOrgRepos(org: string, page = 1): Promise<Artifact[]> {
        let repos: any[] = [];
        while (true) {
            let currentRepos = await GitHubRepositoriesProvider.octokit.request(
                "GET /orgs/{org}/repos",
                {
                    per_page: 100,
                    org,
                    page,
                }
            );
            repos = repos.concat(currentRepos.data);
            if (currentRepos.data.length < 100) {
                break;
            }
            page++;
        }

        return repos;
    }

    static async fetchUserRepos(user: string, page = 1): Promise<Artifact[]> {
        let repos: any[] = [];
        while (true) {
            let currentRepos = await GitHubRepositoriesProvider.octokit.request(
                "GET /users/{user}/repos",
                {
                    per_page: 100,
                    user,
                    page,
                }
            );
            if (currentRepos.data.length < 100) {
                break;
            }
            page++;
            repos = repos.concat(currentRepos.data);
        }

        return repos;
    }

    static async fetchSingleRepos(repo: string, page = 1): Promise<Artifact[]> {
        let currentRepo = await GitHubRepositoriesProvider.octokit.request(
            `GET /repos/${repo}`
        );

        return [currentRepo.data];
    }

    static async get(lastMonth: any): Promise<Artifact[]> {
        const asyncRepos = await Promise.all(
            this.asyncRepos.map(async (url: string) => {
                const res = await axios(url);
                return res.data;
            })
        )

        const artifacts = await Promise.all([
            ...this.orgs.map(
                async (org: string) => await this.fetchOrgRepos(org, 0)
            ),
            ...this.users.map(
                async (user: string) => await this.fetchUserRepos(user, 0)
            ),
            ...this.repos.map(
                async (repo: string) => await this.fetchSingleRepos(repo, 0)
            ),
            ...asyncRepos.flat().map(
                async (repo: string) => await this.fetchSingleRepos(repo, 0)
            ),
        ]);

        const ids = new Set();

        return artifacts
            .flat()
            .filter((rawRepo: any) => { //filter dups
                if (ids.has(rawRepo.full_name)) {
                    return false;
                }
                ids.add(rawRepo.full_name);
                return true;
            })
            .map((rawRepo: any) => this.transformRepo(rawRepo, lastMonth));
    }
}
