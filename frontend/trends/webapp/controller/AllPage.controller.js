sap.ui.define(
    ["aow/artifact/controller/MainView.controller", "aow/artifact/model/formatter", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", 'sap/ui/core/Fragment', 'sap/ui/model/Sorter'],
    function (Controller, formatter, Filter, FilterOperator, Fragment, Sorter) {
        "use strict";

        return Controller.extend("aow.artifact.controller.AllPage", {
            formatter: formatter,

            onInit: function () {
                this.oRouter = this.getRouter();
                this._oRouterArgs = null;
                // make the search bookmarkable
                this.oRouter.getRoute("all").attachMatched(this._onRouteMatched, this);
            },


            _onRouteMatched: function (oEvent) {
                // save the current query state
                this._oRouterArgs = oEvent.getParameter("arguments");
                this._oRouterArgs["?query"] = this._oRouterArgs["?query"] || {};

                // search/filter via URL hash
                if (this._oRouterArgs["?query"].search || this._oRouterArgs["?query"].filterType) {
                    this._applySearchFilter(this._oRouterArgs["?query"].search, this._oRouterArgs["?query"].filterType);
                }
                if (this._oRouterArgs["?query"].sortKey && this._oRouterArgs["?query"].descending) {
                    this._applySorting(this._oRouterArgs["?query"].sortKey, this._oRouterArgs["?query"].descending);
                }
            },

            liveSearch: function (oEvent) {
                const model = this.getView().getModel("settings");
                let value = model.getProperty("/search");
                let valueType = model.getProperty("/filterSearch");
                this._applySearchFilter(value, valueType);

                // update the hash with the current search term
                if ( value !== undefined && value.length > 0 ) {
                    this._oRouterArgs["?query"].search = value;
                } else {
                    // delete empty search term from hash
                    if (this._oRouterArgs["?query"].hasOwnProperty("search")) {
                        delete this._oRouterArgs["?query"].search;
                    }
                }
                if (valueType !== undefined && valueType.length > 0 ) {
                    this._oRouterArgs["?query"].filterType = valueType;
                }
                this.oRouter.navTo("all", this._oRouterArgs, true /*no history*/);
            },

            _applySearchFilter: function (value, valueType) {
                if (!value) { value = "" }
                if (valueType === undefined || valueType === 'all') { valueType = "" }
                // make sure values are set in model
                this.getView().getModel("settings").setProperty("/search", value);
                this.getView().getModel("settings").setProperty("/filterSearch", valueType);
                const list = this.getView().byId("all-list");
                const listBinding = list.getBinding("items");
                const nameFilter = new Filter({
                    path: "name",
                    operator: FilterOperator.Contains,
                    value1: value,
                });
                const descFilter = new Filter({
                    path: "description",
                    operator: FilterOperator.Contains,
                    value1: value,
                });
                const typeFilter = new Filter({
                    path: "type",
                    operator: FilterOperator.Contains,
                    value1: valueType,
                });
                const searchFilter = new Filter({
                    filters: [nameFilter, descFilter],
                    and: false,
                })
                listBinding.filter(
                    new Filter({
                        filters: [searchFilter, typeFilter],
                        and: true,
                    })
                );
            },

            // opens view settings dialg
            openSettingsDialog: function () {
                var oView = this.getView();

                if (!this._settingsDialog) {
                    this._settingsDialog = Fragment.load({
                        id: oView.getId(),
                        name: "aow.artifact.fragment.Dialog",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                this._settingsDialog.then(function (oDialog) {
                    // opens the requested dialog
                    oDialog.open();
                });
            },

            // apply sorting parameters
            handleConfirm: function (oEvent) {
                var key = oEvent.getParameter("sortItem").getKey();
                var descending = oEvent.getParameter("sortDescending")
                this._applySorting(key, descending);
                this._oRouterArgs["?query"].sortKey = key;
                this._oRouterArgs["?query"].descending = descending;
                this.oRouter.navTo("all", this._oRouterArgs, true /*no history*/);

            },

            _applySorting: function (key, descending) {

                const listBinding = this.getView().byId("all-list").getBinding("items");
                const oSorter = new Sorter({
                    path: key,
                    descending: descending,
                });
                listBinding.sort(oSorter);
            }
        });
    }
);
