import { Artifact } from "../types";
import { getPackageManifest, searchPackages } from "query-registry";
import axios from "axios";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../helper";
import removeMarkdown from "markdown-to-text";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// could use bulk API if needed, but no support for scoped packages
// 2021-07-01:2021-07-31/express,generator-easy-ui5
async function getMonthlyDownloads(packageName: string): Promise<number | null> {
    const start = getFirstDayOfMonth();
    const end = getLastDayOfMonth();
    try {
        const res = await axios(`https://api.npmjs.org/downloads/point/${start}:${end}/${packageName}`);
        if (res.data.package === packageName && res.data.downloads > -1) {
            return res.data.downloads;
        }
        throw `Invalid reponse from npm-stat.com ${packageName}.`;
    } catch (err: any) {
        if (err?.response?.status === 404) {
            return 0;  //return 0 for packages that were just added and don't have downloads yet
        }
        if (err?.response?.status === 429) {
            throw "Too Many Requests"
        }
        console.error(`Error reponse from npm-stat.com ${packageName} https://api.npmjs.org/downloads/point/${start}:${end}/${packageName}}.`)
        return null;
    }
}

export default class NpmProvider {
    static source = "npm-downloads";

    static individualPackages: string[] = [
        "sap-hdbext-promisfied",
        "mbt",
        "hana-cli",
        "sap-cf-destination",
        "ui5-task-zipper",
        "hdb",
        "ui5-middleware-destination",
        "ui5-task-librarian",
        "nwabap-ui5uploader",
        "generator-easy-ui5",
        "fundamental-react",
        "fundamental-styles",
        "cds-swagger-ui-express",
        "orientjs",
        "orientjs-native"
    ];

    static scopes: string[] = [
        "sap",
        "openui5",
        "sap-cloud-sdk",
        "ui5",
        "abaplint",
        "sap-theming",
        "sap-devx",
        "fundamental-ngx"
    ];

    static async fetchPackagesFromScope(searchParam: {
        text: string;
        from?: number;
    }): Promise<any[]> {
        const results = await searchPackages({
            query: {
                text: `@${searchParam.text}`,
                from: searchParam.from || 0,
            },
        });

        const currentPage = results.objects
            .filter((res: any) => {
                return res.package.scope === searchParam.text;
            })
            .map((res: any) => res.package);


        let onFollowingPages: any[] = [];

        if (results.objects.length === 20) {
            onFollowingPages = await this.fetchPackagesFromScope({
                text: searchParam.text,
                from: searchParam.from ? searchParam.from + 20 : 20
            });
        }

        return [...currentPage, ...onFollowingPages];
    }

    static async fetchRepoDownloadStats(pkg: string): Promise<any> {
        return await getPackageManifest({ name: pkg });
    }

    static async buildArtifact(
        manifest: any,
        lastWeek: any
    ): Promise<Artifact | null> {

        let downloads = await getMonthlyDownloads(manifest.name);
        if (downloads === null) {
            return null;
        }

        const id = `npm-${manifest.name}`;

        const old: Artifact | undefined = Object.values(lastWeek)
            //@ts-ignore
            .find((old: Artifact) => old.id === id);

        const tags = manifest.license ? [manifest.license] : [];
        if (old) {
            const aggregatedCount = old.aggregatedCount + downloads;
            return {
                ...old,
                type: "npm-package",
                tags,
                description: removeMarkdown(manifest.description || ""),
                updatedAt: manifest.createdAt || manifest.date,
                aggregatedCount: aggregatedCount,
                currentCount: downloads,
            };
        }

        return {
            id,
            name: manifest.name,
            description: removeMarkdown(manifest.description || ""),
            link: `https://www.npmjs.com/package/${manifest.name}`,
            aggregatedCount: downloads,
            currentCount: downloads,
            updatedAt: manifest.createdAt || manifest.date,
            type: "npm-package",
            tags,
        };
    }

    static async get(lastWeek: any): Promise<Artifact[]> {
        const scopePackages = await Promise.all(
            this.scopes.map((scope: string) =>
                this.fetchPackagesFromScope({ text: scope })
            )
        );

        const singlePackages = await Promise.all(
            this.individualPackages.map((p: string) =>
                this.fetchRepoDownloadStats(p)
            )
        );

        const allManifests = [...scopePackages.flat(), ...singlePackages];

        const npmArtifacts = await Promise.all(
            allManifests.map(async (manifest: any, idx: number) => {
                await sleep(Math.floor(idx / 20) * 1000); // wait one second after 20 request to avoid a HTTP error from the npmjs server
                return this.buildArtifact(manifest, lastWeek);
            })
        );

        //@ts-ignore not sure why this comment is needed
        return npmArtifacts.filter((a: any) => a !== null);
    }
}
