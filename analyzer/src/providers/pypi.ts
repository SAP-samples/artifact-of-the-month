const { BigQuery } = require("@google-cloud/bigquery");
import { Artifact } from "../types";

export default class PiPyPackagesProvider {
    static source = "pypi-packages";
    static authors: string[] = ["SAP", "SAP SE", "SAP CAI team"];
    static filterList: string[] = ["example-pkg-test03"];

    static bigquery = new BigQuery();

    static transformPackage(raw: any, lastMonth: any) {
        const id = `pypi-${raw.name}`;
        const old: Artifact | undefined = Object.values(lastMonth).find(
            //@ts-ignore
            (old: Artifact) => old.id === id
        );
        const tags = [raw.last_version];
        raw.last_license && tags.push(raw.last_license);
        if (old) {
            return {
                ...old,
                name: raw.name,
                description: raw.last_summary,
                link: `https://pypi.org/project/${raw.name}/`,
                tags,
                updatedAt: raw.last_upload_time.value,
                type: "pypi-package",
                aggregatedCount: raw.curr_month_downloads + old.aggregatedCount,
                currentCount: raw.curr_month_downloads,
            };
        }
        return {
            id,
            name: raw.name,
            description: raw.last_summary,
            link: `https://pypi.org/project/${raw.name}/`,
            tags,
            createdAt: raw.first_upload_time.value,
            updatedAt: raw.last_upload_time.value,
            aggregatedCount: raw.curr_month_downloads,
            currentCount: raw.curr_month_downloads,
            type: "pypi-package",
        };
    }

    static async fetchPackages(): Promise<any[]> {
        const qAuthors = this.authors.map((a: string) => `'${a}'`).join(", ");
        const query = "WITH `sap_packages` AS( " +
            "SELECT m.name, m.filename, m.version, m.summary, m.license, m.keywords, m.upload_time, m.home_page, SPLIT(m.version, '.') as ver_array " +
            "FROM `bigquery-public-data.pypi.distribution_metadata` m " +
            "WHERE author IN (" + qAuthors + ") " +
            "), " +
            "`sap_packages_lastinfo` AS( " +
            "SELECT name, filename, " +
            "first_value(version) over (`package_window`) as last_version, " +
            "first_value(summary) over (`package_window`) as last_summary, " +
            "first_value(license) over (`package_window`) as last_license, " +
            "first_value(keywords) over (`package_window`) as last_keywords, " +
            "first_value(upload_time) over (`package_window`) as last_upload_time, " +
            "first_value(upload_time) over (`package_window_by_upload`) as first_upload_time, " +
            "first_value(home_page) over (`package_window`) as last_home_page " +
            "FROM `sap_packages` m " +
            "WINDOW package_window AS ( " +
            "PARTITION BY name " +
            "ORDER BY name ASC, CAST(ver_array[safe_ordinal(1)] AS INT64) DESC, CAST(ver_array[safe_ordinal(2)] AS INT64) DESC, " +
            "CAST(ver_array[safe_ordinal(3)] AS INT64) DESC, ver_array[safe_ordinal(4)] DESC, upload_time DESC " +
            "), " +
            "package_window_by_upload AS ( " +
            "PARTITION BY name " +
            "ORDER BY upload_time ASC)) " +
            "SELECT p.name, count(timestamp) AS curr_month_downloads, " +
            "p.last_version, p.last_upload_time, p.first_upload_time, p.last_summary, p.last_home_page, p.last_license, p.last_keywords, " +
            "max(timestamp) AS last_download_during_period, min(timestamp) AS first_download_during_period " +
            "FROM `sap_packages_lastinfo` p, " +
            "`bigquery-public-data.pypi.file_downloads` d " +
            // "WHERE DATE(timestamp) BETWEEN DATE_TRUNC(CURRENT_DATE(), MONTH) AND CURRENT_DATE() " + // between the first day of the current month and now - for local testing
            "WHERE DATE(timestamp) BETWEEN DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH) AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 DAY) " +  // between first day and last day of previous month - for deployment
            "AND p.filename = d.file.filename " +
            "GROUP BY name, last_version, last_upload_time, last_summary, last_home_page, last_license, last_keywords, first_upload_time " +
            "ORDER BY curr_month_downloads DESC;";

        const [job] = await this.bigquery.createQueryJob({
            query,
            location: "US",
        });

        const [rows] = await job.getQueryResults();
        return rows;
    }

    static async get(lastMonth: any): Promise<Artifact[]> {
        const artifacts = await this.fetchPackages();

        return artifacts
            .filter((o: any) => !this.filterList.includes(o.name))
            .map((rawArtifact: any) =>
                this.transformPackage(rawArtifact, lastMonth)
            );
    }
}
