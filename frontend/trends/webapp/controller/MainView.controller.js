sap.ui.define(
    ["aow/artifact/controller/BaseController", "aow/artifact/model/formatter","sap/ui/model/Filter","sap/ui/model/FilterOperator"],
    function (Controller, formatter, Filter, FilterOperator) {
        "use strict";

        return Controller.extend("aow.artifact.controller.MainView", {
            formatter: formatter,

            onMenuButtonPress: function () {
                const model = this.getView().getModel("settings");
                const currentState = model.getProperty("/sidebarExpanded");
                model.setProperty("/sidebarExpanded", !currentState);
            },

            onToggleTheme: function (oEvent) {
                const lightTheme = oEvent.getParameter("state");
                sap.ui
                    .getCore()
                    .applyTheme(
                        lightTheme ? "sap_fiori_3" : "sap_fiori_3_dark"
                    );
            },

            goToRepo: function () {
                window.open("https://github.com/SAP-samples/artifact-of-the-month/");
            },

            onNavPage: function (oEvent) {
                const model = this.getView().getModel("settings");
                const item = oEvent.getParameter("item").getKey();
                if (item === "legal") {
                    return window.open(
                        "https://www.sap.com/corporate/en/legal/impressum.html",
                        "_blank"
                    );
                }
                if (item === "privacy") {
                    return window.open(
                        "https://www.sap.com/corporate/en/legal/privacy.html",
                        "_blank"
                    );
                }
                if (item === "terms") {
                    return window.open(
                        "https://www.sap.com/corporate/en/legal/terms-of-use.html",
                        "_blank"
                    );
                }
                this.navTo(item);
                model.setProperty("/currentHash", item);
                model.setProperty("/filter", "all");
                // collapse sidebar after navigation if on mobile
                if (this.isMobile()) {
                    model.setProperty("/sidebarExpanded", false);
                }
            },

            displayItem: function (event) {
                const binding = this.byId("trend-list").getBinding("items");
                const model = this.getView().getModel("settings");
                let currentFilter = model.getProperty("/filter");
                if (currentFilter === "all") {
                    binding.filter([])
                } else {
                    binding.filter([new Filter('type', FilterOperator.EQ, currentFilter)])
                }
            },

            liveSearch: function (oEvent) {
                const model = this.getView().getModel("settings");
                let value = model.getProperty("/search");
                if(!value){value = ""}
                let valueType  = model.getProperty("/filterSearch");
                if(valueType === undefined ||  valueType === 'all'){valueType = ""}
                const list = this.getView().byId("all-list");
                const listBinding = list.getBinding("items");
                const nameFilter = new sap.ui.model.Filter({
                    path: "name",
                    operator: sap.ui.model.FilterOperator.Contains,
                    value1: value,
                });
                const descFilter = new sap.ui.model.Filter({
                    path: "description",
                    operator: sap.ui.model.FilterOperator.Contains,
                    value1: value,
                });
                const typeFilter = new sap.ui.model.Filter({
                    path: "type",
                    operator: sap.ui.model.FilterOperator.Contains,
                    value1: valueType,
                });
                const searchFilter = new sap.ui.model.Filter({
                    filters: [nameFilter, descFilter],
                    and: false,
                })
                listBinding.filter(
                    new sap.ui.model.Filter({
                        filters: [searchFilter, typeFilter],
                        and: true,
                    })
                );
            },
        });
    }
);
