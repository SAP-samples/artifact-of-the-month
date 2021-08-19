sap.ui.define(
    [
        "sap/ui/core/UIComponent",
        "sap/ui/model/json/JSONModel",
        "sap/ui/core/routing/HashChanger",
        "sap/ui/Device",
        "aow/artifact/model/models",
    ],
    function (UIComponent, JSONModel, HashChanger, Device, models) {
        "use strict";

        return UIComponent.extend("aow.artifact.Component", {
            metadata: {
                manifest: "json",
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                const useDarkTheme =
                    window.matchMedia &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches;
                // if (useDarkTheme) {
                //     sap.ui.getCore().applyTheme("sap_fiori_3_dark");
                // }

                const settingsModel = new JSONModel({
                    filter: "all",
                    sidebarExpanded: false,
                    lightTheme: !useDarkTheme,
                    currentHash:
                        HashChanger.getInstance().getHash() || "trends", // set default (trends)
                });
                this.setModel(settingsModel, "settings");
                const oDeviceModel = new JSONModel(Device);
                oDeviceModel.setDefaultBindingMode("OneWay");
                this.setModel(oDeviceModel, "device");
            },
        });
    }
);
