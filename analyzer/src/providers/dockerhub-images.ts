import axios from "axios";
import { Artifact } from "../types";

export default class DockerHubProvider {
    static source = "dockerhub-images";

    static users: string[] = ["iobert", "sapmachine", "abaplint", "sapcc", "qmacro"];

    static async fetchImages(url: string, lastMonth: any): Promise<Artifact[]> {
        const res = await axios(url);

        let nextImages: Artifact[] = [];

        if (res.data.next) {
            nextImages = await this.fetchImages(res.data.next, lastMonth);
        }

        const currentImages = res.data.results.map((dhItem: any) => {
            const id = `dh-${dhItem.namespace}/${dhItem.name}`;
            const old: Artifact | undefined = Object.values(lastMonth).find(
                //@ts-ignore
                (old: Artifact) => old.id === id
            );
            const tags = [
                `${dhItem.pull_count} pulls`,
                `${dhItem.star_count} ${
                    dhItem.star_count === 1 ? "star" : "stars"
                }`,
            ];
            if (old) {
                return {
                    ...old,
                    type: "docker-image",
                    name: `${dhItem.namespace}/${dhItem.name}`,
                    description: dhItem.description,
                    link: `https://hub.docker.com/repository/docker/${dhItem.user}/${dhItem.name}`,
                    tags,
                    updatedAt: new Date(dhItem.last_updated).toISOString(), // to bring the string into the right format  "2021-01-07T16:19:30.782329Z" => "2021-01-07T16:19:30.782Z"
                    aggregatedCount: dhItem.pull_count,
                    currentCount: dhItem.pull_count - old.aggregatedCount,
                };
            }
            return {
                id,
                name: `${dhItem.namespace}/${dhItem.name}`,
                description: dhItem.description,
                link: `https://hub.docker.com/repository/docker/${dhItem.user}/${dhItem.name}`,
                aggregatedCount: dhItem.pull_count,
                currentCount: dhItem.pull_count,
                updatedAt: new Date(dhItem.last_updated).toISOString(), // to bring the string into the right format  "2021-01-07T16:19:30.782329Z" => "2021-01-07T16:19:30.782Z"
                type: "docker-image",
                tags,
            };
        });

        return [...currentImages, ...nextImages];
    }

    static async get(lastMonth: any): Promise<Artifact[]> {
        const artifacts = await Promise.all(
            this.users.map(async (user: string) => {
                // Will iterate over all, not just the 50 first
                return this.fetchImages(
                    `https://hub.docker.com/v2/repositories/${user}/?page_size=50`,
                    lastMonth
                );
            })
        );

        return artifacts.flat();
    }
}
