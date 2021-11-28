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
                // make sure always key and descending are set and valid
                if (this._validateSortingParameter(this._oRouterArgs["?query"].sortKey, this._oRouterArgs["?query"].descending)) {
                    this._applySorting(this._oRouterArgs["?query"].sortKey, this._oRouterArgs["?query"].descending);
                }
            },

            liveSearch: function (oEvent) {
                const model = this.getView().getModel("settings");
                let value = model.getProperty("/search");
                let valueType = model.getProperty("/filterSearch");
                this._applySearchFilter(value, valueType);
                this._oRouterArgs["?query"].search = value;
                this._oRouterArgs["?query"].filterType = valueType;
                this._setQueryHash();
            },


            // opens view settings dialog
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

            // apply sorting parameters from view settings dialog
            handleConfirm: function (oEvent) {
                var key = oEvent.getParameter("sortItem").getKey();
                var descending = oEvent.getParameter("sortDescending")
                this._applySorting(key, descending);
                this._oRouterArgs["?query"].sortKey = key;
                this._oRouterArgs["?query"].descending = descending;
                this._setQueryHash();

            },

            _applySearchFilter: function (value, valueType) {
                if (!value) { value = "" }
                if (!this._validateFilterType(valueType)) {
                    valueType = "";
                }
                // make sure values are set in model, needed for formatter
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

            _applySorting: function (key, descending) {
                const listBinding = this.getView().byId("all-list").getBinding("items");
                const oSorter = new Sorter({
                    path: key,
                    descending: descending,
                });
                listBinding.sort(oSorter);
            },

            _setQueryHash: function () {
                // sort dict this._oRouterArgs["?query"] by key (make sure keys are always same order)
                const querySorted = Object.keys(this._oRouterArgs["?query"]).sort().reduce((obj, key) => {
                    obj[key] = this._oRouterArgs["?query"][key];
                    return obj;
                }, {});

                var queryString = "all?";
                // concat query string for hash with loop over dict, the first one without "&"
                for (var key in querySorted) {
                    if (querySorted[key] !== undefined && querySorted[key] !== null && querySorted[key] !== "") {
                        // the first one without "&"
                        if (key === Object.keys(querySorted)[0]) {
                            queryString += key + "=" + querySorted[key];
                        } else {
                            queryString += "&" + key + "=" + querySorted[key];
                        }
                    }
                }
                this.oRouter.getHashChanger().setHash(queryString)
            },

            _validateFilterType(filterType) {
                var filterTypeKeys = this.byId("trend-list-bar-segmented").getItems();
                var validFilterType = false;
                for (var i = 0; i < filterTypeKeys.length; i++) {
                    if (filterTypeKeys[i].getKey() === filterType) {
                        validFilterType = true
                    }
                }
                if (filterType && filterType !== "" && filterType !== "all" && validFilterType) {
                    return true
                } else {
                    return false
                }
            },

            _validateSortingParameter(sortKey, descending) {
                if (!sortKey && sortKey === "" && sortKey === null && descending === undefined && descending === null) {
                    return false
                }
                // currently check only hardcoded keys from dialog fragment
                var validSortKey = false;
                if (sortKey === "name" || sortKey === "updatedAt" || sortKey === "createdAt") {
                    validSortKey =  true;
                }
                var validDescending = false;
                if (descending === "true" || descending === "false") {
                    validDescending = true;
                }
                if (validSortKey && validDescending) {
                    return true
                } else {
                    return false
                }
            }
        });
    }
);
