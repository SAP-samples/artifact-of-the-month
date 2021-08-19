module.exports = function (config) {
    "use strict";

    config.set({
        frameworks: ["ui5"],
        ui5: {
            type: "application",
            configPath: "trends/ui5.yaml",
            paths: {
                webapp: "trends/webapp",
            },
        },
        browsers: ["Chrome"],
        browserConsoleLogOptions: {
            level: "error",
        },
    });
};
