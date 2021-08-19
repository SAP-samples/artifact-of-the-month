const { Octokit } = require("@octokit/core");
import { Artifact } from "../types";

//Note this won't work for now as the API doesn't expose the download stats
//+ it requires a token the read individual packages + there is not endpoint for get all packages

export default class GitHubPackagesProvider {
    static source = "github-packages";

    static users: string[] = ["iobert", "qmacro"];
    static orgs: string[] = ["sap-samples"];

    static octokit = new Octokit(); // auth shouldn't be needed as it should just use public data

    static async fetchImages(
        org: string,
        package_type: string,
        page = 1
    ): Promise<Artifact[]> {
        let images: any[] = [];
        while (true) {
            let currentImages = await GitHubPackagesProvider.octokit.request(
                "GET /orgs/{org}/packages/{package_type}",
                {
                    per_page: 100,
                    package_type,
                    org,
                    page,
                }
            );
            if (currentImages.data.length === 0) {
                break;
            }
            page++;
            images = images.concat(currentImages.data);
        }

        console.log(images);

        return [];
    }

    static async get(): Promise<Artifact[]> {
        const artifacts = await Promise.all(
            this.orgs.map(async (org: string) => {
                return [
                    ...(await this.fetchImages(org, "container")),
                    ...(await this.fetchImages(org, "docker")),
                ]; // check for both types
            })
        );

        return artifacts.flat();
    }
}
